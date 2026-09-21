<?php

namespace App\Services;

use App\Models\Batch;
use App\Models\Booking;
use App\Models\Tour;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class BookingService
{
    public function __construct(private readonly PaymentSchedule $schedule) {}

    /**
     * @param  array{tour_slug:string,batch_id:int,variant_id?:int|null,gst_state:string,contact:array{name:string,phone:string,email:string},travellers:list<array{name:string,age?:int|null,gender?:string|null}>}  $data
     */
    public function create(User $user, array $data): Booking
    {
        $tour = Tour::query()->published()->where('slug', $data['tour_slug'])->firstOrFail();
        $batch = Batch::query()->where('tour_id', $tour->id)->whereKey($data['batch_id'])->first();

        if (! $batch || $batch->starts_on->lte(now()->startOfDay()) || $batch->status !== 'open') {
            throw ValidationException::withMessages(['batch_id' => 'This departure is not available for booking.']);
        }

        $variant = null;
        if (! empty($data['variant_id'])) {
            $variant = $tour->variants()->whereKey($data['variant_id'])->first();
            if (! $variant) {
                throw ValidationException::withMessages(['variant_id' => 'Invalid option for this tour.']);
            }
        }

        $count = count($data['travellers']);
        $unit = $variant ? $variant->price : $tour->base_price;
        $subtotal = $unit * $count;
        $rate = (float) config('booking.gst_rate');
        $gst = (int) round($subtotal * $rate);
        $total = $subtotal + $gst;

        return DB::transaction(function () use ($user, $data, $tour, $batch, $variant, $count, $unit, $subtotal, $rate, $gst, $total) {
            // Atomic seat grab: only succeeds while seats remain, safe under concurrent buyers.
            $updated = Batch::query()
                ->whereKey($batch->id)
                ->where('status', 'open')
                ->whereRaw('seats_booked + ? <= capacity', [$count])
                ->increment('seats_booked', $count);

            if ($updated === 0) {
                throw ValidationException::withMessages(['batch_id' => 'Not enough seats left on this departure.']);
            }

            Batch::query()->whereKey($batch->id)->whereColumn('seats_booked', '>=', 'capacity')->update(['status' => 'sold_out']);

            $booking = Booking::create([
                'reference' => $this->reference(),
                'user_id' => $user->id,
                'tour_id' => $tour->id,
                'batch_id' => $batch->id,
                'variant_id' => $variant?->id,
                'status' => 'pending_payment',
                'haul_class' => $tour->haul_class,
                'traveller_count' => $count,
                'unit_price' => $unit,
                'subtotal' => $subtotal,
                'gst_rate' => $rate,
                'gst_amount' => $gst,
                'total_amount' => $total,
                'gst_state' => $data['gst_state'],
                'contact_name' => $data['contact']['name'],
                'contact_phone' => $data['contact']['phone'],
                'contact_email' => $data['contact']['email'],
                'reserved_until' => now()->addMinutes((int) config('booking.reservation_minutes')),
            ]);

            $booking->travellers()->createMany(array_map(fn ($t) => [
                'name' => $t['name'],
                'age' => $t['age'] ?? null,
                'gender' => $t['gender'] ?? null,
            ], $data['travellers']));

            $booking->milestones()->createMany(array_map(fn ($m) => [
                'sequence' => $m['sequence'],
                'label' => $m['label'],
                'due_on' => $m['due_on']->toDateString(),
                'amount' => $m['amount'],
            ], $this->schedule->build($tour->haul_class, $total, $count, $batch->starts_on, now())));

            return $booking->load(['tour.destination', 'batch', 'variant', 'milestones', 'travellers']);
        });
    }

    /** Release seats held by an unpaid booking whose reservation window has passed. */
    public function expire(Booking $booking): bool
    {
        return DB::transaction(function () use ($booking) {
            $fresh = Booking::query()->whereKey($booking->id)->lockForUpdate()->first();
            if (! $fresh || $fresh->status !== 'pending_payment' || $fresh->milestones()->where('status', 'paid')->exists()) {
                return false;
            }

            $fresh->update(['status' => 'expired', 'reserved_until' => null]);
            $fresh->milestones()->update(['status' => 'cancelled']);

            Batch::query()->whereKey($fresh->batch_id)->where('seats_booked', '>=', $fresh->traveller_count)
                ->decrement('seats_booked', $fresh->traveller_count);
            Batch::query()->whereKey($fresh->batch_id)->whereColumn('seats_booked', '<', 'capacity')->where('status', 'sold_out')
                ->update(['status' => 'open']);

            return true;
        });
    }

    private function reference(): string
    {
        do {
            $ref = 'IR'.strtoupper(Str::random(8));
        } while (Booking::query()->where('reference', $ref)->exists());

        return $ref;
    }
}
