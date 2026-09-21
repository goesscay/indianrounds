<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Admin\Concerns\Paginates;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Booking;
use App\Models\Grievance;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class GrievanceController extends Controller
{
    use Paginates;

    public function index(Request $request): JsonResponse
    {
        $q = Grievance::query()->latest('id');
        if ($request->filled('status')) {
            $q->where('status', $request->string('status'));
        }
        if ($request->filled('stage')) {
            $q->where('stage', (int) $request->input('stage'));
        }

        return $this->page($q->paginate(25), fn (Grievance $g) => $this->present($g, $request->user()));
    }

    public function show(Request $request, Grievance $grievance): JsonResponse
    {
        return response()->json(['data' => $this->present($grievance, $request->user())]);
    }

    public function acknowledge(Request $request, Grievance $grievance): JsonResponse
    {
        $this->assertCanAct($request->user(), $grievance);
        if ($grievance->acknowledged_at) {
            throw ValidationException::withMessages(['grievance' => 'Already acknowledged.']);
        }

        $grievance->update(['acknowledged_at' => now(), 'officer_name' => $request->user()->name]);
        AuditLog::record('grievance.acknowledged', $grievance, null, ['officer' => $request->user()->name]);

        return response()->json(['data' => $this->present($grievance->fresh() ?? $grievance, $request->user())]);
    }

    public function escalate(Request $request, Grievance $grievance): JsonResponse
    {
        $this->assertCanAct($request->user(), $grievance);
        if ($grievance->stage >= 3) {
            throw ValidationException::withMessages(['grievance' => 'This is already at the final stage.']);
        }

        $before = ['stage' => $grievance->stage];
        $grievance->update(['stage' => $grievance->stage + 1, 'officer_name' => null]);
        AuditLog::record('grievance.escalated', $grievance, $before, ['stage' => $grievance->stage]);

        return response()->json(['data' => $this->present($grievance->fresh() ?? $grievance, $request->user())]);
    }

    public function resolve(Request $request, Grievance $grievance): JsonResponse
    {
        $data = $request->validate(['resolution' => 'required|string|max:5000']);
        $this->assertCanAct($request->user(), $grievance);
        if ($grievance->status === 'resolved') {
            throw ValidationException::withMessages(['grievance' => 'Already resolved.']);
        }

        $grievance->update([
            'status' => 'resolved',
            'resolution' => $data['resolution'],
            'resolved_at' => now(),
            'acknowledged_at' => $grievance->acknowledged_at ?? now(),
            'officer_name' => $grievance->officer_name ?? $request->user()->name,
        ]);
        AuditLog::record('grievance.resolved', $grievance, ['status' => 'open'], ['status' => 'resolved']);

        return response()->json(['data' => $this->present($grievance->fresh() ?? $grievance, $request->user())]);
    }

    /** Stage 1 needs grievances.handle; stages 2 and 3 need grievances.escalate. */
    private function assertCanAct(User $user, Grievance $g): void
    {
        $perm = $g->stage >= 2 ? 'grievances.escalate' : 'grievances.handle';
        if (! $user->hasPermissionTo($perm)) {
            abort(403, $g->stage >= 2 ? 'Escalated tickets are handled by an Admin.' : 'You cannot handle tickets.');
        }
    }

    /** @return array<string, mixed> */
    private function present(Grievance $g, User $viewer): array
    {
        $perm = $g->stage >= 2 ? 'grievances.escalate' : 'grievances.handle';

        return [
            'id' => $g->id,
            'reference' => $g->reference,
            'subject' => $g->subject,
            'description' => $g->description,
            'customer' => User::query()->whereKey($g->user_id)->value('name'),
            'booking_reference' => $g->booking_id ? Booking::query()->whereKey($g->booking_id)->value('reference') : null,
            'stage' => $g->stage,
            'status' => $g->status,
            'officer_name' => $g->officer_name,
            'acknowledged_at' => $g->acknowledged_at?->toIso8601String(),
            'ack_due_at' => $g->ack_due_at->toIso8601String(),
            'resolve_by' => $g->resolve_by->toIso8601String(),
            'statutory_deadline' => $g->statutory_deadline->toIso8601String(),
            'resolved_at' => $g->resolved_at?->toIso8601String(),
            'resolution' => $g->resolution,
            'created_at' => $g->created_at->toIso8601String(),
            'can_act' => $g->status === 'open' && $viewer->hasPermissionTo($perm),
        ];
    }
}
