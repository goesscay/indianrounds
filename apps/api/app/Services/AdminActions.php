<?php

namespace App\Services;

use App\Models\ApprovalRequest;
use App\Models\AuditLog;
use App\Models\Booking;
use App\Models\CreditNote;
use App\Models\Refund;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Money-affecting admin actions. Staff actions above a configured amount become an
 * approval request that a department Admin (or Super Admin) must decide.
 */
class AdminActions
{
    /** @return array{done: bool, approval: ApprovalRequest|null} */
    public function processRefund(Refund $refund, User $actor, string $reference): array
    {
        if (! in_array($refund->status, ['pending', 'pending_approval'], true)) {
            throw ValidationException::withMessages(['refund' => 'This refund has already been handled.']);
        }

        if ($this->needsApproval($actor, 'refund_staff_limit', $refund->amount)) {
            if ($refund->status === 'pending_approval') {
                throw ValidationException::withMessages(['refund' => 'This refund is already waiting for approval.']);
            }
            $approval = ApprovalRequest::create([
                'type' => 'refund_process',
                'payload' => ['refund_id' => $refund->id, 'reference' => $reference],
                'amount' => $refund->amount,
                'summary' => "Process refund of ₹{$refund->amount} for booking #{$refund->booking_id}",
                'requested_by' => $actor->id,
            ]);
            $refund->update(['status' => 'pending_approval']);
            AuditLog::record('refund.approval_requested', $refund, null, ['approval_id' => $approval->id, 'amount' => $refund->amount], $actor);

            return ['done' => false, 'approval' => $approval];
        }

        $this->completeRefund($refund, $actor, $reference);

        return ['done' => true, 'approval' => null];
    }

    private function completeRefund(Refund $refund, User $actor, string $reference): void
    {
        $before = $refund->only(['status', 'reference']);
        $refund->update(['status' => 'processed', 'processed_by' => $actor->id, 'processed_at' => now(), 'reference' => $reference]);
        AuditLog::record('refund.processed', $refund, $before, $refund->only(['status', 'reference', 'amount']), $actor);
    }

    /**
     * @param  array{booking_reference:string,amount:int,reason:string}  $data
     * @return array{done: bool, approval: ApprovalRequest|null, credit_note: CreditNote|null}
     */
    public function issueCreditNote(array $data, User $actor): array
    {
        $booking = Booking::query()->where('reference', $data['booking_reference'])->first();
        if (! $booking) {
            throw ValidationException::withMessages(['booking_reference' => 'Booking not found.']);
        }

        if ($this->needsApproval($actor, 'credit_note_staff_limit', $data['amount'])) {
            $approval = ApprovalRequest::create([
                'type' => 'credit_note_issue',
                'payload' => $data,
                'amount' => $data['amount'],
                'summary' => "Issue credit note of ₹{$data['amount']} against {$booking->reference}: {$data['reason']}",
                'requested_by' => $actor->id,
            ]);
            AuditLog::record('credit_note.approval_requested', $booking, null, ['approval_id' => $approval->id, 'amount' => $data['amount']], $actor);

            return ['done' => false, 'approval' => $approval, 'credit_note' => null];
        }

        return ['done' => true, 'approval' => null, 'credit_note' => $this->createCreditNote($booking, $data, $actor)];
    }

    /** @param  array{amount:int,reason:string}  $data */
    private function createCreditNote(Booking $booking, array $data, User $actor): CreditNote
    {
        $note = CreditNote::create([
            'code' => $this->code(),
            'user_id' => $booking->user_id,
            'source_booking_id' => $booking->id,
            'amount' => $data['amount'],
            'issued_on' => now()->toDateString(),
            'expires_on' => now()->addMonths((int) config('booking.cancellation.credit_validity_months'))->toDateString(),
        ]);
        AuditLog::record('credit_note.issued', $note, null, ['amount' => $note->amount, 'reason' => $data['reason'], 'booking' => $booking->reference], $actor);

        return $note;
    }

    public function decide(ApprovalRequest $request, User $decider, bool $approve, ?string $note): ApprovalRequest
    {
        if ($request->status !== 'pending') {
            throw ValidationException::withMessages(['approval' => 'This request has already been decided.']);
        }
        if ($request->requested_by === $decider->id) {
            throw ValidationException::withMessages(['approval' => 'You cannot decide your own request.']);
        }
        $this->assertCanDecide($request, $decider);

        DB::transaction(function () use ($request, $decider, $approve, $note) {
            $request->update([
                'status' => $approve ? 'approved' : 'rejected',
                'decided_by' => $decider->id,
                'decided_at' => now(),
                'decision_note' => $note,
            ]);

            if ($request->type === 'refund_process') {
                $refund = Refund::query()->findOrFail($request->payload['refund_id']);
                if ($approve) {
                    $this->completeRefund($refund, $decider, (string) $request->payload['reference']);
                } else {
                    $refund->update(['status' => 'pending']);
                }
            } elseif ($request->type === 'credit_note_issue' && $approve) {
                $booking = Booking::query()->where('reference', $request->payload['booking_reference'])->firstOrFail();
                $this->createCreditNote($booking, $request->payload, $decider);
            }

            AuditLog::record($approve ? 'approval.approved' : 'approval.rejected', $request, null, ['type' => $request->type, 'amount' => $request->amount, 'note' => $note], $decider);
        });

        return $request->refresh();
    }

    /** A department Admin decides only requests raised by their own department (Super Admin: any). */
    private function assertCanDecide(ApprovalRequest $request, User $decider): void
    {
        if ($decider->hasRole('super_admin')) {
            return;
        }
        $requester = User::query()->findOrFail($request->requested_by);
        if ($requester->department !== $decider->department) {
            throw ValidationException::withMessages(['approval' => 'Only an Admin of the requesting department can decide this request.']);
        }
    }

    private function needsApproval(User $actor, string $settingKey, int $amount): bool
    {
        return ! $actor->hasPermissionTo('approvals.decide') && $amount > (int) Setting::read($settingKey);
    }

    private function code(): string
    {
        do {
            $code = 'CN-'.strtoupper(Str::random(8));
        } while (CreditNote::query()->where('code', $code)->exists());

        return $code;
    }
}
