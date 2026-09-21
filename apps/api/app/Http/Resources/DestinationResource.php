<?php

namespace App\Http\Resources;

use App\Models\Destination;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Destination */
class DestinationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $data = [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'region' => $this->region,
            'tagline' => $this->tagline,
            'starting_price' => $this->starting_price,
            'image_url' => $this->image_url,
            'featured' => $this->featured,
            'tours_count' => $this->whenCounted('tours'),
        ];

        if ($request->routeIs('destinations.show')) {
            $data += [
                'best_time' => $this->best_time,
                'seo_content' => $this->seo_content ?? [],
                'tours' => TourResource::collection($this->whenLoaded('tours')),
            ];
        }

        return $data;
    }
}
