<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PaymentMilestone;
use App\Models\WebhookEvent;
use App\Services\Payments\PaymentGateway;
use App\Services\PaymentService;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RazorpayWebhookController extends Controller
{
    public function __invoke(Request $request, PaymentGateway $gateway, PaymentService $payments): JsonResponse
    {
        $payload = $request->getContent();
        $signature = (string) $request->header('X-Razorpay-Signature', '');

        if ($signature === '' || ! $gateway->verifyWebhookSignature($payload, $signature)) {
            return response()->json(['message' => 'Invalid signature.'], 400);
        }

        $eventId = (string) $request->header('X-Razorpay-Event-Id', '');
        $event = json_decode($payload, true) ?: [];

        if ($eventId !== '') {
            try {
                WebhookEvent::create(['provider' => 'razorpay', 'event_id' => $eventId, 'type' => $event['event'] ?? null]);
            } catch (UniqueConstraintViolationException) {
                return response()->json(['message' => 'Already processed.']);
            }
        }

        if (($event['event'] ?? null) === 'payment.captured') {
            $payment = $event['payload']['payment']['entity'] ?? [];
            $orderId = $payment['order_id'] ?? null;
            $paymentId = $payment['id'] ?? null;

            $milestone = $orderId ? PaymentMilestone::query()->where('gateway_order_id', $orderId)->first() : null;
            if ($milestone && $paymentId) {
                $payments->markPaid($milestone, $orderId, $paymentId);
            }
        }

        return response()->json(['message' => 'OK']);
    }
}
