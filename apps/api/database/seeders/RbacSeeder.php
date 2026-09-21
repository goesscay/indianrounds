<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RbacSeeder extends Seeder
{
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach (config('rbac.permissions') as $name) {
            Permission::findOrCreate($name, 'web');
        }

        Role::findOrCreate('super_admin', 'web')->syncPermissions(config('rbac.permissions'));

        foreach (config('rbac.departments') as $key => $dept) {
            Role::findOrCreate("{$key}.staff", 'web')->syncPermissions($dept['staff']);
            Role::findOrCreate("{$key}.admin", 'web')->syncPermissions(array_values(array_unique([...$dept['staff'], ...$dept['admin']])));
        }

        foreach (config('rbac.settings') as $key => $value) {
            Setting::query()->firstOrCreate(['key' => $key], ['value' => $value]);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
