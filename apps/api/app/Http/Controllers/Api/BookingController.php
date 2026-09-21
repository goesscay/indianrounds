<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\BookingResource;
use App\Models\Booking;
use App\Services\BookingService;
use App\Services\InvoiceBuilder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class BookingController extends Controller
{
    public function store(Request $request, BookingService $bookings): JsonResponse
    {
        $max = (int) config('booking.max_travellers');

        $data = $request->validate([
            'tour_slug' => 'required|string|exists:tours,slug',
            'batch_id' => 'required|integer',
            'variant_id' => 'nullable|integer',
            'gst_state' => ['required', Rule::in(config('booking.states'))],
            'contact.name' => 'required|string|max:120',
            'contact.phone' => 'required|string|regex:/^\d{10,15}$/',
            'contact.email' => 'required|email|max:255',
            'travellers' => "required|array|min:1|max:{$max}",
            'travellers.*.name' => 'required|string|max:120',
            'travellers.*.age' => 'nullable|integer|min:0|max:120',
            'travellers.*.gender' => 'nullable|in:male,female,other',
        ]);

        $booking = $bookings->create($request->user(), $data);

        return (new BookingResource($booking))->response()->setStatusCode(201);
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        return BookingResource::collection(
            Booking::query()->where('user_id', $request->user()->id)
                ->with(['tour', 'batch', 'variant', 'milestones', 'travellers'])
                ->latest()->get()
        );
    }

    public function show(Request $request, string $reference): BookingResource
    {
        return new BookingResource($this->owned($request, $reference));
    }

    public function invoice(Request $request, string $reference, InvoiceBuilder $invoices): JsonResponse
    {
        return response()->json(['data' => $invoices->build($this->owned($request, $reference))]);
    }

    private function owned(Request $request, string $reference): Booking
    {
        return Booking::query()
            ->where('user_id', $request->user()->id)
            ->where('reference', $reference)
            ->with(['tour', 'batch', 'variant', 'milestones', 'travellers'])
            ->firstOrFail();
    }
}
