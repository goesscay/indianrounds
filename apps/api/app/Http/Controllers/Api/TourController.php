<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\BatchResource;
use App\Http\Resources\TourResource;
use App\Models\Tour;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class TourController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'destination' => 'nullable|string|max:100',
            'region' => 'nullable|in:india,international',
            'type' => 'nullable|in:group,custom',
            'min_price' => 'nullable|integer|min:0',
            'max_price' => 'nullable|integer|min:0',
            'min_nights' => 'nullable|integer|min:0',
            'max_nights' => 'nullable|integer|min:0',
            'month' => 'nullable|date_format:Y-m',
            'q' => 'nullable|string|max:100',
            'featured' => 'nullable|boolean',
            'tag' => 'nullable|string|max:60',
            'sort' => 'nullable|in:popular,price_asc,price_desc,duration_asc,duration_desc',
            'per_page' => 'nullable|integer|min:1|max:24',
        ]);

        $today = now()->toDateString();

        $query = Tour::query()
            ->published()
            ->with([
                'destination',
                'batches' => fn ($b) => $b->where('starts_on', '>=', $today)->orderBy('starts_on'),
            ]);

        if (! empty($validated['destination'])) {
            $query->whereHas('destination', fn ($d) => $d->where('slug', $validated['destination']));
        }
        if (! empty($validated['region'])) {
            $query->whereHas('destination', fn ($d) => $d->where('region', $validated['region']));
        }
        if (! empty($validated['type'])) {
            $query->where('tour_type', $validated['type']);
        }
        if (isset($validated['min_price'])) {
            $query->where('show_price', true)->where('base_price', '>=', $validated['min_price']);
        }
        if (isset($validated['max_price'])) {
            $query->where('show_price', true)->where('base_price', '<=', $validated['max_price']);
        }
        if (isset($validated['min_nights'])) {
            $query->where('duration_nights', '>=', $validated['min_nights']);
        }
        if (isset($validated['max_nights'])) {
            $query->where('duration_nights', '<=', $validated['max_nights']);
        }
        if (! empty($validated['month'])) {
            [$year, $month] = array_map('intval', explode('-', $validated['month']));
            $query->whereHas('batches', fn ($b) => $b
                ->whereYear('starts_on', $year)
                ->whereMonth('starts_on', $month)
                ->where('status', 'open'));
        }
        if (! empty($validated['q'])) {
            $term = '%'.str_replace(['%', '_'], ['\\%', '\\_'], $validated['q']).'%';
            $query->where(fn ($w) => $w
                ->where('title', 'like', $term)
                ->orWhere('summary', 'like', $term)
                ->orWhereHas('destination', fn ($d) => $d->where('name', 'like', $term)));
        }
        if (! empty($validated['tag'])) {
            $query->whereJsonContains('tags', $validated['tag']);
        }
        if ($request->boolean('featured')) {
            $query->where('featured', true);
        }

        match ($validated['sort'] ?? 'popular') {
            'price_asc' => $query->orderByVisiblePrice(),
            'price_desc' => $query->orderByVisiblePrice('desc'),
            'duration_asc' => $query->orderBy('duration_nights'),
            'duration_desc' => $query->orderByDesc('duration_nights'),
            default => $query->orderByDesc('featured')->orderBy('id'),
        };

        return TourResource::collection($query->paginate($validated['per_page'] ?? 12)->withQueryString());
    }

    public function show(string $slug): TourResource
    {
        $tour = Tour::query()
            ->published()
            ->where('slug', $slug)
            ->with([
                'destination',
                'variants',
                'batches' => fn ($b) => $b->where('starts_on', '>=', now()->toDateString())->orderBy('starts_on'),
            ])
            ->firstOrFail();

        return new TourResource($tour);
    }

    public function batches(string $slug): array
    {
        $tour = Tour::query()->published()->where('slug', $slug)->with('variants')->firstOrFail();

        $batches = $tour->batches()
            ->where('starts_on', '>=', now()->toDateString())
            ->orderBy('starts_on')
            ->get();

        return [
            'data' => [
                'variants' => $tour->variants->map(fn ($v) => [
                    'id' => $v->id,
                    'label' => $v->label,
                    'price' => $v->price,
                    'original_price' => $v->original_price,
                ])->values(),
                'batches' => BatchResource::collection($batches)->resolve(),
            ],
        ];
    }
}
