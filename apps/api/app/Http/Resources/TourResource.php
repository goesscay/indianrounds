<?php

namespace App\Http\Resources;

use App\Models\Tour;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Tour */
class TourResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $data = [
            'id' => $this->id,
            'slug' => $this->slug,
            'title' => $this->title,
            'summary' => $this->summary,
            'tour_type' => $this->tour_type,
            'haul_class' => $this->haul_class,
            'duration_nights' => $this->duration_nights,
            'duration_days' => $this->duration_days,
            // Null means "price on request": no price set, or staff chose not to show it. A hidden price never leaves the server.
            'price' => $this->priceVisible() ? $this->base_price : null,
            'original_price' => $this->priceVisible() ? $this->original_price : null,
            'image_url' => $this->image_url,
            'featured' => $this->featured,
            'tags' => $this->tags ?? [],
            'destination' => $this->whenLoaded('destination', fn () => [
                'name' => $this->destination->name,
                'slug' => $this->destination->slug,
                'region' => $this->destination->region,
            ]),
            'next_batch' => $this->whenLoaded('batches', function () {
                $next = $this->batches->first(fn ($b) => $b->is_open);

                return $next ? [
                    'starts_on' => $next->starts_on->toDateString(),
                    'seats_left' => $next->seats_left,
                ] : null;
            }),
        ];

        if ($request->routeIs('tours.show')) {
            $data += [
                'pickup' => $this->pickup,
                'drop_point' => $this->drop_point,
                'overview' => $this->overview,
                'highlights' => $this->highlights ?? [],
                'itinerary' => $this->itinerary ?? [],
                'inclusions' => $this->inclusions ?? [],
                'exclusions' => $this->exclusions ?? [],
                'notes' => $this->notes ?? [],
                'must_carry' => $this->must_carry ?? [],
                'gallery' => $this->gallery ?? [],
                'variants' => ($this->priceVisible() ? $this->variants : collect())->map(fn ($v) => [
                    'id' => $v->id,
                    'label' => $v->label,
                    'price' => $v->price,
                    'original_price' => $v->original_price,
                ])->values(),
                'batches' => BatchResource::collection($this->batches),
            ];
        }

        return $data;
    }
}
