<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Lead;
use App\Models\PaymentMilestone;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Read-only aggregate reports. Grouping is done in PHP rather than DB-specific date
 * functions (DATE_TRUNC / strftime) so the same code runs on Postgres in production and
 * SQLite in tests. These are the admin's own numbers, not analytics for the public site.
 */
class ReportController extends Controller
{
    private const MONTHS = 6;

    /** @return Collection<int, array{key: string, label: string}> the last N months, oldest first */
    private function months(): Collection
    {
        return collect(range(self::MONTHS - 1, 0))->map(fn ($i) => now()->subMonths($i))
            ->map(fn (Carbon $d) => ['key' => $d->format('Y-m'), 'label' => $d->format('M Y')]);
    }

    /**
     * @param  Collection<int, Carbon|null>  $dates
     * @return Collection<int, array{month: string, count: int}>
     */
    private function bucketByMonth(Collection $dates): Collection
    {
        $counts = $dates->filter()->countBy(fn (Carbon $d) => $d->format('Y-m'));

        return $this->months()->map(fn ($m) => ['month' => $m['label'], 'count' => (int) ($counts[$m['key']] ?? 0)]);
    }

    public function bookings(Request $request): JsonResponse
    {
        $bookings = Booking::query()->with('tour.destination:id,name')->where('created_at', '>=', now()->subMonths(self::MONTHS))->get();
        $all = Booking::query()->select('id', 'status', 'haul_class', 'traveller_count', 'total_amount', 'created_at')->get();
        $confirmed = $all->where('status', 'confirmed');

        $byMonth = $this->bucketByMonth($bookings->pluck('created_at'))->map(function ($row, $i) use ($bookings) {
            $monthKey = $this->months()[$i]['key'];
            $revenue = $bookings->where('status', 'confirmed')->filter(fn ($b) => $b->created_at->format('Y-m') === $monthKey)->sum('total_amount');

            return $row + ['revenue' => (int) $revenue];
        })->values();

        $topDestinations = $bookings->where('status', 'confirmed')
            ->groupBy(fn (Booking $b) => $b->tour->destination->name ?? 'Unknown')
            ->map(fn ($rows, $name) => ['destination' => $name, 'count' => $rows->count(), 'revenue' => (int) $rows->sum('total_amount')])
            ->sortByDesc('revenue')->take(8)->values();

        return response()->json(['data' => [
            'summary' => [
                'total' => $all->count(),
                'confirmed' => $confirmed->count(),
                'pending' => $all->where('status', 'pending_payment')->count(),
                'cancelled' => $all->where('status', 'cancelled')->count(),
                'expired' => $all->where('status', 'expired')->count(),
                'total_travellers' => (int) $confirmed->sum('traveller_count'),
                'total_revenue' => (int) $confirmed->sum('total_amount'),
                'avg_booking_value' => $confirmed->count() ? (int) round($confirmed->avg('total_amount')) : 0,
            ],
            'by_status' => collect(['pending_payment', 'confirmed', 'cancelled', 'expired'])
                ->map(fn ($s) => ['status' => $s, 'count' => $all->where('status', $s)->count()])->values(),
            'by_haul_class' => collect(['short', 'long'])
                ->map(fn ($h) => ['haul_class' => $h, 'count' => $all->where('haul_class', $h)->count()])->values(),
            'by_month' => $byMonth,
            'top_destinations' => $topDestinations,
        ]]);
    }

    public function sales(Request $request): JsonResponse
    {
        $q = Lead::query();
        if (! $request->user()->hasRole('super_admin')) {
            // Mirror LeadController's department scoping so staff only see their own team's conversion numbers.
            $sources = match ($request->user()->department) {
                'corporate' => ['corporate'],
                'personalised' => ['custom'],
                'sales' => $request->user()->staff_tier === 'admin' ? null : ['callback', 'quote', 'contact'],
                default => null,
            };
            if ($sources !== null) {
                $q->whereIn('source', $sources);
            }
        }
        $leads = $q->get(['id', 'source', 'status', 'created_at']);

        $statuses = ['new', 'contacted', 'qualified', 'won', 'lost'];
        $won = $leads->where('status', 'won')->count();

        return response()->json(['data' => [
            'summary' => [
                'total' => $leads->count(),
                'new' => $leads->where('status', 'new')->count(),
                'won' => $won,
                'lost' => $leads->where('status', 'lost')->count(),
                'conversion_rate' => $leads->count() ? round($won / $leads->count() * 100, 1) : 0,
            ],
            'by_status' => collect($statuses)->map(fn ($s) => ['status' => $s, 'count' => $leads->where('status', $s)->count()])->values(),
            'by_source' => $leads->groupBy('source')->map(fn ($rows, $source) => ['source' => $source, 'count' => $rows->count()])->sortByDesc('count')->values(),
            'by_month' => $this->bucketByMonth($leads->pluck('created_at')),
        ]]);
    }

    public function payments(Request $request): JsonResponse
    {
        $milestones = PaymentMilestone::query()->select('id', 'status', 'amount', 'due_on', 'paid_at')->get();
        $paid = $milestones->where('status', 'paid');
        $due = $milestones->where('status', 'due');
        $overdue = $due->filter(fn (PaymentMilestone $m) => $m->due_on->isPast());

        return response()->json(['data' => [
            'summary' => [
                'total_collected' => (int) $paid->sum('amount'),
                'total_due' => (int) $due->sum('amount'),
                'overdue_amount' => (int) $overdue->sum('amount'),
                'overdue_count' => $overdue->count(),
                'milestones_paid' => $paid->count(),
                'milestones_due' => $due->count(),
            ],
            'by_status' => collect(['due', 'paid', 'cancelled'])->map(fn ($s) => [
                'status' => $s, 'count' => $milestones->where('status', $s)->count(), 'amount' => (int) $milestones->where('status', $s)->sum('amount'),
            ])->values(),
            'by_month' => $this->bucketByMonth($paid->pluck('paid_at'))->map(function ($row, $i) use ($paid) {
                $monthKey = $this->months()[$i]['key'];

                return $row + ['collected' => (int) $paid->filter(fn ($m) => $m->paid_at?->format('Y-m') === $monthKey)->sum('amount')];
            })->values(),
        ]]);
    }

    public function customers(Request $request): JsonResponse
    {
        $customers = User::query()->whereNull('staff_tier')->withCount('bookings')
            ->withSum(['bookings as total_spend' => fn ($b) => $b->where('status', 'confirmed')], 'total_amount')
            ->get(['id', 'name', 'email', 'created_at']);

        $repeat = $customers->filter(fn ($c) => $c->bookings_count > 1);

        return response()->json(['data' => [
            'summary' => [
                'total' => $customers->count(),
                'new_last_30_days' => $customers->filter(fn ($c) => $c->created_at?->gt(now()->subDays(30)))->count(),
                'repeat_customers' => $repeat->count(),
                'repeat_rate' => $customers->count() ? round($repeat->count() / $customers->count() * 100, 1) : 0,
            ],
            'by_month' => $this->bucketByMonth($customers->pluck('created_at')),
            'top_customers' => $customers->sortByDesc(fn ($c) => (int) $c->getAttribute('total_spend'))->take(10)->values()->map(fn ($c) => [
                'name' => $c->name, 'email' => $c->email, 'bookings_count' => $c->bookings_count, 'total_spend' => (int) $c->getAttribute('total_spend'),
            ]),
        ]]);
    }
}
