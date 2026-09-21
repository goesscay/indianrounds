<?php

namespace Tests\Feature;

use App\Services\PaymentSchedule;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class PaymentScheduleTest extends TestCase
{
    private Carbon $today;

    protected function setUp(): void
    {
        parent::setUp();
        $this->today = Carbon::parse('2026-10-01');
    }

    /** @return list<array{sequence:int,label:string,due_on:Carbon,amount:int}> */
    private function build(string $haul, int $total, int $pax, int $daysToDeparture): array
    {
        return (new PaymentSchedule)->build($haul, $total, $pax, $this->today->copy()->addDays($daysToDeparture), $this->today);
    }

    public function test_short_haul_far_departure_has_four_milestones_that_sum_to_total(): void
    {
        $m = $this->build('short', 100000, 2, 60);

        $this->assertSame([25000, 25000, 25000, 25000], array_column($m, 'amount'));
        $this->assertSame('2026-10-01', $m[0]['due_on']->toDateString());
        $this->assertSame('2026-10-16', $m[1]['due_on']->toDateString()); // departure - 45 days
        $this->assertSame('2026-10-31', $m[2]['due_on']->toDateString()); // departure - 30 days
        $this->assertSame('2026-11-10', $m[3]['due_on']->toDateString()); // departure - 20 days
    }

    public function test_short_haul_windows_already_open_fold_into_first_payment(): void
    {
        $m = $this->build('short', 100000, 2, 25);

        $this->assertSame([75000, 25000], array_column($m, 'amount'));
    }

    public function test_short_haul_booked_inside_final_window_pays_in_full_now(): void
    {
        $m = $this->build('short', 100000, 2, 10);

        $this->assertCount(1, $m);
        $this->assertSame(100000, $m[0]['amount']);
    }

    public function test_long_haul_uses_flat_advance_per_person(): void
    {
        $m = $this->build('long', 300000, 2, 120);

        $this->assertSame([80000, 70000, 75000, 75000], array_column($m, 'amount'));
        $this->assertSame(300000, array_sum(array_column($m, 'amount')));
    }

    public function test_long_haul_advance_is_capped_at_total(): void
    {
        $m = $this->build('long', 50000, 3, 120);

        $this->assertSame(50000, array_sum(array_column($m, 'amount')));
        $this->assertSame(50000, $m[0]['amount']);
        $this->assertCount(1, $m);
    }

    public function test_sequences_are_consecutive_from_one(): void
    {
        $m = $this->build('short', 90001, 1, 90);

        $this->assertSame([1, 2, 3, 4], array_column($m, 'sequence'));
        $this->assertSame(90001, array_sum(array_column($m, 'amount')));
    }
}
