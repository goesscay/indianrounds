<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Admin\Concerns\Paginates;
use App\Http\Controllers\Controller;
use App\Models\ApprovalRequest;
use App\Models\AuditLog;
use App\Models\Setting;
use App\Models\User;
use App\Services\AdminActions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Small read/decide endpoints: customers, approvals, audit log, settings, role matrix. */
class MiscController extends Controller
{
    use Paginates;

    public function customers(Request $request): JsonResponse
    {
        $q = User::query()->whereNull('staff_tier')->withCount('bookings')->latest('id');
        if ($request->filled('q')) {
            $term = '%'.str_replace(['%', '_'], ['\\%', '\\_'], (string) $request->string('q')).'%';
            $q->where(fn ($w) => $w->where('name', 'like', $term)->orWhere('email', 'like', $term)->orWhere('phone', 'like', $term));
        }

        return $this->page($q->paginate(25), fn (User $u) => [
            'id' => $u->id, 'name' => $u->name, 'email' => $u->email, 'phone' => $u->phone,
            'gst_state' => $u->gst_state, 'bookings_count' => $u->bookings_count, 'joined' => $u->created_at?->toDateString(),
        ]);
    }

    public function approvals(Request $request): JsonResponse
    {
        $actor = $request->user();
        $q = ApprovalRequest::query()->with(['requester:id,name,department', 'decider:id,name'])->latest('id');
        if ($request->filled('status')) {
            $q->where('status', $request->string('status'));
        }

        if (! $actor->hasPermissionTo('approvals.decide')) {
            $q->where('requested_by', $actor->id);
        } elseif (! $actor->hasRole('super_admin')) {
            $q->whereHas('requester', fn ($r) => $r->where('department', $actor->department));
        }

        return $this->page($q->paginate(25), fn (ApprovalRequest $a) => [
            'id' => $a->id,
            'type' => $a->type,
            'summary' => $a->summary,
            'amount' => $a->amount,
            'status' => $a->status,
            'requested_by' => $a->requester->name,
            'department' => $a->requester->department,
            'decided_by' => $a->decider?->name,
            'decision_note' => $a->decision_note,
            'created_at' => $a->created_at->toIso8601String(),
            'can_decide' => $a->status === 'pending' && $actor->hasPermissionTo('approvals.decide') && $a->requested_by !== $actor->id,
        ]);
    }

    public function decide(Request $request, ApprovalRequest $approval, AdminActions $actions): JsonResponse
    {
        $data = $request->validate(['approve' => 'required|boolean', 'note' => 'nullable|string|max:500']);
        $actions->decide($approval, $request->user(), (bool) $data['approve'], $data['note'] ?? null);

        return response()->json(['message' => $data['approve'] ? 'Approved.' : 'Rejected.']);
    }

    public function audit(Request $request): JsonResponse
    {
        $q = AuditLog::query()->with('actor:id,name')->latest('id');
        if ($request->filled('action')) {
            $q->where('action', 'like', str_replace(['%', '_'], ['\\%', '\\_'], (string) $request->string('action')).'%');
        }
        if ($request->filled('actor_id')) {
            $q->where('actor_id', (int) $request->input('actor_id'));
        }
        if ($request->filled('subject_type')) {
            $q->where('subject_type', $request->string('subject_type'));
        }

        return $this->page($q->paginate(50), fn (AuditLog $l) => [
            'id' => $l->id,
            'actor' => $l->actor?->name,
            'action' => $l->action,
            'subject' => $l->subject_type ? "{$l->subject_type} #{$l->subject_id}" : null,
            'before' => $l->before,
            'after' => $l->after,
            'ip' => $l->ip,
            'created_at' => $l->created_at->toIso8601String(),
        ]);
    }

    public function settings(): JsonResponse
    {
        return response()->json(['data' => collect(array_keys(config('rbac.settings')))->mapWithKeys(fn ($k) => [$k => Setting::read($k)])]);
    }

    public function updateSettings(Request $request): JsonResponse
    {
        $data = $request->validate([
            'refund_staff_limit' => 'sometimes|integer|min:0|max:10000000',
            'credit_note_staff_limit' => 'sometimes|integer|min:0|max:10000000',
        ]);

        $before = [];
        foreach ($data as $k => $v) {
            $before[$k] = Setting::read($k);
            Setting::query()->updateOrCreate(['key' => $k], ['value' => $v]);
        }
        AuditLog::record('settings.updated', null, $before, $data);

        return $this->settings();
    }

    /** The department/tier permission matrix, for the Super Admin's roles screen. */
    public function roles(): JsonResponse
    {
        $departments = collect(config('rbac.departments'))->map(fn ($d, $key) => [
            'key' => $key,
            'label' => $d['label'],
            'staff' => $d['staff'],
            'admin' => array_values(array_unique([...$d['staff'], ...$d['admin']])),
        ])->values();

        return response()->json(['data' => ['permissions' => config('rbac.permissions'), 'departments' => $departments]]);
    }
}
