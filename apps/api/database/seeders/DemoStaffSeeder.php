<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Local/staging demo accounts (never seeded in production). All use the password "password".
 * In production, create the first Super Admin with: php artisan admin:create-super-admin
 */
class DemoStaffSeeder extends Seeder
{
    public function run(): void
    {
        $this->make('Super Admin', 'super@indianrounds.test', null, null, 'super_admin');

        foreach (array_keys(config('rbac.departments')) as $dept) {
            $this->make(ucfirst(str_replace('_', ' ', $dept)).' Admin', "{$dept}.admin@indianrounds.test", $dept, 'admin', "{$dept}.admin");
            $this->make(ucfirst(str_replace('_', ' ', $dept)).' Staff', "{$dept}.staff@indianrounds.test", $dept, 'staff', "{$dept}.staff");
        }
    }

    private function make(string $name, string $email, ?string $department, ?string $tier, string $role): void
    {
        $user = User::query()->updateOrCreate(['email' => $email], [
            'name' => $name,
            'phone' => '9000000000',
            'password' => 'password',
            'department' => $department,
            'staff_tier' => $tier ?? 'admin',
            'is_active' => true,
        ]);
        $user->syncRoles([$role]);
    }
}
