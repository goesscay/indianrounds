<?php

namespace App\Services\Payments;

use Illuminate\Support\Str;

/** Local development / test gateway. Never used in production (see AppServiceProvider). */
class FakeGateway implements PaymentGateway
{
    public const SECRET = 'fake-secret';

    public const WEBHOOK_SECRET = 'fake-webhook-secret';

    public function driver(): string
    {
        return 'fake';
    }

    public function publicKey(): ?string
    {
        return null;
    }

    public function createOrder(int $amountRupees, string $receipt, array $notes = []): array
    {
        return ['id' => 'order_fake_'.Str::random(14)];
    }

    public function verifyPaymentSignature(string $orderId, string $paymentId, string $signature): bool
    {
        return hash_equals(hash_hmac('sha256', "{$orderId}|{$paymentId}", self::SECRET), $signature);
    }

    public function verifyWebhookSignature(string $payload, string $signature): bool
    {
        return hash_equals(hash_hmac('sha256', $payload, self::WEBHOOK_SECRET), $signature);
    }
}
