<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\GoogleProvider;
use Symfony\Component\HttpFoundation\RedirectResponse as SymfonyRedirect;

class GoogleAuthController extends Controller
{
    public function redirect(): SymfonyRedirect
    {
        /** @var GoogleProvider $driver */
        $driver = Socialite::driver('google');

        return $driver->stateless()->redirect();
    }

    public function callback(): RedirectResponse
    {
        $front = rtrim((string) config('app.frontend_url'), '/');

        try {
            /** @var GoogleProvider $driver */
            $driver = Socialite::driver('google');
            $google = $driver->stateless()->user();
        } catch (\Throwable) {
            return redirect("{$front}/login?error=google");
        }

        $user = User::query()->where('google_id', $google->getId())->first()
            ?? User::query()->where('email', $google->getEmail())->first();

        if ($user) {
            $user->forceFill(['google_id' => $google->getId()])->save();
        } else {
            $user = User::create([
                'name' => $google->getName() ?: 'Traveller',
                'email' => $google->getEmail(),
                'google_id' => $google->getId(),
            ]);
        }

        // One-time code the web app exchanges server-side, so the token never sits in a URL.
        $code = Str::random(48);
        Cache::put("oauth_code:{$code}", $user->id, now()->addMinutes(2));

        return redirect("{$front}/auth/google/callback?code={$code}");
    }

    public function exchange(Request $request): JsonResponse
    {
        $request->validate(['code' => 'required|string|max:100']);

        $userId = Cache::pull('oauth_code:'.$request->string('code'));
        $user = $userId ? User::query()->find($userId) : null;

        if (! $user) {
            return response()->json(['message' => 'Invalid or expired sign-in code.'], 422);
        }

        return response()->json([
            'token' => $user->createToken('web', ['customer'])->plainTextToken,
            'data' => ['id' => $user->id, 'name' => $user->name, 'email' => $user->email, 'phone' => $user->phone, 'gst_state' => $user->gst_state],
        ]);
    }
}
