<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Admin\Concerns\Paginates;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class LeadController extends Controller
{
    use Paginates;

    public const STATUSES = ['new', 'contacted', 'qualified', 'won', 'lost'];

    /** Sources a user may see: null means all. Corporate and Personalised teams only see their own enquiries. */
    private function visibleSources(User $user): ?array
    {
        if ($user->hasRole('super_admin')) {
            return null;
        }

        return match ($user->department) {
            'corporate' => ['corporate'],
            'personalised' => ['custom'],
            'sales' => $user->staff_tier === 'admin' ? null : ['callback', 'quote', 'contact'],
            default => null,
        };
    }

    private function assertVisible(User $user, Lead $lead): void
    {
        $sources = $this->visibleSources($user);
        abort_if($sources !== null && ! in_array($lead->source, $sources, true), 404);
    }

    public function index(Request $request): JsonResponse
    {
        $q = Lead::query()->latest('id');
        if (($sources = $this->visibleSources($request->user())) !== null) {
            $q->whereIn('source', $sources);
        }
        foreach (['status', 'source'] as $f) {
            if ($request->filled($f)) {
                $q->where($f, $request->string($f));
            }
        }
        if ($request->filled('q')) {
            $term = '%'.str_replace(['%', '_'], ['\\%', '\\_'], (string) $request->string('q')).'%';
            $q->where(fn ($w) => $w->where('name', 'like', $term)->orWhere('phone', 'like', $term)->orWhere('email', 'like', $term)->orWhere('destination', 'like', $term));
        }

        return $this->page($q->paginate(25), fn (Lead $l) => $this->present($l));
    }

    public function update(Request $request, Lead $lead): JsonResponse
    {
        $this->assertVisible($request->user(), $lead);
        $data = $request->validate([
            'status' => ['sometimes', Rule::in(self::STATUSES)],
            'notes' => 'sometimes|nullable|string|max:5000',
            'assigned_to' => 'sometimes|nullable|integer|exists:users,id',
        ]);

        if (! empty($data['assigned_to']) && ! User::query()->whereKey($data['assigned_to'])->whereNotNull('staff_tier')->where('is_active', true)->exists()) {
            return response()->json(['message' => 'Assignee must be an active staff member.', 'errors' => ['assigned_to' => ['Assignee must be an active staff member.']]], 422);
        }

        $before = $lead->only(array_keys($data));
        $lead->update($data);
        AuditLog::record('lead.updated', $lead, $before, $lead->only(array_keys($data)));

        return response()->json(['data' => $this->present($lead->fresh() ?? $lead)]);
    }

    public function destroy(Request $request, Lead $lead): JsonResponse
    {
        $this->assertVisible($request->user(), $lead);
        AuditLog::record('lead.deleted', $lead, $lead->only(['name', 'source']));
        $lead->delete();

        return response()->json(['message' => 'Deleted.']);
    }

    /** @return array<string, mixed> */
    private function present(Lead $l): array
    {
        return [
            'id' => $l->id,
            'name' => $l->name,
            'phone' => $l->country_code.' '.$l->phone,
            'email' => $l->email,
            'destination' => $l->destination,
            'travellers' => $l->travellers,
            'travel_date' => $l->travel_date?->toDateString(),
            'message' => $l->message,
            'source' => $l->source,
            'company' => $l->company,
            'details' => $l->details,
            'page' => $l->page,
            'status' => $l->status,
            'notes' => $l->notes,
            'assigned_to' => $l->assigned_to,
            'created_at' => $l->created_at?->toIso8601String(),
        ];
    }
}
