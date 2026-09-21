<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class UserAuthTraitsTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_hold_roles_and_api_tokens(): void
    {
        $user = User::factory()->create();
        Role::create(['name' => 'super_admin', 'guard_name' => 'web']);

        $user->assignRole('super_admin');

        $this->assertTrue($user->hasRole('super_admin'));
        $this->assertNotEmpty($user->createToken('test')->plainTextToken);
    }
}
