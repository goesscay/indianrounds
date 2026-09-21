<?php

namespace Tests\Feature;

use App\Mail\BookingCancelled;
use App\Models\Batch;
use App\Models\Booking;
use App\Models\CreditNote;
use App\Models\Refund;
use App\Models\Tour;
use App\Models\User;
use Database\Seeders\CatalogueSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class CancellationTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CatalogueSeeder::class);
        $this->user = User::factory()->create();
        Mail::fake();
    }

    /** Confirmed booking (advance paid) on a batch departing in $days days. */
    private function confirmedBooking(int $days = 90, string $slug = 'kashmir-delight', int $pax = 2): Booking
    {
        $tour = Tour::where('slug', $slug)->firstOrFail();
        $batch = $tour->batches()->orderBy('starts_on')->firstOrFail();
        $batch->update(['starts_on' => now()->addDays($days)->toDateString(), 'ends_on' => now()->addDays($days + 4)->toDateString(), 'capacity' => 20, 'seats_booked' => 0, 'status' => 'open']);

        $ref = $this->actingAs($this->user, 'sanctum')->postJson('/api/v1/bookings', [
            'tour_slug' => $slug, 'batch_id' => $batch->id, 'gst_state' => 'Tamil Nadu',
            'contact' => ['name' => 'A', 'phone' => '9876543210', 'email' => 'a@example.com'],
            'travellers' => array_map(fn ($i) => ['name' => "T{$i}"], range(1, $pax)),
        ])->assertCreated()->json('data');

        $booking = Booking::where('reference', $ref['reference'])->firstOrFail();
        $milestone = $booking->milestones()->first();
        $order = $this->actingAs($this->user, 'sanctum')->postJson("/api/v1/bookings/{$booking->reference}/milestones/{$milestone->id}/order")->json('data');
        $this->actingAs($this->user, 'sanctum')->postJson("/api/v1/bookings/{$booking->reference}/milestones/{$milestone->id}/simulate")->assertOk();
        $this->assertNotEmpty($order['order_id']);

        return $booking->fresh();
    }

    public function test_far_departure_only_forfeits_the_advance(): void
    {
        $b = $this->confirmedBooking(90);

        $p = $this->actingAs($this->user, 'sanctum')->getJson("/api/v1/bookings/{$b->reference}/cancellation")->assertOk()->json('data');

        $this->assertTrue($p['can_cancel']);
        $this->assertSame(0, $p['tier_percent']);
        $this->assertSame($p['advance'], $p['deduction']);
        $this->assertSame(0, $p['returnable']);
    }

    public function test_mid_window_deducts_fifty_percent_of_total(): void
    {
        $b = $this->confirmedBooking(40);
        // 25% + 50% milestones fall due before departure - 40 days; pay both to have 75% paid.
        $b->milestones()->where('status', 'due')->orderBy('sequence')->get()->each(function ($m) use ($b) {
            if ($m->sequence <= 2) {
                $this->actingAs($this->user, 'sanctum')->postJson("/api/v1/bookings/{$b->reference}/milestones/{$m->id}/order");
                $this->actingAs($this->user, 'sanctum')->postJson("/api/v1/bookings/{$b->reference}/milestones/{$m->id}/simulate");
            }
        });

        $p = $this->actingAs($this->user, 'sanctum')->getJson("/api/v1/bookings/{$b->reference}/cancellation")->json('data');

        $this->assertSame(50, $p['tier_percent']);
        $this->assertSame((int) round($b->total_amount * 0.5), $p['deduction']);
        $this->assertSame($p['paid'] - $p['deduction'], $p['returnable']);
        $this->assertGreaterThan(0, $p['returnable']);
    }

    public function test_within_final_window_everything_is_forfeited(): void
    {
        $b = $this->confirmedBooking(10);
        // Booked inside the last-20-day window, so the whole amount is due; pay it.
        $b->milestones()->where('status', 'due')->get()->each(function ($m) use ($b) {
            $this->actingAs($this->user, 'sanctum')->postJson("/api/v1/bookings/{$b->reference}/milestones/{$m->id}/order");
            $this->actingAs($this->user, 'sanctum')->postJson("/api/v1/bookings/{$b->reference}/milestones/{$m->id}/simulate");
        });

        $p = $this->actingAs($this->user, 'sanctum')->getJson("/api/v1/bookings/{$b->reference}/cancellation")->json('data');

        $this->assertSame(100, $p['tier_percent']);
        $this->assertSame(0, $p['returnable']);
    }

    public function test_cancel_issues_credit_note_releases_seats_and_cancels_open_milestones(): void
    {
        $b = $this->confirmedBooking(40);
        $b->milestones()->where('status', 'due')->orderBy('sequence')->get()->each(function ($m) use ($b) {
            if ($m->sequence === 2) {
                $this->actingAs($this->user, 'sanctum')->postJson("/api/v1/bookings/{$b->reference}/milestones/{$m->id}/order");
                $this->actingAs($this->user, 'sanctum')->postJson("/api/v1/bookings/{$b->reference}/milestones/{$m->id}/simulate");
            }
        });
        $b = $b->fresh();
        $expected = $this->actingAs($this->user, 'sanctum')->getJson("/api/v1/bookings/{$b->reference}/cancellation")->json('data');

        $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/v1/bookings/{$b->reference}/cancel", ['confirm' => true])
            ->assertOk()->assertJsonPath('data.status', 'cancelled')->assertJsonPath('data.cancellation_outcome', 'credit_note');

        $note = CreditNote::first();
        $this->assertSame($expected['returnable'], $note->amount);
        $this->assertSame($this->user->id, $note->user_id);
        $this->assertTrue($note->expires_on->isSameDay(now()->addMonths(12)));
        $this->assertSame(0, $b->batch->fresh()->seats_booked);
        $this->assertSame(0, $b->milestones()->where('status', 'due')->count());
        Mail::assertQueued(BookingCancelled::class, 1);
    }

    public function test_cancel_requires_confirmation_and_ownership_and_cannot_repeat(): void
    {
        $b = $this->confirmedBooking(90);

        $this->actingAs($this->user, 'sanctum')->postJson("/api/v1/bookings/{$b->reference}/cancel", [])->assertUnprocessable();
        $this->actingAs(User::factory()->create(), 'sanctum')->postJson("/api/v1/bookings/{$b->reference}/cancel", ['confirm' => true])->assertNotFound();

        $this->actingAs($this->user, 'sanctum')->postJson("/api/v1/bookings/{$b->reference}/cancel", ['confirm' => true])->assertOk();
        $this->actingAs($this->user, 'sanctum')->postJson("/api/v1/bookings/{$b->reference}/cancel", ['confirm' => true])->assertUnprocessable();
    }

    public function test_trip_that_has_departed_cannot_be_cancelled(): void
    {
        $b = $this->confirmedBooking(90);
        Batch::whereKey($b->batch_id)->update(['starts_on' => now()->subDay()->toDateString()]);

        $this->actingAs($this->user, 'sanctum')->getJson("/api/v1/bookings/{$b->reference}/cancellation")
            ->assertOk()->assertJsonPath('data.can_cancel', false);
    }

    public function test_refund_mode_records_a_pending_refund_instead_of_a_credit_note(): void
    {
        config(['booking.cancellation.mode' => 'refund']);
        $b = $this->confirmedBooking(40);
        $b->milestones()->where('status', 'due')->orderBy('sequence')->get()->each(function ($m) use ($b) {
            if ($m->sequence === 2) {
                $this->actingAs($this->user, 'sanctum')->postJson("/api/v1/bookings/{$b->reference}/milestones/{$m->id}/order");
                $this->actingAs($this->user, 'sanctum')->postJson("/api/v1/bookings/{$b->reference}/milestones/{$m->id}/simulate");
            }
        });

        $this->actingAs($this->user, 'sanctum')->postJson("/api/v1/bookings/{$b->reference}/cancel", ['confirm' => true])
            ->assertOk()->assertJsonPath('data.cancellation_outcome', 'refund');

        $this->assertSame(0, CreditNote::count());
        $this->assertSame('pending', Refund::first()->status);
    }

    public function test_unpaid_pending_booking_can_be_cancelled_with_nothing_returned(): void
    {
        $tour = Tour::where('slug', 'kashmir-delight')->firstOrFail();
        $batch = $tour->batches()->where('status', 'open')->firstOrFail();
        $ref = $this->actingAs($this->user, 'sanctum')->postJson('/api/v1/bookings', [
            'tour_slug' => $tour->slug, 'batch_id' => $batch->id, 'gst_state' => 'Tamil Nadu',
            'contact' => ['name' => 'A', 'phone' => '9876543210', 'email' => 'a@example.com'],
            'travellers' => [['name' => 'T1']],
        ])->json('data.reference');

        $before = $batch->fresh()->seats_booked;
        $this->actingAs($this->user, 'sanctum')->postJson("/api/v1/bookings/{$ref}/cancel", ['confirm' => true])
            ->assertOk()->assertJsonPath('data.cancellation_outcome', 'none');

        $this->assertSame($before - 1, $batch->fresh()->seats_booked);
        $this->assertSame(0, CreditNote::count());
    }
}
