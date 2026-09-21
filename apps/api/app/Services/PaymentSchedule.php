<?php

namespace App\Services;

use Illuminate\Support\Carbon;

/**
 * Builds the milestone payment schedule for a booking.
 *
 * Steps in config/booking.php are cumulative targets due N days before departure.
 * Steps already due on the booking date are folded into the first payment, so a
 * late booking pays the higher amount up front instead of getting past-due rows.
 */
class PaymentSchedule
{
    /**
     * @return list<array{sequence:int,label:string,due_on:Carbon,amount:int}>
     */
    public function build(string $haulClass, int $total, int $travellers, Carbon $departure, Carbon $today): array
    {
        $steps = config("booking.schedules.{$haulClass}") ?? config('booking.schedules.short');
        $today = $today->copy()->startOfDay();
        $departure = $departure->copy()->startOfDay();

        $targets = [];
        $previous = 0;
        foreach ($steps as $step) {
            $target = isset($step['flat_per_person'])
                ? min($total, $step['flat_per_person'] * $travellers)
                : (int) round($total * $step['percent'] / 100);
            $target = max($target, $previous);
            $due = $step['days_before'] === null ? $today->copy() : $departure->copy()->subDays($step['days_before']);
            if ($due->lt($today)) {
                $due = $today->copy();
            }
            $targets[] = ['target' => $target, 'due' => $due, 'percent' => $step['percent'] ?? null];
            $previous = $target;
        }
        $targets[array_key_last($targets)]['target'] = $total;

        $firstTarget = 0;
        $rest = [];
        foreach ($targets as $i => $t) {
            if ($i === 0 || $t['due']->lte($today)) {
                $firstTarget = max($firstTarget, $t['target']);
            } else {
                $rest[] = $t;
            }
        }

        $milestones = [['label' => 'Booking advance', 'due_on' => $today->copy(), 'amount' => $firstTarget]];
        $paidSoFar = $firstTarget;
        foreach ($rest as $t) {
            $amount = $t['target'] - $paidSoFar;
            if ($amount <= 0) {
                continue;
            }
            $milestones[] = [
                'label' => $t['target'] >= $total ? 'Final payment' : 'Instalment',
                'due_on' => $t['due'],
                'amount' => $amount,
            ];
            $paidSoFar = $t['target'];
        }

        return collect($milestones)
            ->values()
            ->map(fn ($m, $i) => ['sequence' => $i + 1] + $m)
            ->all();
    }
}
