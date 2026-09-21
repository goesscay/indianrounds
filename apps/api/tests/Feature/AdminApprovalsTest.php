<?php

namespace Tests\Feature;

use App\Models\ApprovalRequest;
use App\Models\Batch;
use App\Models\Booking;
use App\Models\CreditNote;
use App\Models\Grievance;
use App\Models\Refund;
use App\Models\Tour;
use App\Models\User;
use Database\Seeders\CatalogueSeeder;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminApprovalsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RbacSeeder::class);
        $this->seed(CatalogueSeeder::class);
    }

    private function staff(string $dept, string $tier = 'staff'): User
    {
        $u = User::factory()->create(['department' => $dept, 'staff_tier' => $tier, 'is_active' => true]);
        $u->assignRole("{$dept}.{$tier}");
        Sanctum::actingAs($u, ['staff']);

        return $u;
    }

    private function booking(): Booking
    {
        $tour = Tour::where('slug', 'kashmir-delight')->firstOrFail();

        return Booking::create([
            'reference' => 'IRAPPR'.random_int(1000, 9999), 'user_id' => User::factory()->create()->id, 'tour_id' => $tour->id,
            'batch_id' => Batch::where('tour_id', $tour->id)->firstOrFail()->id, 'status' => 'cancelled', 'haul_class' => 'short',
            'traveller_count' => 1, 'unit_price' => 1000, 'subtotal' => 1000, 'gst_rate' => 0.05, 'gst_amount' => 50, 'total_amount' => 1050,
            'gst_state' => 'Tamil Nadu', 'contact_name' => 'T', 'contact_phone' => '9876543210', 'contact_email' => 't@example.com',
        ]);
    }

    private function refund(int $amount): Refund
    {
        $b = $this->booking();

        return Refund::create(['booking_id' => $b->id, 'user_id' => $b->user_id, 'amount' => $amount]);
    }

    public function test_staff_refund_within_limit_is_processed_directly(): void
    {
        $r = $this->refund(9000);
        $this->staff('finance');

        $this->postJson("/api/v1/admin/refunds/{$r->id}/process", ['reference' => 'UTR123'])->assertOk()->assertJsonPath('approval_required', false);

        $this->assertSame('processed', $r->fresh()->status);
        $this->assertSame('UTR123', $r->fresh()->reference);
        $this->assertDatabaseHas('audit_logs', ['action' => 'refund.processed', 'subject_id' => $r->id]);
    }

    public function test_staff_refund_over_limit_needs_admin_approval_then_processes(): void
    {
        $r = $this->refund(25000);
        $staff = $this->staff('finance');

        $this->postJson("/api/v1/admin/refunds/{$r->id}/process", ['reference' => 'UTR999'])->assertStatus(202)->assertJsonPath('approval_required', true);
        $this->assertSame('pending_approval', $r->fresh()->status);
        $approval = ApprovalRequest::firstOrFail();
        $this->assertSame($staff->id, $approval->requested_by);

        // A second attempt cannot create a duplicate request.
        $this->postJson("/api/v1/admin/refunds/{$r->id}/process", ['reference' => 'UTR999'])->assertUnprocessable();
        // Staff cannot decide, not even their own request.
        $this->postJson("/api/v1/admin/approvals/{$approval->id}/decide", ['approve' => true])->assertForbidden();

        $admin = $this->staff('finance', 'admin');
        $this->postJson("/api/v1/admin/approvals/{$approval->id}/decide", ['approve' => true, 'note' => 'ok'])->assertOk();

        $this->assertSame('processed', $r->fresh()->status);
        $this->assertSame($admin->id, $r->fresh()->processed_by);
        $this->assertSame('approved', $approval->fresh()->status);
        $this->assertDatabaseHas('audit_logs', ['action' => 'approval.approved', 'subject_id' => $approval->id]);
        $this->postJson("/api/v1/admin/approvals/{$approval->id}/decide", ['approve' => true])->assertUnprocessable();
    }

    public function test_rejected_refund_goes_back_to_pending(): void
    {
        $r = $this->refund(25000);
        $this->staff('finance');
        $this->postJson("/api/v1/admin/refunds/{$r->id}/process", ['reference' => 'UTR1']);
        $approval = ApprovalRequest::firstOrFail();

        $this->staff('finance', 'admin');
        $this->postJson("/api/v1/admin/approvals/{$approval->id}/decide", ['approve' => false, 'note' => 'check docs'])->assertOk();

        $this->assertSame('pending', $r->fresh()->status);
        $this->assertSame('rejected', $approval->fresh()->status);
    }

    public function test_admin_of_another_department_cannot_decide_but_super_admin_can(): void
    {
        $r = $this->refund(25000);
        $this->staff('finance');
        $this->postJson("/api/v1/admin/refunds/{$r->id}/process", ['reference' => 'UTR1']);
        $approval = ApprovalRequest::firstOrFail();

        $this->staff('sales', 'admin');
        $this->postJson("/api/v1/admin/approvals/{$approval->id}/decide", ['approve' => true])->assertUnprocessable();
        $this->assertCount(0, $this->getJson('/api/v1/admin/approvals')->json('data'));

        $super = User::factory()->create(['staff_tier' => 'admin']);
        $super->assignRole('super_admin');
        Sanctum::actingAs($super, ['staff']);
        $this->assertCount(1, $this->getJson('/api/v1/admin/approvals')->json('data'));
        $this->postJson("/api/v1/admin/approvals/{$approval->id}/decide", ['approve' => true])->assertOk();
        $this->assertSame('processed', $r->fresh()->status);
    }

    public function test_admin_processes_large_refund_without_approval(): void
    {
        $r = $this->refund(90000);
        $this->staff('finance', 'admin');

        $this->postJson("/api/v1/admin/refunds/{$r->id}/process", ['reference' => 'UTR7'])->assertOk();
        $this->assertSame(0, ApprovalRequest::count());
    }

    public function test_credit_note_issue_respects_the_staff_limit(): void
    {
        $b = $this->booking();
        $this->staff('finance');

        $this->postJson('/api/v1/admin/credit-notes', ['booking_reference' => $b->reference, 'amount' => 3000, 'reason' => 'Goodwill'])
            ->assertCreated()->assertJsonPath('approval_required', false);
        $this->assertSame(1, CreditNote::count());
        $this->assertSame($b->user_id, CreditNote::first()->user_id);

        $this->postJson('/api/v1/admin/credit-notes', ['booking_reference' => $b->reference, 'amount' => 8000, 'reason' => 'Service failure'])
            ->assertStatus(202)->assertJsonPath('approval_required', true);
        $this->assertSame(1, CreditNote::count());

        $approval = ApprovalRequest::where('type', 'credit_note_issue')->firstOrFail();
        $this->staff('finance', 'admin');
        $this->postJson("/api/v1/admin/approvals/{$approval->id}/decide", ['approve' => true])->assertOk();
        $this->assertSame(2, CreditNote::count());
        $this->assertSame(8000, CreditNote::orderByDesc('id')->first()->amount);
    }

    public function test_credit_note_for_unknown_booking_is_rejected(): void
    {
        $this->staff('finance');

        $this->postJson('/api/v1/admin/credit-notes', ['booking_reference' => 'NOPE', 'amount' => 100, 'reason' => 'x'])->assertUnprocessable();
    }

    public function test_changed_threshold_changes_the_routing(): void
    {
        $r = $this->refund(3000);

        $super = User::factory()->create(['staff_tier' => 'admin']);
        $super->assignRole('super_admin');
        Sanctum::actingAs($super, ['staff']);
        $this->putJson('/api/v1/admin/settings', ['refund_staff_limit' => 1000])->assertOk();

        $this->staff('finance');
        $this->postJson("/api/v1/admin/refunds/{$r->id}/process", ['reference' => 'U1'])->assertStatus(202);
    }

    public function test_only_pending_refunds_can_be_rejected_by_staff_with_a_reason(): void
    {
        $r = $this->refund(500);
        $this->staff('finance');

        $this->postJson("/api/v1/admin/refunds/{$r->id}/reject", [])->assertUnprocessable();
        $this->postJson("/api/v1/admin/refunds/{$r->id}/reject", ['notes' => 'Duplicate request'])->assertOk()->assertJsonPath('data.status', 'rejected');
        $this->postJson("/api/v1/admin/refunds/{$r->id}/process", ['reference' => 'U'])->assertUnprocessable();
    }

    private function grievance(): Grievance
    {
        $u = User::factory()->create();

        return Grievance::create([
            'reference' => 'GRTEST'.random_int(100, 999), 'user_id' => $u->id, 'subject' => 'Late pickup', 'description' => 'Driver was late.',
            'stage' => 1, 'status' => 'open', 'ack_due_at' => now()->addHours(48), 'resolve_by' => now()->addDays(15), 'statutory_deadline' => now()->addDays(30),
        ]);
    }

    public function test_grievance_workflow_and_stage_permissions(): void
    {
        $g = $this->grievance();

        $cs = $this->staff('customer_success');
        $this->postJson("/api/v1/admin/grievances/{$g->id}/acknowledge")->assertOk()->assertJsonPath('data.officer_name', $cs->name);
        $this->postJson("/api/v1/admin/grievances/{$g->id}/acknowledge")->assertUnprocessable();
        $this->postJson("/api/v1/admin/grievances/{$g->id}/escalate")->assertOk()->assertJsonPath('data.stage', 2);

        // Staff can see a stage-2 ticket but not act on it.
        $this->getJson("/api/v1/admin/grievances/{$g->id}")->assertOk()->assertJsonPath('data.can_act', false);
        $this->postJson("/api/v1/admin/grievances/{$g->id}/resolve", ['resolution' => 'Fixed'])->assertForbidden();

        $this->staff('customer_success', 'admin');
        $this->postJson("/api/v1/admin/grievances/{$g->id}/resolve", ['resolution' => 'Refunded the pickup fee.'])->assertOk()->assertJsonPath('data.status', 'resolved');
        $this->assertNotNull($g->fresh()->resolved_at);
        $this->postJson("/api/v1/admin/grievances/{$g->id}/resolve", ['resolution' => 'again'])->assertUnprocessable();
        $this->assertDatabaseHas('audit_logs', ['action' => 'grievance.escalated']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'grievance.resolved']);
    }

    public function test_other_departments_cannot_touch_grievances(): void
    {
        $g = $this->grievance();
        $this->staff('sales');

        $this->getJson('/api/v1/admin/grievances')->assertForbidden();
        $this->postJson("/api/v1/admin/grievances/{$g->id}/acknowledge")->assertForbidden();
    }

    public function test_grievance_cannot_escalate_past_stage_three(): void
    {
        $g = $this->grievance();
        $g->update(['stage' => 3]);
        $this->staff('customer_success', 'admin');

        $this->postJson("/api/v1/admin/grievances/{$g->id}/escalate")->assertUnprocessable();
    }

    public function test_admin_booking_views_show_customer_and_payments(): void
    {
        $b = $this->booking();
        $this->staff('sales');

        $this->getJson('/api/v1/admin/bookings?q='.$b->reference)->assertOk()->assertJsonPath('data.0.reference', $b->reference);
        $this->getJson("/api/v1/admin/bookings/{$b->reference}")->assertOk()->assertJsonPath('data.customer.email', $b->user->email);
        $this->getJson('/api/v1/admin/payments')->assertForbidden(); // sales staff cannot see money

        $this->staff('finance');
        $this->getJson('/api/v1/admin/payments')->assertOk();
        $this->getJson('/api/v1/admin/customers?q='.$b->user->email)->assertOk()->assertJsonPath('data.0.email', $b->user->email);
    }
}
