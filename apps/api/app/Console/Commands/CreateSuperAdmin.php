<?php

namespace App\Console\Commands;

use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Password;

class CreateSuperAdmin extends Command
{
    protected $signature = 'admin:create-super-admin {email} {name}';

    protected $description = 'Create (or promote) a Super Admin and email them a link to set their password';

    public function handle(): int
    {
        $this->callSilently('db:seed', ['--class' => RbacSeeder::class, '--force' => true]);

        $user = User::query()->firstOrNew(['email' => $this->argument('email')]);
        $user->fill(['name' => $this->argument('name'), 'staff_tier' => 'admin', 'department' => null, 'is_active' => true])->save();
        $user->syncRoles(['super_admin']);

        Password::sendResetLink(['email' => $user->email]);
        $this->info("Super Admin {$user->email} is ready. A password reset link was sent to set the password.");

        return self::SUCCESS;
    }
}
