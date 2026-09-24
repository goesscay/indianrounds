<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MaintenanceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RbacSeeder::class);
    }

    private function superAdmin(): User
    {
        $u = User::factory()->create(['department' => null, 'staff_tier' => 'admin', 'is_active' => true]);
        $u->assignRole('super_admin');
        Sanctum::actingAs($u, ['staff']);

        return $u;
    }

    public function test_site_is_live_by_default_and_the_public_read_is_uncached(): void
    {
        $res = $this->getJson('/api/v1/meta/maintenance')->assertOk();
        $res->assertJsonPath('data.enabled', false);
        $this->assertStringContainsString('no-store', (string) $res->headers->get('Cache-Control'));
    }

    public function test_super_admin_can_switch_it_on_and_off_and_it_is_audited(): void
    {
        $this->superAdmin();

        $this->putJson('/api/v1/admin/maintenance', ['enabled' => true, 'message' => 'Upgrading our booking system.', 'expected_back' => 'Around 6 PM IST'])
            ->assertOk()->assertJsonPath('data.enabled', true);

        $this->getJson('/api/v1/meta/maintenance')
            ->assertJsonPath('data.enabled', true)
            ->assertJsonPath('data.message', 'Upgrading our booking system.')
            ->assertJsonPath('data.expected_back', 'Around 6 PM IST');
        $this->assertDatabaseHas('audit_logs', ['action' => 'maintenance.enabled']);

        $this->putJson('/api/v1/admin/maintenance', ['enabled' => false])->assertOk()->assertJsonPath('data.enabled', false);
        $this->getJson('/api/v1/meta/maintenance')->assertJsonPath('data.enabled', false)->assertJsonPath('data.message', null);
        $this->assertSame(1, AuditLog::query()->where('action', 'maintenance.disabled')->count());
    }

    public function test_only_a_super_admin_can_change_it(): void
    {
        $staff = User::factory()->create(['department' => 'operations', 'staff_tier' => 'admin', 'is_active' => true]);
        $staff->assignRole('operations.admin');
        Sanctum::actingAs($staff, ['staff']);

        $this->putJson('/api/v1/admin/maintenance', ['enabled' => true])->assertForbidden();
        $this->getJson('/api/v1/meta/maintenance')->assertJsonPath('data.enabled', false);
    }

    public function test_customers_and_visitors_cannot_change_it(): void
    {
        $this->putJson('/api/v1/admin/maintenance', ['enabled' => true])->assertUnauthorized();

        Sanctum::actingAs(User::factory()->create(), ['customer']);
        $this->putJson('/api/v1/admin/maintenance', ['enabled' => true])->assertStatus(403);
    }

    public function test_input_is_validated(): void
    {
        $this->superAdmin();
        $this->putJson('/api/v1/admin/maintenance', [])->assertUnprocessable()->assertJsonValidationErrors('enabled');
        $this->putJson('/api/v1/admin/maintenance', ['enabled' => true, 'message' => str_repeat('a', 301)])->assertUnprocessable()->assertJsonValidationErrors('message');
    }
}
