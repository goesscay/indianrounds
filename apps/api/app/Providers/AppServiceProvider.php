<?php

namespace App\Providers;

use App\Services\Payments\FakeGateway;
use App\Services\Payments\PaymentGateway;
use App\Services\Payments\RazorpayGateway;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\ServiceProvider;
use RuntimeException;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(PaymentGateway::class, function () {
            $driver = config('payments.driver');

            if ($driver === 'razorpay') {
                $c = config('payments.razorpay');

                return new RazorpayGateway((string) $c['key_id'], (string) $c['key_secret'], (string) $c['webhook_secret']);
            }

            if ($this->app->isProduction()) {
                throw new RuntimeException('The fake payment driver must not be used in production.');
            }

            return new FakeGateway;
        });
    }

    public function boot(): void
    {
        ResetPassword::createUrlUsing(fn ($user, string $token) => rtrim((string) config('app.frontend_url'), '/')
            .'/reset-password?token='.$token.'&email='.urlencode($user->getEmailForPasswordReset()));
    }
}
