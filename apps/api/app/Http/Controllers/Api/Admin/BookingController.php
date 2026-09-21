<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Admin\Concerns\Paginates;
use App\Http\Controllers\Controller;
use App\Http\Resources\BookingResource;
use App\Models\Booking;
use App\Models\CreditNote;
use App\Models\PaymentMilestone;
use App\Models\Refund;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BookingController extends Controller
{
    use Paginates;

    public function index(Request $request): JsonResponse
    {
        $q = Booking::query()->with(['tour:id,title,slug', 'batch:id,starts_on'])->latest('id');
        if ($request->filled('status')) {
            $q->where('status', $request->string('status'));
        }
        if ($request->filled('q')) {
            $term = '%'.str_replace(['%', '_'], ['\\%', '\\_'], (string) $request->string('q')).'%';
            $q->where(fn ($w) => $w->where('reference', 'like', $term)->orWhere('contact_email', 'like', $term)->orWhere('contact_name', 'like', $term)->orWhere('contact_phone', 'like', $term));
        }

        return $this->page($q->paginate(20), fn (Booking $b) => [
            'reference' => $b->reference,
            'status' => $b->status,
            'tour' => $b->tour->title,
            'departure' => $b->batch->starts_on->toDateString(),
            'traveller_count' => $b->traveller_count,
            'total_amount' => $b->total_amount,
            'contact_name' => $b->contact_name,
            'contact_email' => $b->contact_email,
            'created_at' => $b->created_at->toIso8601String(),
        ]);
    }

    public function show(string $reference): JsonResponse
    {
        $b = Booking::query()->where('reference', $reference)->with(['tour', 'batch', 'variant', 'milestones', 'travellers', 'user'])->firstOrFail();

        return response()->json(['data' => [
            'booking' => (new BookingResource($b))->resolve(),
            'customer' => ['id' => $b->user->id, 'name' => $b->user->name, 'email' => $b->user->email, 'phone' => $b->user->phone],
            'refunds' => Refund::query()->where('booking_id', $b->id)->get(['id', 'amount', 'status', 'reference', 'processed_at']),
            'credit_notes' => CreditNote::query()->where('source_booking_id', $b->id)->get(['id', 'code', 'amount', 'status', 'expires_on']),
        ]]);
    }

    public function payments(Request $request): JsonResponse
    {
        $q = PaymentMilestone::query()->with('booking:id,reference,contact_name')->where('status', 'paid')->latest('paid_at');

        return $this->page($q->paginate(25), fn (PaymentMilestone $m) => [
            'id' => $m->id,
            'booking' => $m->booking->reference,
            'customer' => $m->booking->contact_name,
            'label' => $m->label,
            'amount' => $m->amount,
            'payment_id' => $m->gateway_payment_id,
            'paid_at' => $m->paid_at?->toIso8601String(),
        ]);
    }
}
