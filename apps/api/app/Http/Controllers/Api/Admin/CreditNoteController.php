<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Admin\Concerns\Paginates;
use App\Http\Controllers\Controller;
use App\Models\CreditNote;
use App\Services\AdminActions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CreditNoteController extends Controller
{
    use Paginates;

    public function index(Request $request): JsonResponse
    {
        $q = CreditNote::query()->with(['sourceBooking:id,reference', 'sourceBooking.user:id,name,email'])->latest('id');

        return $this->page($q->paginate(25), fn (CreditNote $n) => [
            'id' => $n->id,
            'code' => $n->code,
            'amount' => $n->amount,
            'status' => $n->effectiveStatus(),
            'issued_on' => $n->issued_on->toDateString(),
            'expires_on' => $n->expires_on->toDateString(),
            'booking' => $n->sourceBooking->reference,
            'customer' => $n->sourceBooking->user->name,
        ]);
    }

    public function store(Request $request, AdminActions $actions): JsonResponse
    {
        $data = $request->validate([
            'booking_reference' => 'required|string|max:16',
            'amount' => 'required|integer|min:1|max:1000000',
            'reason' => 'required|string|max:300',
        ]);

        $result = $actions->issueCreditNote($data, $request->user());

        return response()->json([
            'approval_required' => ! $result['done'],
            'message' => $result['done'] ? 'Credit note issued.' : 'Above your limit: sent to an Admin for approval.',
            'data' => $result['credit_note']?->only(['id', 'code', 'amount']),
        ], $result['done'] ? 201 : 202);
    }
}
