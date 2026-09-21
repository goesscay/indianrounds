<?php

namespace App\Services\Payments;

use Illuminate\Support\Facades\Http;

class RazorpayGateway implements PaymentGateway
{
    public function __construct(
        private readonly string $keyId,
        private readonly string $keySecret,
        private readonly string $webhookSecret,
    ) {}

    public function driver(): string
    {
        return 'razorpay';
    }

    public function publicKey(): ?string
    {
        return $this->keyId;
    }

    public function createOrder(int $amountRupees, string $receipt, array $notes = []): array
    {
        $response = Http::withBasicAuth($this->keyId, $this->keySecret)
            ->acceptJson()
            ->post('https://api.razorpay.com/v1/orders', [
                'amount' => $amountRupees * 100,
                'currency' => 'INR',
                'receipt' => $receipt,
                'notes' => $notes,
            ])
            ->throw();

        return ['id' => (string) $response->json('id')];
    }

    public function verifyPaymentSignature(string $orderId, string $paymentId, string $signature): bool
    {
        return hash_equals(hash_hmac('sha256', "{$orderId}|{$paymentId}", $this->keySecret), $signature);
    }

    public function verifyWebhookSignature(string $payload, string $signature): bool
    {
        return $this->webhookSecret !== ''
            && hash_equals(hash_hmac('sha256', $payload, $this->webhookSecret), $signature);
    }
}
