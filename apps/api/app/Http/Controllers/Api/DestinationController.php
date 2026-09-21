<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\DestinationResource;
use App\Models\Destination;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class DestinationController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Destination::query()
            ->withCount(['tours' => fn ($q) => $q->published()])
            ->orderBy('sort')
            ->orderBy('name');

        if ($request->filled('region')) {
            $query->where('region', $request->string('region'));
        }

        if ($request->boolean('featured')) {
            $query->where('featured', true);
        }

        return DestinationResource::collection($query->get());
    }

    public function show(string $slug): DestinationResource
    {
        $destination = Destination::query()
            ->where('slug', $slug)
            ->with(['tours' => fn ($q) => $q->published()->with(['destination', 'batches' => fn ($b) => $b->where('starts_on', '>=', now()->toDateString())->orderBy('starts_on')])->orderByDesc('featured')->orderBy('base_price')])
            ->firstOrFail();

        return new DestinationResource($destination);
    }
}
