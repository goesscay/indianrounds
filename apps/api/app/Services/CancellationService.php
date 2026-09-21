<?php

namespace App\Services;

use App\Mail\BookingCancelled;
use App\Models\Booking;
use App\Models\CreditNote;
use App\Models\Refund;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CancellationService
{
    public function __construct(private readonly BookingService $bookings) {}

    /**
     * What cancelling right now would cost.
     *
     * @return array<string, mixed>
     */
    public function preview(Booking $booking): array
    {
        $daysBefore = (int) now()->startOfDay()->diffInDays($booking->batch->starts_on->startOfDay(), false);
        $paid = $booking->paid_amount;
        $mode = (string) config('booking.cancellation.mode');

        $base = [
            'reference' => $booking->reference,
            'days_before_departure' => $daysBefore,
            'total' => $booking->total_amount,
            'paid' => $paid,
            'outcome' => $mode,
        ];

        if (! in_array($booking->status, ['confirmed', 'pending_payment'], true)) {
            return $base + ['can_cancel' => false, 'reason' => 'This booking can no longer be cancelled.', 'tier_percent' => 0, 'deduction' => 0, 'returnable' => 0];
        }
        if ($daysBefore <= 0) {
            return $base + ['can_cancel' => false, 'reason' => 'This trip has already started or departed.', 'tier_percent' => 0, 'deduction' => 0, 'returnable' => 0];
        }

        $percent = $this->tierPercent($booking->haul_class, $daysBefore);
        $first = $booking->milestones->sortBy('sequence')->first();
        $advance = $first ? $first->amount : 0;
        $deduction = $paid === 0 ? 0 : min($paid, max($advance, (int) round($booking->total_amount * $percent / 100)));

        return $base + [
            'can_cancel' => true,
            'reason' => null,
            'tier_percent' => $percent,
            'advance' => $advance,
            'deduction' => $deduction,
            'returnable' => $paid - $deduction,
        ];
    }

    public function cancel(Booking $booking): Booking
    {
        $result = DB::transaction(function () use ($booking) {
            $fresh = Booking::query()->whereKey($booking->id)->lockForUpdate()->firstOrFail();
            $fresh->load(['batch', 'milestones', 'tour']);

            $preview = $this->preview($fresh);
            if (! $preview['can_cancel']) {
                throw ValidationException::withMessages(['booking' => (string) $preview['reason']]);
            }

            $returnable = (int) $preview['returnable'];
            $mode = (string) config('booking.cancellation.mode');
            $outcome = $returnable === 0 ? 'none' : $mode;

            $fresh->update([
                'status' => 'cancelled',
                'reserved_until' => null,
                'cancelled_at' => now(),
                'cancellation_deduction' => $preview['deduction'],
                'cancellation_outcome' => $outcome,
            ]);
            $fresh->milestones()->where('status', 'due')->update(['status' => 'cancelled']);
            $this->bookings->releaseSeats($fresh);

            if ($outcome === 'credit_note') {
                CreditNote::create([
                    'code' => $this->code(),
                    'user_id' => $fresh->user_id,
                    'source_booking_id' => $fresh->id,
                    'amount' => $returnable,
                    'issued_on' => now()->toDateString(),
                    'expires_on' => now()->addMonths((int) config('booking.cancellation.credit_validity_months'))->toDateString(),
                ]);
            } elseif ($outcome === 'refund') {
                Refund::create(['booking_id' => $fresh->id, 'user_id' => $fresh->user_id, 'amount' => $returnable]);
            }

            return $fresh->load(['tour', 'batch', 'variant', 'milestones', 'travellers']);
        });

        Mail::to($result->contact_email)->send(new BookingCancelled($result));

        return $result;
    }

    private function tierPercent(string $haulClass, int $daysBefore): int
    {
        $tiers = collect(config("booking.cancellation.tiers.{$haulClass}") ?? config('booking.cancellation.tiers.short'))
            ->sortBy('days');

        foreach ($tiers as $tier) {
            if ($daysBefore <= $tier['days']) {
                return (int) $tier['percent'];
            }
        }

        return 0;
    }

    private function code(): string
    {
        do {
            $code = 'CN-'.strtoupper(Str::random(8));
        } while (CreditNote::query()->where('code', $code)->exists());

        return $code;
    }
}
