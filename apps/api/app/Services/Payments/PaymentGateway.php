<?php

namespace App\Services\Payments;

interface PaymentGateway
{
    public function driver(): string;

    public function publicKey(): ?string;

    /**
     * @param  array<string, string>  $notes
     * @return array{id: string}
     */
    public function createOrder(int $amountRupees, string $receipt, array $notes = []): array;

    public function verifyPaymentSignature(string $orderId, string $paymentId, string $signature): bool;

    public function verifyWebhookSignature(string $payload, string $signature): bool;
}
