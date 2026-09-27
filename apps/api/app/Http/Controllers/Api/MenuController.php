<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\TourResource;
use App\Models\Category;
use App\Models\Destination;
use App\Models\Tour;
use Illuminate\Http\JsonResponse;

/**
 * Browse the four menus (destinations, group-tours, weekend-escapes, honeymoon) as
 * country > category > packages. Only published packages count, and a country or category
 * with none is not listed.
 */
class MenuController extends Controller
{
    private function menu(string $menu): string
    {
        abort_unless(isset(Category::MENUS[$menu]), 404);

        return $menu;
    }

    /** @return array<string, mixed> */
    private function destination(Destination $d): array
    {
        return ['id' => $d->id, 'name' => $d->name, 'slug' => $d->slug, 'region' => $d->region, 'tagline' => $d->tagline,
            'image_url' => $d->image_url, 'starting_price' => $d->starting_price];
    }

    /** Countries that have at least one published package in this menu. */
    public function countries(string $menu): JsonResponse
    {
        $menu = $this->menu($menu);

        $tours = Tour::query()->published()->whereHas('categories', fn ($q) => $q->where('menu', $menu))
            ->selectRaw('destination_id, count(*) as n, min(base_price) as from_price')->groupBy('destination_id')->get()->keyBy('destination_id');

        $categoryCounts = Category::query()->where('menu', $menu)->whereHas('tours', fn ($q) => $q->published())
            ->selectRaw('destination_id, count(*) as n')->groupBy('destination_id')->pluck('n', 'destination_id');

        $data = Destination::query()->whereIn('id', $tours->keys())->orderBy('sort')->orderBy('name')->get()
            ->map(fn (Destination $d) => $this->destination($d) + [
                'tours_count' => (int) $tours[$d->id]->getAttribute('n'),
                'categories_count' => (int) ($categoryCounts[$d->id] ?? 0),
                'menu_starting_price' => (int) $tours[$d->id]->getAttribute('from_price'),
            ])->values();

        return response()->json(['menu' => ['slug' => $menu, 'title' => Category::MENUS[$menu]], 'data' => $data]);
    }

    /** The categories of one country in this menu. */
    public function country(string $menu, string $country): JsonResponse
    {
        $menu = $this->menu($menu);
        $destination = Destination::query()->where('slug', $country)->firstOrFail();

        $categories = Category::query()->where('menu', $menu)->where('destination_id', $destination->id)
            ->withCount(['tours' => fn ($q) => $q->published()])
            ->whereHas('tours', fn ($q) => $q->published())->orderBy('sort')->orderBy('name')->get();
        abort_if($categories->isEmpty(), 404);

        return response()->json([
            'menu' => ['slug' => $menu, 'title' => Category::MENUS[$menu]],
            'destination' => $this->destination($destination) + ['best_time' => $destination->best_time, 'about' => $destination->seo_content['overview'] ?? null],
            'data' => $categories->map(fn (Category $c) => [
                'name' => $c->name, 'slug' => $c->slug, 'description' => $c->description, 'tours_count' => (int) $c->getAttribute('tours_count'),
                'image_url' => $c->image_url ?? $c->tours()->published()->whereNotNull('image_url')->orderByDesc('featured')->value('image_url'),
            ])->values(),
        ]);
    }

    /** The packages in one category. */
    public function category(string $menu, string $country, string $category): JsonResponse
    {
        $menu = $this->menu($menu);
        $destination = Destination::query()->where('slug', $country)->firstOrFail();
        $cat = Category::query()->where('menu', $menu)->where('destination_id', $destination->id)->where('slug', $category)->firstOrFail();

        $tours = $cat->tours()->published()
            ->with(['destination', 'batches' => fn ($b) => $b->where('starts_on', '>=', now()->toDateString())->orderBy('starts_on')])
            ->orderByDesc('featured')->orderBy('base_price')->get();
        abort_if($tours->isEmpty(), 404);

        return response()->json([
            'menu' => ['slug' => $menu, 'title' => Category::MENUS[$menu]],
            'destination' => $this->destination($destination),
            'category' => ['name' => $cat->name, 'slug' => $cat->slug, 'description' => $cat->description, 'image_url' => $cat->image_url],
            'data' => TourResource::collection($tours),
        ]);
    }
}
