<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Tour;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;

/**
 * Read-only overview of the tag-driven landing pages (config/collections.php). Editing which
 * tours belong to a category happens on the tour itself (Admin > Tours > tags), not here —
 * this just gives staff a single place to see what is (and isn't) in each category, including
 * drafts, which the public /collections endpoint excludes.
 */
class TourCategoryController extends Controller
{
    public function index(): JsonResponse
    {
        $categories = collect(config('collections'))->map(function (array $c, string $slug) {
            $tours = $this->tagged($c['tag'])->with('destination:id,name')->orderByDesc('featured')->orderBy('title')->get();

            return [
                'slug' => $slug,
                'title' => $c['title'],
                'tag' => $c['tag'],
                'intro' => $c['intro'],
                'tours_count' => $tours->count(),
                'published_count' => $tours->where('status', 'published')->count(),
                'tours' => $tours->map(fn (Tour $t) => [
                    'id' => $t->id,
                    'title' => $t->title,
                    'slug' => $t->slug,
                    'status' => $t->status,
                    'destination' => $t->destination->name,
                ])->values(),
            ];
        })->values();

        return response()->json(['data' => $categories]);
    }

    /** @return Builder<Tour> */
    private function tagged(string $tag): Builder
    {
        return Tour::query()->whereJsonContains('tags', $tag);
    }
}
