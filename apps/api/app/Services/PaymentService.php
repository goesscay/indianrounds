<?php

namespace App\Services;

use App\Mail\BookingConfirmed;
use App\Models\Booking;
use App\Models\PaymentMilestone;
use App\Services\Payments\PaymentGateway;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

class PaymentService
{
    public function __construct(private readonly PaymentGateway $gateway) {}

    /** @return array<string, mixed> */
    public function createOrder(PaymentMilestone $milestone): array
    {
        if ($milestone->status !== 'due') {
            throw ValidationException::withMessages(['milestone' => 'This payment is not payable.']);
        }

        $booking = $milestone->booking;
        if ($booking->status === 'expired' || $booking->status === 'cancelled') {
            throw ValidationException::withMessages(['booking' => 'This booking is no longer active.']);
        }

        $order = $this->gateway->createOrder($milestone->amount, "{$booking->reference}-{$milestone->sequence}", [
            'booking' => $booking->reference,
            'milestone' => (string) $milestone->sequence,
        ]);

        $milestone->update(['gateway_order_id' => $order['id']]);

        return [
            'driver' => $this->gateway->driver(),
            'key_id' => $this->gateway->publicKey(),
            'order_id' => $order['id'],
            'amount' => $milestone->amount * 100,
            'currency' => 'INR',
            'name' => 'Indian Rounds',
            'description' => "{$booking->tour->title} — {$milestone->label}",
            'prefill' => [
                'name' => $booking->contact_name,
                'email' => $booking->contact_email,
                'contact' => $booking->contact_phone,
            ],
        ];
    }

    public function verifyAndMarkPaid(PaymentMilestone $milestone, string $orderId, string $paymentId, string $signature): PaymentMilestone
    {
        if (! $this->gateway->verifyPaymentSignature($orderId, $paymentId, $signature)) {
            throw ValidationException::withMessages(['signature' => 'Payment signature could not be verified.']);
        }

        return $this->markPaid($milestone, $orderId, $paymentId);
    }

    /** Idempotent: a repeat call for an already-paid milestone is a no-op. */
    public function markPaid(PaymentMilestone $milestone, string $orderId, string $paymentId): PaymentMilestone
    {
        $confirmedNow = false;

        DB::transaction(function () use ($milestone, $orderId, $paymentId, &$confirmedNow) {
            $fresh = PaymentMilestone::query()->whereKey($milestone->id)->lockForUpdate()->firstOrFail();

            if ($fresh->status === 'paid') {
                return;
            }
            if ($fresh->gateway_order_id !== $orderId) {
                throw ValidationException::withMessages(['order_id' => 'Order does not match this payment.']);
            }

            $fresh->update(['status' => 'paid', 'gateway_payment_id' => $paymentId, 'paid_at' => now()]);

            $booking = Booking::query()->whereKey($fresh->booking_id)->lockForUpdate()->firstOrFail();
            if ($booking->status === 'pending_payment') {
                $booking->update(['status' => 'confirmed', 'confirmed_at' => now(), 'reserved_until' => null]);
                $confirmedNow = true;
            }
        });

        if ($confirmedNow) {
            $booking = Booking::query()->with(['tour', 'batch', 'milestones'])->findOrFail($milestone->booking_id);
            Mail::to($booking->contact_email)->send(new BookingConfirmed($booking));
        }

        return $milestone->refresh();
    }
}
