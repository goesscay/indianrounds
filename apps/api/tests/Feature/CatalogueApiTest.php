<?php

namespace Tests\Feature;

use Database\Seeders\CatalogueSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CatalogueApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CatalogueSeeder::class);
    }

    public function test_destinations_list_includes_tour_counts(): void
    {
        $this->getJson('/api/v1/destinations?featured=1')
            ->assertOk()
            ->assertJsonPath('data.0.slug', 'india')
            ->assertJsonStructure(['data' => [['name', 'slug', 'starting_price', 'tours_count']]]);
    }

    public function test_tours_can_be_filtered_by_destination_and_price(): void
    {
        $response = $this->getJson('/api/v1/tours?destination=europe&max_price=145000')->assertOk();

        $slugs = collect($response->json('data'))->pluck('slug');
        $this->assertContains('paris-swiss-alps', $slugs);
        $this->assertNotContains('europe-highlights', $slugs);
    }

    public function test_tours_sort_by_price(): void
    {
        $prices = collect($this->getJson('/api/v1/tours?sort=price_asc&per_page=24')->json('data'))->pluck('price');

        $this->assertSame($prices->sort()->values()->all(), $prices->values()->all());
    }

    public function test_tour_detail_has_itinerary_variants_and_batches(): void
    {
        $this->getJson('/api/v1/tours/ladakh-circuit')
            ->assertOk()
            ->assertJsonCount(3, 'data.variants')
            ->assertJsonStructure(['data' => ['itinerary', 'inclusions', 'batches' => [['starts_on', 'seats_left', 'status']]]]);
    }

    public function test_unknown_tour_returns_404(): void
    {
        $this->getJson('/api/v1/tours/does-not-exist')->assertNotFound();
    }

    public function test_batches_endpoint_marks_sold_out_batches(): void
    {
        $batches = $this->getJson('/api/v1/tours/kashmir-delight/batches')->assertOk()->json('data.batches');

        $this->assertContains('sold_out', collect($batches)->pluck('status')->all());
        $this->assertContains('open', collect($batches)->pluck('status')->all());
    }

    public function test_callback_lead_is_stored_and_validated(): void
    {
        $this->postJson('/api/v1/leads/callback', ['name' => 'Asha', 'phone' => '9876543210', 'country_code' => '+91'])
            ->assertCreated();
        $this->assertDatabaseHas('leads', ['name' => 'Asha', 'source' => 'callback']);

        $this->postJson('/api/v1/leads/callback', ['name' => '', 'phone' => 'abc'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'phone']);
    }

    public function test_testimonials_are_returned(): void
    {
        $this->getJson('/api/v1/testimonials')->assertOk()->assertJsonCount(3, 'data');
    }
}
