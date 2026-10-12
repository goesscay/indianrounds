<?php

namespace Tests\Feature;

use App\Models\Destination;
use App\Models\Tour;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OffersFilterTest extends TestCase
{
    use RefreshDatabase;

    private function tour(string $slug, array $attrs = []): Tour
    {
        $d = Destination::query()->firstOrCreate(['slug' => 'goa'], ['name' => 'Goa', 'region' => 'india']);

        return Tour::create($attrs + [
            'destination_id' => $d->id, 'slug' => $slug, 'title' => ucfirst($slug), 'duration_nights' => 3, 'tour_type' => 'custom', 'haul_class' => 'short',
            'base_price' => 10000, 'original_price' => null, 'show_price' => true, 'status' => 'published',
        ]);
    }

    public function test_offers_lists_only_shown_prices_below_the_old_price_biggest_saving_first(): void
    {
        $this->tour('small-saving', ['base_price' => 9000, 'original_price' => 10000]);
        $this->tour('big-saving', ['base_price' => 6000, 'original_price' => 10000]);
        $this->tour('no-old-price', ['base_price' => 5000]);
        $this->tour('same-price', ['base_price' => 5000, 'original_price' => 5000]);
        $this->tour('hidden-price', ['base_price' => 1000, 'original_price' => 9000, 'show_price' => false]);
        $this->tour('quote-only', ['base_price' => null, 'original_price' => 9000]);
        $this->tour('draft-offer', ['base_price' => 1000, 'original_price' => 9000, 'status' => 'draft']);

        $slugs = array_column($this->getJson('/api/v1/tours?offers=1&sort=saving')->assertOk()->json('data'), 'slug');

        $this->assertSame(['big-saving', 'small-saving'], $slugs);
    }

    public function test_without_the_offers_option_everything_is_listed(): void
    {
        $this->tour('one');
        $this->tour('two', ['base_price' => 4000, 'original_price' => 5000]);

        $this->assertCount(2, $this->getJson('/api/v1/tours')->assertOk()->json('data'));
    }
}
