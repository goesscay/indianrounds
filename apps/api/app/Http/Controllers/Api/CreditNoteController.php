<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CreditNote;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CreditNoteController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $notes = CreditNote::query()
            ->where('user_id', $request->user()->id)
            ->with('sourceBooking.tour')
            ->latest()
            ->get()
            ->map(fn (CreditNote $n) => [
                'id' => $n->id,
                'code' => $n->code,
                'amount' => $n->amount,
                'currency' => 'INR',
                'issued_on' => $n->issued_on->toDateString(),
                'expires_on' => $n->expires_on->toDateString(),
                'status' => $n->effectiveStatus(),
                'source' => $n->sourceBooking->reference,
                'source_tour' => $n->sourceBooking->tour->title,
            ]);

        return response()->json(['data' => $notes]);
    }
}
