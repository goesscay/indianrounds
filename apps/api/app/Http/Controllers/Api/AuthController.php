<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:120',
            'email' => 'required|email:rfc|max:255|unique:users,email',
            'phone' => 'required|string|regex:/^\d{10,15}$/',
            'password' => 'required|string|min:8|confirmed',
            'gst_state' => ['nullable', Rule::in(config('booking.states'))],
        ]);

        $user = User::create($data);

        return $this->issue($user, 201);
    }

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate(['email' => 'required|email', 'password' => 'required|string']);

        $user = User::query()->where('email', $credentials['email'])->first();

        if (! $user || ! $user->password || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages(['email' => 'These credentials do not match our records.']);
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
            'password' => 'required|string|min:8|confirmed',
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
        Password::sendResetLink($request->only('email'));

        // Same response whether or not the account exists, to avoid leaking registered emails.
        return response()->json(['message' => 'If that email is registered, a reset link has been sent.']);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => 'required|string',
            'email' => 'required|email',
            'password' => 'required|string|min:8|confirmed',
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
            'token' => $user->createToken('web', ['customer'])->plainTextToken,
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
        ];
    }
}
