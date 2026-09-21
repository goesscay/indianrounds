<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\BookingResource;
use App\Models\Booking;
use App\Models\PaymentMilestone;
use App\Services\Payments\PaymentGateway;
use App\Services\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PaymentController extends Controller
{
    public function __construct(private readonly PaymentService $payments) {}

    public function order(Request $request, string $reference, int $milestone): JsonResponse
    {
        $m = $this->milestone($request, $reference, $milestone);

        return response()->json(['data' => $this->payments->createOrder($m)]);
    }

    public function verify(Request $request, string $reference, int $milestone): BookingResource
    {
        $m = $this->milestone($request, $reference, $milestone);
        $data = $request->validate([
            'razorpay_order_id' => 'required|string',
            'razorpay_payment_id' => 'required|string',
            'razorpay_signature' => 'required|string',
        ]);

        $this->payments->verifyAndMarkPaid($m, $data['razorpay_order_id'], $data['razorpay_payment_id'], $data['razorpay_signature']);

        return new BookingResource($m->booking->fresh(['tour', 'batch', 'variant', 'milestones', 'travellers']));
    }

    /** Development only: completes a payment on the fake gateway without any card details. */
    public function simulate(Request $request, string $reference, int $milestone, PaymentGateway $gateway): BookingResource
    {
        abort_if(app()->isProduction() || $gateway->driver() !== 'fake', 404);

        $m = $this->milestone($request, $reference, $milestone);
        if (! $m->gateway_order_id) {
            throw ValidationException::withMessages(['milestone' => 'Create a payment order first.']);
        }

        $this->payments->markPaid($m, $m->gateway_order_id, 'pay_fake_'.Str::random(14));

        return new BookingResource($m->booking->fresh(['tour', 'batch', 'variant', 'milestones', 'travellers']));
    }

    private function milestone(Request $request, string $reference, int $id): PaymentMilestone
    {
        $booking = Booking::query()
            ->where('user_id', $request->user()->id)
            ->where('reference', $reference)
            ->firstOrFail();

        return PaymentMilestone::query()->where('booking_id', $booking->id)->whereKey($id)->with('booking.tour')->firstOrFail();
    }
}
