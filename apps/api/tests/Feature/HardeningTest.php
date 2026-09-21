<?php

namespace Tests\Feature;

use App\Console\Commands\LaunchCheck;
use App\Http\Controllers\Api\HealthController;
use App\Mail\BookingCancelled;
use App\Mail\BookingConfirmed;
use App\Mail\PaymentDue;
use App\Models\User;
use Database\Seeders\CatalogueSeeder;
use Database\Seeders\RbacSeeder;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\RateLimiter;
use Laravel\Sanctum\PersonalAccessToken;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class HardeningTest extends TestCase
{
    use RefreshDatabase;

    public function test_api_responses_carry_security_headers(): void
    {
        $res = $this->getJson('/api/v1/health');

        $res->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'DENY')
            ->assertHeader('Referrer-Policy', 'no-referrer');
        $this->assertStringContainsString("default-src 'none'", (string) $res->headers->get('Content-Security-Policy'));
    }

    public function test_authenticated_responses_are_never_publicly_cacheable(): void
    {
        Sanctum::actingAs(User::factory()->create(), ['customer']);

        $cc = (string) $this->getJson('/api/v1/me')->headers->get('Cache-Control');

        $this->assertStringContainsString('no-store', $cc);
        $this->assertStringContainsString('private', $cc);
    }

    public function test_public_catalogue_is_cacheable_but_seat_counts_only_briefly(): void
    {
        $this->seed(CatalogueSeeder::class);
        $slug = (string) DB::table('tours')->value('slug');

        $list = (string) $this->getJson('/api/v1/tours')->headers->get('Cache-Control');
        $batches = (string) $this->getJson("/api/v1/tours/{$slug}/batches")->headers->get('Cache-Control');

        $this->assertStringContainsString('public', $list);
        $this->assertStringContainsString('max-age=30', $list);
        $this->assertStringContainsString('max-age=10', $batches);
    }

    public function test_weak_passwords_are_rejected_at_registration(): void
    {
        $base = ['name' => 'A', 'email' => 'a@example.com', 'phone' => '9876543210'];

        foreach (['short1', 'allletterspassword', '1234567890123'] as $weak) {
            $this->postJson('/api/v1/auth/register', $base + ['password' => $weak, 'password_confirmation' => $weak])
                ->assertUnprocessable()->assertJsonValidationErrors(['password']);
        }
        $this->postJson('/api/v1/auth/register', $base + ['password' => 'good-password-1', 'password_confirmation' => 'good-password-1'])->assertCreated();
    }

    public function test_repeated_wrong_passwords_lock_the_account_for_a_while(): void
    {
        User::factory()->create(['email' => 'victim@example.com', 'password' => 'right-password-1']);
        RateLimiter::clear('login:victim@example.com|127.0.0.1');

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/auth/login', ['email' => 'victim@example.com', 'password' => 'wrong'])->assertUnprocessable();
        }

        // Locked out: even the right password is refused until the window passes.
        $this->postJson('/api/v1/auth/login', ['email' => 'victim@example.com', 'password' => 'right-password-1'])
            ->assertStatus(429)->assertJsonValidationErrors(['email']);
    }

    public function test_successful_login_clears_the_failure_counter(): void
    {
        User::factory()->create(['email' => 'ok@example.com', 'password' => 'right-password-1']);
        RateLimiter::clear('login:ok@example.com|127.0.0.1');

        for ($i = 0; $i < 4; $i++) {
            $this->postJson('/api/v1/auth/login', ['email' => 'ok@example.com', 'password' => 'wrong'])->assertUnprocessable();
        }
        $this->postJson('/api/v1/auth/login', ['email' => 'ok@example.com', 'password' => 'right-password-1'])->assertOk();
        for ($i = 0; $i < 4; $i++) {
            $this->postJson('/api/v1/auth/login', ['email' => 'ok@example.com', 'password' => 'wrong'])->assertUnprocessable();
        }
    }

    public function test_unknown_and_wrong_password_answers_are_identical(): void
    {
        User::factory()->create(['email' => 'real@example.com', 'password' => 'right-password-1']);

        $unknown = $this->postJson('/api/v1/auth/login', ['email' => 'ghost@example.com', 'password' => 'whatever-1'])->assertUnprocessable();
        $wrong = $this->postJson('/api/v1/auth/login', ['email' => 'real@example.com', 'password' => 'whatever-1'])->assertUnprocessable();

        $this->assertSame($unknown->json(), $wrong->json());
    }

    public function test_staff_tokens_expire_within_the_working_day_and_customer_tokens_in_thirty_days(): void
    {
        $this->seed(RbacSeeder::class);
        $staff = User::factory()->create(['email' => 's@example.com', 'password' => 'right-password-1', 'department' => 'sales', 'staff_tier' => 'staff', 'is_active' => true]);
        $staff->assignRole('sales.staff');
        User::factory()->create(['email' => 'c@example.com', 'password' => 'right-password-1']);

        $this->postJson('/api/v1/auth/login', ['email' => 's@example.com', 'password' => 'right-password-1'])->assertOk();
        $this->postJson('/api/v1/auth/login', ['email' => 'c@example.com', 'password' => 'right-password-1'])->assertOk();

        $hours = PersonalAccessToken::query()->orderBy('id')->get()->map(fn ($t) => now()->diffInHours($t->expires_at, true))->all();
        $this->assertEqualsWithDelta(12, $hours[0], 1);
        $this->assertEqualsWithDelta(30 * 24, $hours[1], 1);
    }

    public function test_an_expired_token_is_rejected(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('web', ['customer'], now()->subMinute())->plainTextToken;

        $this->withToken($token)->getJson('/api/v1/me')->assertUnauthorized();
    }

    public function test_health_reports_component_checks(): void
    {
        $this->getJson('/api/v1/health')->assertOk()
            ->assertJsonPath('checks.database', 'ok')->assertJsonPath('checks.cache', 'ok');
    }

    public function test_health_is_degraded_when_the_scheduler_has_stopped(): void
    {
        Cache::put(HealthController::HEARTBEAT_KEY, now()->subMinutes(20)->toIso8601String());

        $this->getJson('/api/v1/health')->assertOk()->assertJsonPath('status', 'degraded')->assertJsonPath('checks.scheduler', 'stale');

        Cache::put(HealthController::HEARTBEAT_KEY, now()->toIso8601String());
        $this->getJson('/api/v1/health')->assertJsonPath('status', 'ok')->assertJsonPath('checks.scheduler', 'ok');
    }

    public function test_health_is_503_when_the_database_is_unreachable(): void
    {
        $original = DB::getDefaultConnection();
        config(['database.connections.broken' => ['driver' => 'sqlite', 'database' => '/nonexistent/x.sqlite']]);
        DB::setDefaultConnection('broken');

        try {
            $this->getJson('/api/v1/health')->assertStatus(503)->assertJsonPath('status', 'down')->assertJsonPath('checks.database', 'fail');
        } finally {
            DB::setDefaultConnection($original);
        }
    }

    public function test_launch_check_fails_on_a_development_configuration(): void
    {
        $this->artisan('launch:check')->assertFailed();
    }

    public function test_launch_check_passes_a_correct_production_configuration(): void
    {
        $this->seed(RbacSeeder::class);
        User::factory()->create(['email' => 'boss@indianrounds.in'])->assignRole('super_admin');
        config([
            'app.env' => 'production', 'app.debug' => false, 'app.url' => 'https://api.indianrounds.in', 'app.frontend_url' => 'https://indianrounds.in',
            'cors.allowed_origins' => ['https://indianrounds.in'],
            'cache.default' => 'redis', 'queue.default' => 'redis', 'session.driver' => 'redis',
            'payments.driver' => 'razorpay', 'payments.razorpay' => ['key_id' => 'rzp_live_abc', 'key_secret' => 's', 'webhook_secret' => 'w'],
            'mail.default' => 'smtp', 'mail.from.address' => 'hello@indianrounds.in',
        ]);

        // The test database is sqlite (or pgsql in CI), so ignore that one check.
        $failed = collect((new LaunchCheck)->results())->where(0, 'fail')->pluck(1)->reject(fn ($c) => $c === 'Database is PostgreSQL')->values()->all();

        $this->assertSame([], $failed);
    }

    public function test_launch_check_flags_test_keys_demo_accounts_and_the_fake_gateway(): void
    {
        User::factory()->create(['email' => 'super@indianrounds.test']);
        config(['payments.driver' => 'fake', 'payments.razorpay.key_id' => 'rzp_test_abc']);

        $failed = collect((new LaunchCheck)->results())->where(0, 'fail')->pluck(1)->all();

        $this->assertContains('Payments use Razorpay', $failed);
        $this->assertContains('Razorpay key is a live key', $failed);
        $this->assertContains('No demo accounts exist', $failed);
    }

    public function test_tour_listing_uses_a_constant_number_of_queries(): void
    {
        $this->seed(CatalogueSeeder::class);
        $this->getJson('/api/v1/tours');

        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->getJson('/api/v1/tours?per_page=24')->assertOk();
        $queries = count(DB::getQueryLog());

        $this->assertLessThanOrEqual(6, $queries, "Tour listing ran {$queries} queries (N+1?)");
    }

    public function test_transactional_emails_are_queued_so_a_mail_outage_cannot_fail_a_recorded_payment(): void
    {
        foreach ([BookingConfirmed::class, BookingCancelled::class, PaymentDue::class] as $mailable) {
            $this->assertTrue(is_subclass_of($mailable, ShouldQueue::class), "{$mailable} must implement ShouldQueue");
            $this->assertGreaterThan(1, (new \ReflectionClass($mailable))->newInstanceWithoutConstructor()->tries);
        }
    }

    public function test_forgot_password_answers_the_same_even_if_the_mail_server_is_down(): void
    {
        User::factory()->create(['email' => 'known@example.com']);
        Password::shouldReceive('sendResetLink')->andThrow(new \RuntimeException('SMTP down'));

        $this->postJson('/api/v1/auth/forgot-password', ['email' => 'known@example.com'])->assertOk()
            ->assertJsonPath('message', 'If that email is registered, a reset link has been sent.');
    }
}
