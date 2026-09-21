<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ApprovalRequest;
use App\Models\Booking;
use App\Models\Grievance;
use App\Models\Lead;
use App\Models\PaymentMilestone;
use App\Models\Refund;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    /** Only metrics the signed-in staff member is permitted to see are returned. */
    public function __invoke(Request $request): JsonResponse
    {
        $u = $request->user();
        $m = [];

        if ($u->hasPermissionTo('bookings.view')) {
            $m['bookings_confirmed'] = Booking::query()->where('status', 'confirmed')->count();
            $m['bookings_pending'] = Booking::query()->where('status', 'pending_payment')->count();
            $m['departures_next_30_days'] = Booking::query()->where('status', 'confirmed')
                ->whereHas('batch', fn ($b) => $b->whereBetween('starts_on', [now()->toDateString(), now()->addDays(30)->toDateString()]))->count();
        }
        if ($u->hasPermissionTo('payments.view')) {
            $m['collected_total'] = (int) PaymentMilestone::query()->where('status', 'paid')->sum('amount');
            $m['collected_30_days'] = (int) PaymentMilestone::query()->where('status', 'paid')->where('paid_at', '>=', now()->subDays(30))->sum('amount');
            $m['overdue_payments'] = PaymentMilestone::query()->where('status', 'due')->whereDate('due_on', '<', now()->toDateString())
                ->whereHas('booking', fn ($b) => $b->where('status', 'confirmed'))->count();
        }
        if ($u->hasPermissionTo('leads.view')) {
            $m['leads_new'] = Lead::query()->where('status', 'new')->count();
        }
        if ($u->hasPermissionTo('refunds.view')) {
            $m['refunds_pending'] = Refund::query()->whereIn('status', ['pending', 'pending_approval'])->count();
        }
        if ($u->hasPermissionTo('grievances.view')) {
            $m['grievances_open'] = Grievance::query()->where('status', 'open')->count();
            $m['grievances_ack_overdue'] = Grievance::query()->where('status', 'open')->whereNull('acknowledged_at')->where('ack_due_at', '<', now())->count();
        }
        if ($u->hasPermissionTo('approvals.decide')) {
            $m['approvals_pending'] = ApprovalRequest::query()->where('status', 'pending')->count();
        }

        return response()->json(['data' => $m]);
    }
}
