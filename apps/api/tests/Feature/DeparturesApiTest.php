<?php

namespace Tests\Feature;

use App\Models\Batch;
use App\Models\Destination;
use App\Models\Tour;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DeparturesApiTest extends TestCase
{
    use RefreshDatabase;

    private function tour(string $slug, array $attrs = []): Tour
    {
        $d = Destination::query()->firstOrCreate(['slug' => 'thailand'], ['name' => 'Thailand', 'region' => 'international']);

        return Tour::create($attrs + [
            'destination_id' => $d->id, 'slug' => $slug, 'title' => ucfirst($slug), 'duration_nights' => 4, 'tour_type' => 'group', 'haul_class' => 'long',
            'base_price' => 30000, 'original_price' => 33000, 'show_price' => true, 'status' => 'published', 'pickup' => 'Bangkok Airport', 'drop_point' => 'Bangkok Airport',
        ]);
    }

    private function batch(Tour $t, string $start, array $attrs = []): Batch
    {
        return Batch::create($attrs + ['tour_id' => $t->id, 'starts_on' => $start, 'ends_on' => date('Y-m-d', strtotime($start.' +4 days')), 'capacity' => 20, 'seats_booked' => 0, 'status' => 'open']);
    }

    public function test_it_lists_group_and_weekend_trips_with_their_open_departures_earliest_first(): void
    {
        $late = $this->tour('late-trip');
        $this->batch($late, now()->addDays(60)->toDateString());
        $early = $this->tour('early-trip');
        $this->batch($early, now()->addDays(10)->toDateString());
        $this->batch($early, now()->addDays(24)->toDateString(), ['seats_booked' => 17]);
        $weekend = $this->tour('weekend-trip', ['tour_type' => 'custom', 'tags' => ['weekend'], 'duration_nights' => 2]);
        $this->batch($weekend, now()->addDays(20)->toDateString());

        $data = $this->getJson('/api/v1/departures')->assertOk()->json('data');

        $this->assertSame(['early-trip', 'weekend-trip', 'late-trip'], array_column($data, 'slug'));
        $this->assertSame('weekend', $data[1]['kind']);
        $this->assertSame('group', $data[0]['kind']);
        $this->assertCount(2, $data[0]['departures']);
        $this->assertSame(3, $data[0]['departures'][1]['seats_left']);
        $this->assertSame(['name' => 'Thailand', 'slug' => 'thailand', 'region' => 'international'], $data[0]['destination']);
        $this->assertSame(30000, $data[0]['price']);
        $this->assertSame('Bangkok Airport', $data[0]['pickup']);
    }

    public function test_it_leaves_out_drafts_past_or_full_departures_and_non_fixed_trips(): void
    {
        $draft = $this->tour('draft-trip', ['status' => 'draft']);
        $this->batch($draft, now()->addDays(10)->toDateString());
        $past = $this->tour('past-trip');
        $this->batch($past, now()->subDays(3)->toDateString());
        $full = $this->tour('full-trip');
        $this->batch($full, now()->addDays(12)->toDateString(), ['seats_booked' => 20, 'status' => 'sold_out']);
        $custom = $this->tour('custom-trip', ['tour_type' => 'custom']);
        $this->batch($custom, now()->addDays(12)->toDateString());
        $ok = $this->tour('ok-trip');
        $this->batch($ok, now()->addDays(15)->toDateString());

        $this->assertSame(['ok-trip'], array_column($this->getJson('/api/v1/departures')->assertOk()->json('data'), 'slug'));
    }

    public function test_a_hidden_price_never_leaves_the_server(): void
    {
        $t = $this->tour('quiet-trip', ['show_price' => false]);
        $this->batch($t, now()->addDays(10)->toDateString());

        $row = $this->getJson('/api/v1/departures')->assertOk()->json('data.0');

        $this->assertNull($row['price']);
        $this->assertNull($row['original_price']);
        $this->assertStringNotContainsString('30000', (string) json_encode($row));
    }
}
