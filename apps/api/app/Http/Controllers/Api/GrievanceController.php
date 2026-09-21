<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Grievance;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class GrievanceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $items = Grievance::query()->where('user_id', $request->user()->id)->latest()->get();

        return response()->json(['data' => $items->map(fn (Grievance $g) => $this->present($g))]);
    }

    public function show(Request $request, string $reference): JsonResponse
    {
        $g = Grievance::query()->where('user_id', $request->user()->id)->where('reference', $reference)->firstOrFail();

        return response()->json(['data' => $this->present($g)]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'subject' => 'required|string|max:160',
            'description' => 'required|string|max:5000',
            'booking_reference' => 'nullable|string|max:16',
        ]);

        $booking = null;
        if (! empty($data['booking_reference'])) {
            $booking = Booking::query()->where('user_id', $request->user()->id)->where('reference', $data['booking_reference'])->first();
            if (! $booking) {
                return response()->json(['message' => 'Booking not found.', 'errors' => ['booking_reference' => ['Booking not found.']]], 422);
            }
        }

        $cfg = config('booking.grievance');
        $g = Grievance::create([
            'reference' => 'GR'.strtoupper(Str::random(7)),
            'user_id' => $request->user()->id,
            'booking_id' => $booking?->id,
            'subject' => $data['subject'],
            'description' => $data['description'],
            'stage' => 1,
            'status' => 'open',
            'ack_due_at' => now()->addHours((int) $cfg['acknowledge_hours']),
            'resolve_by' => now()->addDays((int) $cfg['resolve_days']),
            'statutory_deadline' => now()->addDays((int) $cfg['statutory_days']),
        ]);

        return response()->json(['data' => $this->present($g)], 201);
    }

    /** @return array<string, mixed> */
    private function present(Grievance $g): array
    {
        return [
            'reference' => $g->reference,
            'subject' => $g->subject,
            'description' => $g->description,
            'booking_reference' => $g->booking_id ? Booking::query()->whereKey($g->booking_id)->value('reference') : null,
            'stage' => $g->stage,
            'status' => $g->status,
            'officer_name' => $g->officer_name,
            'created_at' => $g->created_at->toIso8601String(),
            'acknowledged_at' => $g->acknowledged_at?->toIso8601String(),
            'ack_due_at' => $g->ack_due_at->toIso8601String(),
            'resolve_by' => $g->resolve_by->toIso8601String(),
            'statutory_deadline' => $g->statutory_deadline->toIso8601String(),
            'resolved_at' => $g->resolved_at?->toIso8601String(),
        ];
    }
}
