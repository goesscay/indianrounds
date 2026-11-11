<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Batch;
use App\Models\Booking;
use App\Models\Destination;
use App\Models\Lead;
use App\Models\Tour;
use App\Models\User;
use Database\Seeders\CatalogueSeeder;
use Database\Seeders\RbacSeeder;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use LogicException;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AdminRbacTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RbacSeeder::class);
        $this->seed(CatalogueSeeder::class);
    }

    protected function staff(string $dept, string $tier = 'staff', array $abilities = ['staff']): User
    {
        $u = User::factory()->create(['department' => $dept, 'staff_tier' => $tier, 'is_active' => true]);
        $u->assignRole("{$dept}.{$tier}");
        Sanctum::actingAs($u, $abilities);

        return $u;
    }

    protected function superAdmin(): User
    {
        $u = User::factory()->create(['department' => null, 'staff_tier' => 'admin']);
        $u->assignRole('super_admin');
        Sanctum::actingAs($u, ['staff']);

        return $u;
    }

    public function test_admin_api_rejects_anonymous_customers_and_customer_scoped_tokens(): void
    {
        $this->getJson('/api/v1/admin/dashboard')->assertUnauthorized();

        $customer = User::factory()->create();
        Sanctum::actingAs($customer, ['customer']);
        $this->getJson('/api/v1/admin/dashboard')->assertForbidden();

        // Even a real staff account is refused when the token was not issued with the staff ability.
        $this->staff('sales', 'staff', ['customer']);
        $this->getJson('/api/v1/admin/dashboard')->assertForbidden();
    }

    public function test_deactivated_staff_are_locked_out_everywhere(): void
    {
        $u = User::factory()->create(['department' => 'sales', 'staff_tier' => 'staff', 'is_active' => false, 'password' => 'secret-pass-1']);
        $u->assignRole('sales.staff');

        $this->postJson('/api/v1/auth/login', ['email' => $u->email, 'password' => 'secret-pass-1'])->assertUnprocessable();
        Sanctum::actingAs($u, ['staff']);
        $this->getJson('/api/v1/admin/dashboard')->assertForbidden();
    }

    public function test_staff_login_gets_staff_token_and_profile_with_permissions(): void
    {
        $u = User::factory()->create(['department' => 'finance', 'staff_tier' => 'staff', 'is_active' => true, 'password' => 'secret-pass-1']);
        $u->assignRole('finance.staff');

        $res = $this->postJson('/api/v1/auth/login', ['email' => $u->email, 'password' => 'secret-pass-1'])->assertOk();

        $res->assertJsonPath('data.staff.tier', 'staff')->assertJsonPath('data.staff.department', 'finance');
        $this->assertContains('refunds.process', $res->json('data.staff.permissions'));
        $this->assertNotContains('tours.manage', $res->json('data.staff.permissions'));
        $this->withToken($res->json('token'))->getJson('/api/v1/admin/dashboard')->assertOk();
    }

    public function test_customer_login_never_carries_the_staff_ability(): void
    {
        $c = User::factory()->create(['password' => 'secret-pass-1']);

        $token = $this->postJson('/api/v1/auth/login', ['email' => $c->email, 'password' => 'secret-pass-1'])->json('token');

        $this->withToken($token)->getJson('/api/v1/admin/dashboard')->assertForbidden();
        $this->assertNull($this->postJson('/api/v1/auth/login', ['email' => $c->email, 'password' => 'secret-pass-1'])->json('data.staff'));
    }

    public function test_permissions_follow_department_and_tier(): void
    {
        $this->staff('finance');
        $this->getJson('/api/v1/admin/refunds')->assertOk();
        $this->getJson('/api/v1/admin/tours')->assertForbidden();
        $this->getJson('/api/v1/admin/audit')->assertForbidden();

        $this->staff('operations');
        $this->getJson('/api/v1/admin/tours')->assertOk();
        $this->getJson('/api/v1/admin/refunds')->assertForbidden();
        $this->getJson('/api/v1/admin/users')->assertForbidden();

        $this->staff('operations', 'admin');
        $this->getJson('/api/v1/admin/users')->assertOk();
    }

    public function test_role_matrix_is_consistent(): void
    {
        $this->assertSame(count(config('rbac.permissions')), Role::findByName('super_admin')->permissions()->count());
        $hr = Role::findByName('hr.staff')->permissions->pluck('name')->all();
        $this->assertNotEmpty($hr);
        foreach ($hr as $perm) {
            $this->assertStringStartsWith('careers.', $perm);
        }

        foreach (config('rbac.departments') as $key => $dept) {
            $staff = Role::findByName("{$key}.staff")->permissions->pluck('name')->all();
            $admin = Role::findByName("{$key}.admin")->permissions->pluck('name')->all();
            $this->assertEmpty(array_diff($staff, $admin), "{$key}.admin must include all staff permissions");
            foreach ([...$dept['staff'], ...$dept['admin']] as $perm) {
                $this->assertNotNull(Permission::query()->where('name', $perm)->first(), "unknown permission {$perm}");
            }
        }
    }

    public function test_dashboard_only_shows_permitted_metrics(): void
    {
        $this->staff('sales');
        $data = $this->getJson('/api/v1/admin/dashboard')->assertOk()->json('data');
        $this->assertArrayHasKey('leads_new', $data);
        $this->assertArrayNotHasKey('collected_total', $data);
        $this->assertArrayNotHasKey('grievances_open', $data);

        $this->staff('finance', 'admin');
        $data = $this->getJson('/api/v1/admin/dashboard')->json('data');
        $this->assertArrayHasKey('collected_total', $data);
        $this->assertArrayHasKey('approvals_pending', $data);
    }

    public function test_staff_can_draft_tours_but_only_admins_publish_and_every_change_is_audited(): void
    {
        $dest = Destination::first();
        $ops = $this->staff('operations');
        $payload = ['destination_id' => $dest->id, 'title' => 'New Test Tour', 'duration_nights' => 3, 'base_price' => 15000];

        $id = $this->postJson('/api/v1/admin/tours', $payload)->assertCreated()->assertJsonPath('data.status', 'draft')->json('data.id');
        $this->postJson('/api/v1/admin/tours', $payload + ['title' => 'Other', 'status' => 'published'])->assertUnprocessable()->assertJsonValidationErrors(['status']);
        $this->getJson('/api/v1/tours/new-test-tour')->assertNotFound();

        $this->putJson("/api/v1/admin/tours/{$id}", ['base_price' => 17000])->assertOk();
        $this->putJson("/api/v1/admin/tours/{$id}", ['status' => 'published'])->assertUnprocessable();
        $this->deleteJson("/api/v1/admin/tours/{$id}")->assertForbidden();

        $this->staff('operations', 'admin');
        $this->putJson("/api/v1/admin/tours/{$id}", ['status' => 'published'])->assertOk();
        $this->getJson('/api/v1/tours/new-test-tour')->assertOk();

        $update = AuditLog::query()->where('action', 'tour.updated')->where('subject_id', $id)->get()->first(fn ($l) => isset($l->after['base_price']));
        $this->assertSame(['base_price' => 15000], $update->before);
        $this->assertSame(['base_price' => 17000], $update->after);
        $this->assertSame($ops->id, $update->actor_id);
    }

    public function test_tour_with_bookings_cannot_be_deleted_and_batches_are_protected(): void
    {
        $this->staff('operations', 'admin');
        $tour = Tour::where('slug', 'kashmir-delight')->firstOrFail();
        $batch = $tour->batches()->where('status', 'open')->firstOrFail();
        $batch->update(['capacity' => 10, 'seats_booked' => 4]);
        $this->makeBooking($tour, $batch);

        $this->putJson("/api/v1/admin/batches/{$batch->id}", ['capacity' => 3])->assertUnprocessable()->assertJsonValidationErrors(['capacity']);
        $this->putJson("/api/v1/admin/batches/{$batch->id}", ['capacity' => 4])->assertOk()->assertJsonPath('data.capacity', 4);
        $this->putJson("/api/v1/admin/batches/{$batch->id}", ['status' => 'open'])->assertUnprocessable();
        $this->putJson("/api/v1/admin/batches/{$batch->id}", ['starts_on' => now()->addDays(200)->toDateString()])->assertUnprocessable();
        $this->deleteJson("/api/v1/admin/batches/{$batch->id}")->assertUnprocessable();
        $this->deleteJson("/api/v1/admin/tours/{$tour->id}")->assertUnprocessable();
    }

    public function test_admin_can_add_variants_and_batches(): void
    {
        $this->staff('operations', 'admin');
        $tour = Tour::where('slug', 'bali-getaway')->firstOrFail();

        $this->postJson("/api/v1/admin/tours/{$tour->id}/variants", ['label' => 'Villa upgrade', 'price' => 45000])->assertCreated();
        $this->postJson("/api/v1/admin/tours/{$tour->id}/batches", ['starts_on' => now()->addDays(60)->toDateString(), 'ends_on' => now()->addDays(64)->toDateString(), 'capacity' => 12])
            ->assertCreated()->assertJsonPath('data.seats_booked', 0);
        $this->postJson("/api/v1/admin/tours/{$tour->id}/batches", ['starts_on' => now()->subDay()->toDateString(), 'ends_on' => now()->toDateString(), 'capacity' => 5])->assertUnprocessable();

        $this->assertDatabaseHas('audit_logs', ['action' => 'variant.created']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'batch.created']);
    }

    public function test_audit_log_is_append_only_and_permission_gated(): void
    {
        $this->staff('operations', 'admin');
        $this->postJson('/api/v1/admin/destinations', ['name' => 'Testland'])->assertCreated();

        $log = AuditLog::query()->where('action', 'destination.created')->firstOrFail();
        try {
            $log->update(['action' => 'tampered']);
            $this->fail('Audit entry was modified.');
        } catch (LogicException) {
            $this->assertSame('destination.created', $log->fresh()->action);
        }
        $this->expectException(LogicException::class);
        $log->delete();
    }

    public function test_audit_endpoint_needs_audit_view(): void
    {
        $this->staff('finance');
        $this->getJson('/api/v1/admin/audit')->assertForbidden();

        $this->staff('finance', 'admin');
        $this->getJson('/api/v1/admin/audit')->assertOk()->assertJsonStructure(['data', 'meta']);
    }

    public function test_user_provisioning_rules(): void
    {
        Notification::fake();

        $this->staff('sales', 'admin');
        $this->postJson('/api/v1/admin/users', ['name' => 'New Rep', 'email' => 'rep@example.com', 'department' => 'sales', 'tier' => 'staff'])->assertCreated();
        $rep = User::where('email', 'rep@example.com')->firstOrFail();
        $this->assertTrue($rep->hasRole('sales.staff'));
        $this->assertSame('staff', $rep->staff_tier);

        // Dept admin: other department, or admin tier, is refused.
        $this->postJson('/api/v1/admin/users', ['name' => 'X', 'email' => 'x@example.com', 'department' => 'finance', 'tier' => 'staff'])->assertUnprocessable();
        $this->postJson('/api/v1/admin/users', ['name' => 'X', 'email' => 'x@example.com', 'department' => 'sales', 'tier' => 'admin'])->assertUnprocessable();

        // Staff cannot provision at all.
        $this->staff('sales');
        $this->postJson('/api/v1/admin/users', ['name' => 'Y', 'email' => 'y@example.com', 'department' => 'sales', 'tier' => 'staff'])->assertForbidden();

        // Super Admin can create an Admin anywhere.
        $this->superAdmin();
        $this->postJson('/api/v1/admin/users', ['name' => 'Fin Head', 'email' => 'fin@example.com', 'department' => 'finance', 'tier' => 'admin'])->assertCreated();
        $this->assertTrue(User::where('email', 'fin@example.com')->firstOrFail()->hasRole('finance.admin'));
    }

    public function test_new_staff_get_a_reset_link_and_no_usable_password(): void
    {
        Notification::fake();
        $this->superAdmin();

        $this->postJson('/api/v1/admin/users', ['name' => 'Ops Head', 'email' => 'ops@example.com', 'department' => 'operations', 'tier' => 'admin'])->assertCreated();
        $u = User::where('email', 'ops@example.com')->firstOrFail();

        Notification::assertSentTo($u, ResetPassword::class);
        $this->postJson('/api/v1/auth/login', ['email' => 'ops@example.com', 'password' => 'password'])->assertUnprocessable();
    }

    public function test_dept_admin_cannot_manage_other_departments_or_self_deactivate(): void
    {
        $other = User::factory()->create(['department' => 'finance', 'staff_tier' => 'staff']);
        $other->assignRole('finance.staff');
        $mine = User::factory()->create(['department' => 'sales', 'staff_tier' => 'staff']);
        $mine->assignRole('sales.staff');

        $admin = $this->staff('sales', 'admin');
        $this->putJson("/api/v1/admin/users/{$other->id}", ['is_active' => false])->assertForbidden();
        $this->putJson("/api/v1/admin/users/{$admin->id}", ['is_active' => false])->assertForbidden(); // admins are not manageable by dept admins
        $this->putJson("/api/v1/admin/users/{$mine->id}", ['department' => 'finance'])->assertUnprocessable();

        $token = $mine->createToken('t', ['staff']);
        $this->putJson("/api/v1/admin/users/{$mine->id}", ['is_active' => false])->assertOk();
        $this->assertFalse($mine->fresh()->is_active);
        $this->assertSame(0, $mine->tokens()->count());
        $this->assertNotNull($token);

        $this->superAdmin();
        $this->putJson("/api/v1/admin/users/{$mine->id}", ['department' => 'finance', 'tier' => 'admin'])->assertOk();
        $this->assertTrue($mine->fresh()->hasRole('finance.admin'));
        $this->assertFalse($mine->fresh()->hasRole('sales.staff'));
    }

    public function test_staff_details_email_and_password_can_be_edited(): void
    {
        $mine = User::factory()->create(['department' => 'sales', 'staff_tier' => 'staff']);
        $mine->assignRole('sales.staff');
        $mine->createToken('t', ['staff']);

        $this->staff('sales', 'admin');
        $this->putJson("/api/v1/admin/users/{$mine->id}", ['name' => 'Renamed', 'email' => 'renamed@example.com', 'phone' => '9876543210'])->assertOk();
        $this->assertSame('renamed@example.com', $mine->fresh()->email);
        $this->assertSame(1, $mine->tokens()->count());

        $this->putJson("/api/v1/admin/users/{$mine->id}", ['password' => 'short'])->assertUnprocessable()->assertJsonValidationErrors(['password']);
        $this->putJson("/api/v1/admin/users/{$mine->id}", ['password' => 'NewPassw0rd123'])->assertOk();
        $this->assertTrue(Hash::check('NewPassw0rd123', $mine->fresh()->password));
        $this->assertSame(0, $mine->tokens()->count());
        $this->assertStringNotContainsString('NewPassw0rd123', json_encode(AuditLog::query()->get()->toArray()));

        $taken = User::factory()->create();
        $this->putJson("/api/v1/admin/users/{$mine->id}", ['email' => $taken->email])->assertUnprocessable()->assertJsonValidationErrors(['email']);
    }

    public function test_super_admin_cannot_deactivate_self(): void
    {
        $me = $this->superAdmin();

        $this->putJson("/api/v1/admin/users/{$me->id}", ['is_active' => false])->assertUnprocessable()->assertJsonValidationErrors(['is_active']);
    }

    public function test_user_list_is_scoped_to_department_for_admins(): void
    {
        User::factory()->create(['department' => 'finance', 'staff_tier' => 'staff'])->assignRole('finance.staff');
        $this->staff('sales', 'admin');

        $emails = collect($this->getJson('/api/v1/admin/users')->json('data'))->pluck('department')->unique()->values()->all();
        $this->assertSame(['sales'], $emails);

        $this->superAdmin();
        $this->assertGreaterThan(1, collect($this->getJson('/api/v1/admin/users')->json('data'))->pluck('department')->unique()->count());
    }

    public function test_settings_are_super_admin_only(): void
    {
        $this->staff('finance', 'admin');
        $this->getJson('/api/v1/admin/settings')->assertForbidden();

        $this->superAdmin();
        $this->putJson('/api/v1/admin/settings', ['refund_staff_limit' => 2500])->assertOk()->assertJsonPath('data.refund_staff_limit', 2500);
        $this->assertDatabaseHas('audit_logs', ['action' => 'settings.updated']);
    }

    public function test_leads_can_be_worked_and_assigned_to_active_staff_only(): void
    {
        $this->postJson('/api/v1/leads/callback', ['name' => 'Asha', 'phone' => '9876543210'])->assertCreated();
        $lead = Lead::firstOrFail();

        $rep = $this->staff('sales');
        $this->putJson("/api/v1/admin/leads/{$lead->id}", ['status' => 'contacted', 'notes' => 'Called', 'assigned_to' => $rep->id])->assertOk()->assertJsonPath('data.status', 'contacted');
        $customer = User::factory()->create();
        $this->putJson("/api/v1/admin/leads/{$lead->id}", ['assigned_to' => $customer->id])->assertUnprocessable();
        $this->putJson("/api/v1/admin/leads/{$lead->id}", ['status' => 'bogus'])->assertUnprocessable();
        $this->deleteJson("/api/v1/admin/leads/{$lead->id}")->assertForbidden();

        $this->staff('sales', 'admin');
        $this->deleteJson("/api/v1/admin/leads/{$lead->id}")->assertOk();
    }

    protected function makeBooking(Tour $tour, Batch $batch, string $status = 'confirmed'): Booking
    {
        return Booking::create([
            'reference' => 'IRTEST'.random_int(1000, 9999),
            'user_id' => User::factory()->create()->id,
            'tour_id' => $tour->id,
            'batch_id' => $batch->id,
            'status' => $status,
            'haul_class' => 'short',
            'traveller_count' => 1,
            'unit_price' => 1000,
            'subtotal' => 1000,
            'gst_rate' => 0.05,
            'gst_amount' => 50,
            'total_amount' => 1050,
            'gst_state' => 'Tamil Nadu',
            'contact_name' => 'Test',
            'contact_phone' => '9876543210',
            'contact_email' => 't@example.com',
        ]);
    }
}
