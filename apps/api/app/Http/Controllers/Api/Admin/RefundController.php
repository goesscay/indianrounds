<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Admin\Concerns\Paginates;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Refund;
use App\Services\AdminActions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class RefundController extends Controller
{
    use Paginates;

    public function index(Request $request): JsonResponse
    {
        $q = Refund::query()->latest('id');
        if ($request->filled('status')) {
            $q->where('status', $request->string('status'));
        }

        return $this->page($q->paginate(25), fn (Refund $r) => $this->present($r));
    }

    public function process(Request $request, Refund $refund, AdminActions $actions): JsonResponse
    {
        $data = $request->validate(['reference' => 'required|string|max:120']);
        $result = $actions->processRefund($refund, $request->user(), $data['reference']);

        return response()->json([
            'data' => $this->present($refund->fresh() ?? $refund),
            'approval_required' => ! $result['done'],
            'message' => $result['done'] ? 'Refund processed.' : 'Above your limit: sent to an Admin for approval.',
        ], $result['done'] ? 200 : 202);
    }

    public function reject(Request $request, Refund $refund): JsonResponse
    {
        $data = $request->validate(['notes' => 'required|string|max:500']);
        if ($refund->status !== 'pending') {
            throw ValidationException::withMessages(['refund' => 'Only pending refunds can be rejected.']);
        }
        $refund->update(['status' => 'rejected', 'notes' => $data['notes'], 'processed_by' => $request->user()->id, 'processed_at' => now()]);
        AuditLog::record('refund.rejected', $refund, ['status' => 'pending'], ['status' => 'rejected', 'notes' => $data['notes']]);

        return response()->json(['data' => $this->present($refund)]);
    }

    /** @return array<string, mixed> */
    private function present(Refund $r): array
    {
        return [
            'id' => $r->id,
            'booking_id' => $r->booking_id,
            'booking' => $r->booking()->value('reference'),
            'amount' => $r->amount,
            'status' => $r->status,
            'reference' => $r->reference,
            'notes' => $r->notes,
            'created_at' => $r->created_at?->toIso8601String(),
        ];
    }
}
