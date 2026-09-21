<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Go-live gate. Run against the production environment before switching traffic:
 * `php artisan launch:check`. Exits non-zero on any failure, and on warnings with --strict.
 */
class LaunchCheck extends Command
{
    protected $signature = 'launch:check {--strict : Treat warnings as failures}';

    protected $description = 'Verify production configuration before launch';

    /** @return list<array{0: string, 1: string, 2: string}> [level, check, detail] where level is pass|warn|fail */
    public function results(): array
    {
        $r = [];
        $add = function (bool $ok, string $check, string $detail, string $onFail = 'fail') use (&$r) {
            $r[] = [$ok ? 'pass' : $onFail, $check, $ok ? '' : $detail];
        };

        $add(config('app.env') === 'production', 'APP_ENV is production', 'APP_ENV='.config('app.env'));
        $add(config('app.debug') === false, 'APP_DEBUG is off', 'Debug mode leaks stack traces and environment values');
        $add(filled(config('app.key')), 'APP_KEY is set', 'Run php artisan key:generate');
        $add(str_starts_with((string) config('app.url'), 'https://'), 'APP_URL uses https', 'APP_URL='.config('app.url'));
        $add(str_starts_with((string) config('app.frontend_url'), 'https://'), 'FRONTEND_URL uses https', 'CORS and password-reset links use this');
        $add(config('database.default') === 'pgsql', 'Database is PostgreSQL', 'DB_CONNECTION='.config('database.default'));

        foreach (['cache.default' => 'CACHE_STORE', 'queue.default' => 'QUEUE_CONNECTION', 'session.driver' => 'SESSION_DRIVER'] as $key => $env) {
            $add(config($key) === 'redis', "{$env} is redis", "{$env}=".config($key), 'warn');
        }

        $driver = config('payments.driver');
        $add($driver === 'razorpay', 'Payments use Razorpay', "PAYMENT_DRIVER={$driver} (the fake gateway must not be live)");
        $keyId = (string) config('payments.razorpay.key_id');
        $add(str_starts_with($keyId, 'rzp_live_'), 'Razorpay key is a live key', $keyId === '' ? 'RAZORPAY_KEY_ID is empty' : 'Key id is not rzp_live_… (test keys cannot take real money)');
        $add(filled(config('payments.razorpay.key_secret')), 'Razorpay key secret is set', 'RAZORPAY_KEY_SECRET is empty');
        $add(filled(config('payments.razorpay.webhook_secret')), 'Razorpay webhook secret is set', 'Without it payment webhooks are rejected and paid bookings stay pending');

        $mailer = (string) config('mail.default');
        $add(! in_array($mailer, ['log', 'array'], true), 'Mail is delivered, not logged', "MAIL_MAILER={$mailer}");
        $from = (string) config('mail.from.address');
        $add(! str_contains($from, 'example.com') && filled($from), 'Mail from-address is a real address', "MAIL_FROM_ADDRESS={$from}");

        $add(in_array(config('booking.company_state'), config('booking.states'), true), 'Company GST state is valid', 'COMPANY_GST_STATE='.config('booking.company_state'));
        $add(filled(config('cors.allowed_origins.0')) && ! str_contains((string) config('cors.allowed_origins.0'), 'localhost'), 'CORS origin is the live site', 'FRONTEND_URL points at localhost');
        $add(filled(config('app.trusted_proxies')), 'TRUSTED_PROXIES is set', 'Behind a load balancer, IP rate limits and audit IPs need the real client address', 'warn');

        try {
            $add(User::query()->where('email', 'like', '%@indianrounds.test')->doesntExist(), 'No demo accounts exist', 'Delete the *@indianrounds.test users (password is "password")');
            $add(User::query()->role('super_admin')->exists(), 'A Super Admin exists', 'Run php artisan admin:create-super-admin');
            $add(DB::table('roles')->count() > 0, 'Roles are seeded', 'Run php artisan db:seed --class=RbacSeeder');
        } catch (\Throwable $e) {
            $add(false, 'Database is reachable', $e->getMessage());
        }

        return $r;
    }

    public function handle(): int
    {
        $results = $this->results();
        $icons = ['pass' => '<info>PASS</info>', 'warn' => '<comment>WARN</comment>', 'fail' => '<error>FAIL</error>'];

        foreach ($results as [$level, $check, $detail]) {
            $this->line(sprintf('%s  %s%s', $icons[$level], $check, $detail !== '' ? " — {$detail}" : ''));
        }

        $fails = count(array_filter($results, fn ($x) => $x[0] === 'fail'));
        $warns = count(array_filter($results, fn ($x) => $x[0] === 'warn'));
        $this->newLine();
        $this->line("{$fails} failing, {$warns} warning(s).");

        return $fails > 0 || ($this->option('strict') && $warns > 0) ? self::FAILURE : self::SUCCESS;
    }
}
