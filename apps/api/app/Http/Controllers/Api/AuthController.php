<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    private const LOGIN_ATTEMPTS = 5;

    /** bcrypt of a random string, used to equalise timing for unknown emails. */
    private const DUMMY_HASH = '$2y$12$dgT7zShnsUP0acdHoxqNZu1d0IxxGySxo3LH6HvS1mEE2h1U2KyFO';

    public static function passwordRule(): PasswordRule
    {
        return PasswordRule::min(10)->letters()->numbers();
    }

    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:120',
            'email' => 'required|email:rfc|max:255|unique:users,email',
            'phone' => 'required|string|regex:/^\d{10,15}$/',
            'password' => ['required', 'string', self::passwordRule(), 'confirmed'],
            'gst_state' => ['nullable', Rule::in(config('booking.states'))],
        ]);

        $user = User::create($data);

        return $this->issue($user, 201);
    }

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate(['email' => 'required|email', 'password' => 'required|string']);

        // Per account + client: slows password guessing even when it is spread across many IPs.
        $key = 'login:'.Str::lower($credentials['email']).'|'.$request->ip();
        if (RateLimiter::tooManyAttempts($key, self::LOGIN_ATTEMPTS)) {
            $wait = RateLimiter::availableIn($key);
            throw ValidationException::withMessages(['email' => "Too many sign-in attempts. Try again in {$wait} seconds."])->status(429);
        }

        $user = User::query()->where('email', $credentials['email'])->first();

        // Always run a hash check so a missing account takes as long as a wrong password.
        $hash = $user?->password ?: self::DUMMY_HASH;
        if (! Hash::check($credentials['password'], $hash) || ! $user || ! $user->password) {
            RateLimiter::hit($key, 300);
            throw ValidationException::withMessages(['email' => 'These credentials do not match our records.']);
        }
        RateLimiter::clear($key);

        if (! $user->is_active) {
            throw ValidationException::withMessages(['email' => 'This account has been disabled. Please contact support.']);
        }

        return $this->issue($user);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()?->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out.']);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->present($request->user())]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->validate([
            'name' => 'sometimes|required|string|max:120',
            'phone' => 'sometimes|required|string|regex:/^\d{10,15}$/',
            'gst_state' => ['sometimes', 'nullable', Rule::in(config('booking.states'))],
        ]);
        $user->update($data);

        return response()->json(['data' => $this->present($user->fresh())]);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->validate([
            'current_password' => [$user->password ? 'required' : 'nullable', 'string'],
            'password' => ['required', 'string', self::passwordRule(), 'confirmed'],
        ]);

        if ($user->password && ! Hash::check((string) ($data['current_password'] ?? ''), $user->password)) {
            throw ValidationException::withMessages(['current_password' => 'Your current password is incorrect.']);
        }

        $user->update(['password' => $data['password']]);
        $user->tokens()->where('id', '!=', $user->currentAccessToken()->getKey())->delete();

        return response()->json(['message' => 'Password updated.']);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => 'required|email']);
        try {
            Password::sendResetLink($request->only('email'));
        } catch (\Throwable $e) {
            // A mail outage must not reveal (through a 500) which addresses are registered.
            report($e);
        }

        // Same response whether or not the account exists, to avoid leaking registered emails.
        return response()->json(['message' => 'If that email is registered, a reset link has been sent.']);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => 'required|string',
            'email' => 'required|email',
            'password' => ['required', 'string', self::passwordRule(), 'confirmed'],
        ]);

        $status = Password::reset($data, function (User $user, string $password) {
            $user->forceFill(['password' => $password, 'remember_token' => Str::random(60)])->save();
            $user->tokens()->delete();
            event(new PasswordReset($user));
        });

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages(['email' => __($status)]);
        }

        return response()->json(['message' => 'Password has been reset.']);
    }

    private function issue(User $user, int $status = 200): JsonResponse
    {
        return response()->json([
            // Staff sessions are short: a stolen back-office token stops working within the working day.
            'token' => $user->createToken('web', $user->isStaff() ? ['staff', 'customer'] : ['customer'], $user->isStaff() ? now()->addHours(12) : now()->addDays(30))->plainTextToken,
            'data' => $this->present($user),
        ], $status);
    }

    /** @return array<string, mixed> */
    private function present(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'gst_state' => $user->gst_state,
            'staff' => $user->staffProfile(),
        ];
    }
}
