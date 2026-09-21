<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Notification;
use Laravel\Socialite\Contracts\Provider;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialiteUser;
use Mockery;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    private function payload(array $override = []): array
    {
        return array_merge([
            'name' => 'Asha Rao',
            'email' => 'asha@example.com',
            'phone' => '9876543210',
            'password' => 'secret-pass-1',
            'password_confirmation' => 'secret-pass-1',
            'gst_state' => 'Tamil Nadu',
        ], $override);
    }

    public function test_register_returns_token_and_user(): void
    {
        $this->postJson('/api/v1/auth/register', $this->payload())
            ->assertCreated()
            ->assertJsonPath('data.email', 'asha@example.com')
            ->assertJsonStructure(['token']);

        $this->assertDatabaseHas('users', ['email' => 'asha@example.com', 'gst_state' => 'Tamil Nadu']);
    }

    public function test_register_validates_input(): void
    {
        User::factory()->create(['email' => 'asha@example.com']);

        $this->postJson('/api/v1/auth/register', $this->payload(['phone' => 'abc', 'gst_state' => 'Atlantis']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email', 'phone', 'gst_state']);
    }

    public function test_login_me_and_logout(): void
    {
        $this->postJson('/api/v1/auth/register', $this->payload());

        $token = $this->postJson('/api/v1/auth/login', ['email' => 'asha@example.com', 'password' => 'secret-pass-1'])
            ->assertOk()->json('token');

        $this->withToken($token)->getJson('/api/v1/me')->assertOk()->assertJsonPath('data.name', 'Asha Rao');

        $this->withToken($token)->postJson('/api/v1/auth/logout')->assertOk();
        $this->assertDatabaseCount('personal_access_tokens', 1); // register token remains, login token removed
    }

    public function test_wrong_password_is_rejected(): void
    {
        $this->postJson('/api/v1/auth/register', $this->payload());

        $this->postJson('/api/v1/auth/login', ['email' => 'asha@example.com', 'password' => 'nope'])
            ->assertUnprocessable()->assertJsonValidationErrors(['email']);
    }

    public function test_protected_routes_require_authentication(): void
    {
        $this->getJson('/api/v1/me')->assertUnauthorized();
        $this->getJson('/api/v1/bookings')->assertUnauthorized();
        $this->postJson('/api/v1/bookings', [])->assertUnauthorized();
    }

    public function test_profile_can_be_updated(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->patchJson('/api/v1/me', ['gst_state' => 'Kerala', 'phone' => '9000000000'])
            ->assertOk()->assertJsonPath('data.gst_state', 'Kerala');
    }

    public function test_forgot_password_sends_link_without_revealing_account(): void
    {
        Notification::fake();
        $user = User::factory()->create(['email' => 'known@example.com']);

        $this->postJson('/api/v1/auth/forgot-password', ['email' => 'known@example.com'])->assertOk();
        $this->postJson('/api/v1/auth/forgot-password', ['email' => 'unknown@example.com'])->assertOk();

        Notification::assertSentTo($user, ResetPassword::class);
        Notification::assertCount(1);
    }

    public function test_password_can_be_reset_with_valid_token(): void
    {
        $user = User::factory()->create(['email' => 'known@example.com']);
        $token = app('auth.password.broker')->createToken($user);

        $this->postJson('/api/v1/auth/reset-password', [
            'token' => $token, 'email' => 'known@example.com',
            'password' => 'brand-new-pass-2', 'password_confirmation' => 'brand-new-pass-2',
        ])->assertOk();

        $this->postJson('/api/v1/auth/login', ['email' => 'known@example.com', 'password' => 'brand-new-pass-2'])->assertOk();
    }

    public function test_google_callback_creates_user_and_exchange_returns_token_once(): void
    {
        $google = new SocialiteUser;
        $google->map(['id' => 'g-123', 'name' => 'Gina Google', 'email' => 'gina@example.com']);

        $provider = Mockery::mock(Provider::class);
        $provider->shouldReceive('stateless')->andReturnSelf();
        $provider->shouldReceive('user')->andReturn($google);
        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);

        $response = $this->get('/api/v1/auth/google/callback');
        $response->assertRedirectContains('/auth/google/callback?code=');
        parse_str(parse_url($response->headers->get('Location'), PHP_URL_QUERY), $q);

        $this->postJson('/api/v1/auth/google/exchange', ['code' => $q['code']])
            ->assertOk()->assertJsonPath('data.email', 'gina@example.com')->assertJsonStructure(['token']);

        $this->postJson('/api/v1/auth/google/exchange', ['code' => $q['code']])->assertUnprocessable();
        $this->assertDatabaseHas('users', ['google_id' => 'g-123']);
        Cache::flush();
    }
}
