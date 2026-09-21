<?php

namespace Tests\Feature;

use App\Mail\BookingConfirmed;
use App\Models\Batch;
use App\Models\Booking;
use App\Models\Tour;
use App\Models\User;
use App\Services\BookingService;
use App\Services\Payments\FakeGateway;
use Database\Seeders\CatalogueSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class BookingPaymentTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CatalogueSeeder::class);
        $this->user = User::factory()->create();
    }

    private function openBatch(string $slug = 'kashmir-delight'): Batch
    {
        $tour = Tour::where('slug', $slug)->firstOrFail();

        return $tour->batches()->where('status', 'open')->orderBy('starts_on')->firstOrFail();
    }

    private function payload(Batch $batch, int $pax = 2, array $override = []): array
    {
        return array_merge([
            'tour_slug' => $batch->tour->slug,
            'batch_id' => $batch->id,
            'gst_state' => 'Tamil Nadu',
            'contact' => ['name' => 'Asha Rao', 'phone' => '9876543210', 'email' => 'asha@example.com'],
            'travellers' => array_map(fn ($i) => ['name' => "Traveller {$i}", 'age' => 30, 'gender' => 'female'], range(1, $pax)),
        ], $override);
    }

    private function book(Batch $batch, int $pax = 2): array
    {
        return $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/v1/bookings', $this->payload($batch, $pax))
            ->assertCreated()->json('data');
    }

    public function test_booking_requires_login(): void
    {
        $this->postJson('/api/v1/bookings', $this->payload($this->openBatch()))->assertUnauthorized();
    }

    public function test_booking_reserves_seats_and_builds_totals_and_milestones(): void
    {
        $batch = $this->openBatch();
        $before = $batch->seats_booked;

        $data = $this->book($batch, 2);

        $this->assertSame(24999 * 2, $data['subtotal']);
        $this->assertSame((int) round(24999 * 2 * 0.05), $data['gst_amount']);
        $this->assertSame($data['subtotal'] + $data['gst_amount'], $data['total_amount']);
        $this->assertSame('pending_payment', $data['status']);
        $this->assertSame($before + 2, $batch->fresh()->seats_booked);
        $this->assertSame($data['total_amount'], array_sum(array_column($data['milestones'], 'amount')));
        $this->assertSame('Booking advance', $data['milestones'][0]['label']);
    }

    public function test_variant_price_is_used_when_selected(): void
    {
        $batch = $this->openBatch('ladakh-circuit');
        $variant = $batch->tour->variants()->where('label', 'Motorbike, solo rider')->firstOrFail();

        $data = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/v1/bookings', $this->payload($batch, 1, ['variant_id' => $variant->id]))
            ->assertCreated()->json('data');

        $this->assertSame($variant->price, $data['unit_price']);
        $this->assertSame('Motorbike, solo rider', $data['variant']);
    }

    public function test_last_seat_cannot_be_taken_twice(): void
    {
        $batch = $this->openBatch();
        $batch->update(['capacity' => 10, 'seats_booked' => 9]);

        $this->book($batch, 1);
        $this->assertSame('sold_out', $batch->fresh()->status);

        $this->actingAs(User::factory()->create(), 'sanctum')
            ->postJson('/api/v1/bookings', $this->payload($batch, 1))
            ->assertUnprocessable()->assertJsonValidationErrors(['batch_id']);

        $this->assertSame(10, $batch->fresh()->seats_booked);
    }

    public function test_party_larger_than_remaining_seats_is_rejected(): void
    {
        $batch = $this->openBatch();
        $batch->update(['capacity' => 10, 'seats_booked' => 8]);

        $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/v1/bookings', $this->payload($batch, 3))
            ->assertUnprocessable();

        $this->assertSame(8, $batch->fresh()->seats_booked);
    }

    public function test_batch_from_another_tour_is_rejected(): void
    {
        $batch = $this->openBatch('kashmir-delight');

        $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/v1/bookings', $this->payload($batch, 1, ['tour_slug' => 'bali-getaway']))
            ->assertUnprocessable()->assertJsonValidationErrors(['batch_id']);
    }

    public function test_bookings_are_private_to_their_owner(): void
    {
        $data = $this->book($this->openBatch());

        $this->actingAs(User::factory()->create(), 'sanctum')
            ->getJson("/api/v1/bookings/{$data['reference']}")->assertNotFound();
        $this->actingAs($this->user, 'sanctum')
            ->getJson("/api/v1/bookings/{$data['reference']}")->assertOk();
    }

    private function orderFor(array $booking, int $sequence = 1): array
    {
        $milestone = collect($booking['milestones'])->firstWhere('sequence', $sequence);

        return $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/v1/bookings/{$booking['reference']}/milestones/{$milestone['id']}/order")
            ->assertOk()->json('data') + ['milestone_id' => $milestone['id']];
    }

    private function sign(string $order, string $payment): string
    {
        return hash_hmac('sha256', "{$order}|{$payment}", FakeGateway::SECRET);
    }

    public function test_verified_payment_confirms_booking_and_sends_email(): void
    {
        Mail::fake();
        $booking = $this->book($this->openBatch());
        $order = $this->orderFor($booking);

        $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/v1/bookings/{$booking['reference']}/milestones/{$order['milestone_id']}/verify", [
                'razorpay_order_id' => $order['order_id'],
                'razorpay_payment_id' => 'pay_1',
                'razorpay_signature' => $this->sign($order['order_id'], 'pay_1'),
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'confirmed')
            ->assertJsonPath('data.milestones.0.status', 'paid');

        Mail::assertQueued(BookingConfirmed::class, 1);
    }

    public function test_invalid_signature_does_not_mark_paid(): void
    {
        $booking = $this->book($this->openBatch());
        $order = $this->orderFor($booking);

        $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/v1/bookings/{$booking['reference']}/milestones/{$order['milestone_id']}/verify", [
                'razorpay_order_id' => $order['order_id'],
                'razorpay_payment_id' => 'pay_1',
                'razorpay_signature' => 'forged',
            ])->assertUnprocessable();

        $this->assertSame('due', collect(Booking::first()->milestones)->first()->status);
    }

    public function test_repeat_verification_is_idempotent_and_sends_one_email(): void
    {
        Mail::fake();
        $booking = $this->book($this->openBatch());
        $order = $this->orderFor($booking);
        $body = [
            'razorpay_order_id' => $order['order_id'],
            'razorpay_payment_id' => 'pay_1',
            'razorpay_signature' => $this->sign($order['order_id'], 'pay_1'),
        ];
        $url = "/api/v1/bookings/{$booking['reference']}/milestones/{$order['milestone_id']}/verify";

        $this->actingAs($this->user, 'sanctum')->postJson($url, $body)->assertOk();
        $this->actingAs($this->user, 'sanctum')->postJson($url, $body)->assertOk();

        Mail::assertQueued(BookingConfirmed::class, 1);
    }

    public function test_webhook_marks_paid_once_and_rejects_bad_signature(): void
    {
        Mail::fake();
        $booking = $this->book($this->openBatch());
        $order = $this->orderFor($booking);

        $body = json_encode(['event' => 'payment.captured', 'payload' => ['payment' => ['entity' => ['id' => 'pay_w1', 'order_id' => $order['order_id']]]]]);
        $headers = fn (string $sig) => ['HTTP_X_RAZORPAY_SIGNATURE' => $sig, 'HTTP_X_RAZORPAY_EVENT_ID' => 'evt_1', 'CONTENT_TYPE' => 'application/json'];
        $good = hash_hmac('sha256', $body, FakeGateway::WEBHOOK_SECRET);

        $this->call('POST', '/api/v1/webhooks/razorpay', [], [], [], $headers('bad'), $body)->assertStatus(400);
        $this->assertSame('pending_payment', Booking::first()->status);

        $this->call('POST', '/api/v1/webhooks/razorpay', [], [], [], $headers($good), $body)->assertOk();
        $this->call('POST', '/api/v1/webhooks/razorpay', [], [], [], $headers($good), $body)->assertOk();

        $this->assertSame('confirmed', Booking::first()->status);
        $this->assertDatabaseCount('webhook_events', 1);
        Mail::assertQueued(BookingConfirmed::class, 1);
    }

    public function test_dev_simulate_endpoint_completes_payment_on_fake_driver(): void
    {
        Mail::fake();
        $booking = $this->book($this->openBatch());
        $order = $this->orderFor($booking);

        $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/v1/bookings/{$booking['reference']}/milestones/{$order['milestone_id']}/simulate")
            ->assertOk()->assertJsonPath('data.status', 'confirmed');
    }

    public function test_unpaid_booking_expires_and_releases_seats(): void
    {
        $batch = $this->openBatch();
        $batch->update(['capacity' => 10, 'seats_booked' => 8]);
        $data = $this->book($batch, 2);
        $this->assertSame('sold_out', $batch->fresh()->status);

        Booking::where('reference', $data['reference'])->update(['reserved_until' => now()->subMinute()]);
        $this->artisan('bookings:release-expired')->assertSuccessful();

        $this->assertSame('expired', Booking::where('reference', $data['reference'])->first()->status);
        $this->assertSame(8, $batch->fresh()->seats_booked);
        $this->assertSame('open', $batch->fresh()->status);
    }

    public function test_paid_booking_is_never_expired(): void
    {
        Mail::fake();
        $data = $this->book($this->openBatch());
        $order = $this->orderFor($data);
        $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/v1/bookings/{$data['reference']}/milestones/{$order['milestone_id']}/simulate")->assertOk();

        $booking = Booking::where('reference', $data['reference'])->first();
        $this->assertFalse(app(BookingService::class)->expire($booking));
        $this->assertSame('confirmed', $booking->fresh()->status);
    }

    public function test_invoice_splits_gst_by_state(): void
    {
        $intra = $this->book($this->openBatch());
        $this->actingAs($this->user, 'sanctum')
            ->getJson("/api/v1/bookings/{$intra['reference']}/invoice")
            ->assertOk()->assertJsonPath('data.tax.type', 'CGST+SGST');

        $other = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/v1/bookings', $this->payload($this->openBatch('himachal-explorer'), 1, ['gst_state' => 'Karnataka']))
            ->assertCreated()->json('data');
        $this->actingAs($this->user, 'sanctum')
            ->getJson("/api/v1/bookings/{$other['reference']}/invoice")
            ->assertOk()->assertJsonPath('data.tax.type', 'IGST');
    }
}
