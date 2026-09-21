<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\TourResource;
use App\Models\Tour;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;

class CollectionController extends Controller
{
    public function index(): JsonResponse
    {
        $collections = collect(config('collections'))->map(fn (array $c, string $slug) => [
            'slug' => $slug,
            'title' => $c['title'],
            'tag' => $c['tag'],
            'intro' => $c['intro'],
            'tours_count' => $this->tagged($c['tag'])->count(),
        ])->values();

        return response()->json(['data' => $collections, 'tags' => collect(config('collections'))->pluck('tag')->values()]);
    }

    public function show(string $slug): JsonResponse
    {
        $c = config("collections.{$slug}");
        abort_if(! is_array($c), 404);

        $tours = $this->tagged($c['tag'])
            ->with(['destination', 'batches' => fn ($b) => $b->where('starts_on', '>=', now()->toDateString())->orderBy('starts_on')])
            ->orderByDesc('featured')->orderBy('base_price')->get();

        return response()->json(['data' => [
            'slug' => $slug,
            'title' => $c['title'],
            'intro' => $c['intro'],
            'tours' => TourResource::collection($tours)->resolve(),
        ]]);
    }

    /** @return Builder<Tour> */
    private function tagged(string $tag): Builder
    {
        return Tour::query()->published()->whereJsonContains('tags', $tag);
    }
}
