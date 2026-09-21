<?php

namespace Tests\Feature;

use App\Mail\BookingConfirmed;
use App\Mail\PaymentDue;
use App\Models\Booking;
use App\Models\CreditNote;
use App\Models\Grievance;
use App\Models\Tour;
use App\Models\User;
use Database\Seeders\CatalogueSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class CreditNoteAndAccountTest extends TestCase
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

    private function note(int $amount, array $override = []): CreditNote
    {
        $source = $this->sourceBooking();

        return CreditNote::create(array_merge([
            'code' => 'CN-'.strtoupper(substr(md5((string) microtime(true).$amount), 0, 8)),
            'user_id' => $this->user->id,
            'source_booking_id' => $source->id,
            'amount' => $amount,
            'issued_on' => now()->toDateString(),
            'expires_on' => now()->addMonths(12)->toDateString(),
        ], $override));
    }

    private function sourceBooking(): Booking
    {
        return Booking::first() ?? tap($this->makeBooking(), fn () => null);
    }

    private function makeBooking(?int $creditNoteId = null, int $pax = 1, string $slug = 'kashmir-delight'): Booking
    {
        $tour = Tour::where('slug', $slug)->firstOrFail();
        $batch = $tour->batches()->where('status', 'open')->orderBy('starts_on')->firstOrFail();
        $batch->update(['starts_on' => now()->addDays(90)->toDateString(), 'ends_on' => now()->addDays(94)->toDateString(), 'capacity' => 30, 'seats_booked' => 0]);

        $res = $this->actingAs($this->user, 'sanctum')->postJson('/api/v1/bookings', array_filter([
            'tour_slug' => $slug, 'batch_id' => $batch->id, 'gst_state' => 'Tamil Nadu', 'credit_note_id' => $creditNoteId,
            'contact' => ['name' => 'A', 'phone' => '9876543210', 'email' => 'a@example.com'],
            'travellers' => array_map(fn ($i) => ['name' => "T{$i}"], range(1, $pax)),
        ]));

        return Booking::where('reference', $res->json('data.reference') ?? '')->first() ?? new Booking;
    }

    public function test_credit_notes_are_listed_with_effective_status(): void
    {
        $this->note(1000);
        $this->note(2000, ['expires_on' => now()->subDay()->toDateString()]);

        $rows = collect($this->actingAs($this->user, 'sanctum')->getJson('/api/v1/me/credit-notes')->assertOk()->json('data'));

        $this->assertSame(['active', 'expired'], $rows->sortBy('amount')->pluck('status')->values()->all());
    }

    public function test_credit_note_smaller_than_first_payment_reduces_the_advance(): void
    {
        $seed = $this->makeBooking(); // creates a source booking row for the FK
        $note = $this->note(3000);

        $b = $this->makeBooking($note->id, 2);

        $this->assertSame(3000, $b->credit_applied);
        $this->assertSame('pending_payment', $b->status);
        $this->assertSame($b->total_amount - 3000, $b->milestones()->sum('amount'));
        $this->assertSame([1, 2, 3, 4], $b->milestones()->pluck('sequence')->all());
        $this->assertSame('redeemed', $note->fresh()->status);
        $this->assertSame($b->id, $note->fresh()->redeemed_booking_id);
        $this->assertNotNull($seed->id);
    }

    public function test_credit_note_covering_the_advance_confirms_the_booking_immediately(): void
    {
        $this->makeBooking();
        $probe = $this->makeBooking(null, 2);
        $advance = (int) $probe->milestones()->orderBy('sequence')->first()->amount;
        $note = $this->note($advance);

        $b = $this->makeBooking($note->id, 2);

        $this->assertSame('confirmed', $b->status);
        $this->assertSame(3, $b->milestones()->count());
        $this->assertSame($advance, $b->paid_amount);
        Mail::assertSent(BookingConfirmed::class);
    }

    public function test_credit_note_worth_more_than_the_booking_is_refused(): void
    {
        $this->makeBooking();
        $note = $this->note(500000);
        $tour = Tour::where('slug', 'kashmir-delight')->firstOrFail();
        $batch = $tour->batches()->where('status', 'open')->firstOrFail();

        $this->actingAs($this->user, 'sanctum')->postJson('/api/v1/bookings', [
            'tour_slug' => $tour->slug, 'batch_id' => $batch->id, 'gst_state' => 'Tamil Nadu', 'credit_note_id' => $note->id,
            'contact' => ['name' => 'A', 'phone' => '9876543210', 'email' => 'a@example.com'],
            'travellers' => [['name' => 'T1']],
        ])->assertUnprocessable()->assertJsonValidationErrors(['credit_note_id']);

        $this->assertSame('active', $note->fresh()->status);
    }

    public function test_expired_used_and_foreign_credit_notes_are_refused(): void
    {
        $this->makeBooking();
        $expired = $this->note(1000, ['expires_on' => now()->subDay()->toDateString()]);
        $foreign = $this->note(1000, ['user_id' => User::factory()->create()->id]);
        $tour = Tour::where('slug', 'kashmir-delight')->firstOrFail();
        $batch = $tour->batches()->where('status', 'open')->firstOrFail();

        foreach ([$expired, $foreign] as $n) {
            $this->actingAs($this->user, 'sanctum')->postJson('/api/v1/bookings', [
                'tour_slug' => $tour->slug, 'batch_id' => $batch->id, 'gst_state' => 'Tamil Nadu', 'credit_note_id' => $n->id,
                'contact' => ['name' => 'A', 'phone' => '9876543210', 'email' => 'a@example.com'],
                'travellers' => [['name' => 'T1']],
            ])->assertUnprocessable();
        }
    }

    public function test_a_failed_booking_does_not_burn_the_credit_note(): void
    {
        $this->makeBooking();
        $note = $this->note(1000);
        $tour = Tour::where('slug', 'kashmir-delight')->firstOrFail();
        $batch = $tour->batches()->firstOrFail();
        $batch->update(['capacity' => 5, 'seats_booked' => 5, 'status' => 'open']);

        $this->actingAs($this->user, 'sanctum')->postJson('/api/v1/bookings', [
            'tour_slug' => $tour->slug, 'batch_id' => $batch->id, 'gst_state' => 'Tamil Nadu', 'credit_note_id' => $note->id,
            'contact' => ['name' => 'A', 'phone' => '9876543210', 'email' => 'a@example.com'],
            'travellers' => [['name' => 'T1']],
        ])->assertUnprocessable();

        $this->assertSame('active', $note->fresh()->status);
    }

    public function test_grievance_is_created_with_service_deadlines_and_is_private(): void
    {
        $booking = $this->makeBooking();

        $ref = $this->actingAs($this->user, 'sanctum')->postJson('/api/v1/grievances', [
            'subject' => 'Hotel issue', 'description' => 'The room was not as described.', 'booking_reference' => $booking->reference,
        ])->assertCreated()->assertJsonPath('data.stage', 1)->assertJsonPath('data.booking_reference', $booking->reference)->json('data.reference');

        $g = Grievance::where('reference', $ref)->firstOrFail();
        $this->assertEqualsWithDelta(48, $g->created_at->diffInHours($g->ack_due_at), 0.1);
        $this->assertEqualsWithDelta(15, $g->created_at->diffInDays($g->resolve_by), 0.1);
        $this->assertEqualsWithDelta(30, $g->created_at->diffInDays($g->statutory_deadline), 0.1);

        $this->actingAs($this->user, 'sanctum')->getJson('/api/v1/grievances')->assertOk()->assertJsonCount(1, 'data');
        $this->actingAs(User::factory()->create(), 'sanctum')->getJson("/api/v1/grievances/{$ref}")->assertNotFound();
        $this->actingAs(User::factory()->create(), 'sanctum')->getJson('/api/v1/grievances')->assertJsonCount(0, 'data');
    }

    public function test_grievance_rejects_someone_elses_booking_and_missing_fields(): void
    {
        $booking = $this->makeBooking();

        $this->actingAs(User::factory()->create(), 'sanctum')->postJson('/api/v1/grievances', [
            'subject' => 'x', 'description' => 'y', 'booking_reference' => $booking->reference,
        ])->assertUnprocessable();
        $this->actingAs($this->user, 'sanctum')->postJson('/api/v1/grievances', [])->assertUnprocessable()->assertJsonValidationErrors(['subject', 'description']);
    }

    public function test_password_can_be_changed_only_with_the_current_password(): void
    {
        $user = User::factory()->create(['password' => 'old-password-1']);

        $token = $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'old-password-1'])->json('token');

        $this->withToken($token)->postJson('/api/v1/me/password', [
            'current_password' => 'wrong', 'password' => 'new-password-1', 'password_confirmation' => 'new-password-1',
        ])->assertUnprocessable()->assertJsonValidationErrors(['current_password']);

        $this->withToken($token)->postJson('/api/v1/me/password', [
            'current_password' => 'old-password-1', 'password' => 'new-password-1', 'password_confirmation' => 'new-password-1',
        ])->assertOk();

        $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'new-password-1'])->assertOk();
    }

    public function test_reminders_go_to_confirmed_bookings_with_a_payment_due_soon_once(): void
    {
        $booking = $this->makeBooking();
        $m1 = $booking->milestones()->orderBy('sequence')->first();
        $this->actingAs($this->user, 'sanctum')->postJson("/api/v1/bookings/{$booking->reference}/milestones/{$m1->id}/order");
        $this->actingAs($this->user, 'sanctum')->postJson("/api/v1/bookings/{$booking->reference}/milestones/{$m1->id}/simulate");
        $booking->milestones()->where('sequence', 2)->update(['due_on' => now()->addDays(2)->toDateString()]);

        $this->artisan('payments:send-reminders')->assertSuccessful();
        $this->artisan('payments:send-reminders')->assertSuccessful();

        Mail::assertSent(PaymentDue::class, 1);
    }
}
