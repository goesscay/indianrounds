<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Destination;
use App\Models\Tour;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MenuApiTest extends TestCase
{
    use RefreshDatabase;

    private function tour(Destination $d, string $slug, int $price, string $status = 'published', bool $featured = false): Tour
    {
        return Tour::create(['destination_id' => $d->id, 'slug' => $slug, 'title' => ucfirst($slug), 'duration_nights' => 3, 'base_price' => $price, 'status' => $status, 'featured' => $featured, 'image_url' => "/img/{$slug}.jpg"]);
    }

    private function setUpData(): array
    {
        $thai = Destination::create(['name' => 'Thailand', 'slug' => 'thailand', 'region' => 'international', 'sort' => 1]);
        $bali = Destination::create(['name' => 'Bali', 'slug' => 'bali', 'region' => 'international', 'sort' => 2]);
        $beach = Category::create(['menu' => 'destinations', 'destination_id' => $thai->id, 'name' => 'Beach Holidays', 'slug' => 'beach-holidays', 'sort' => 1]);
        $honey = Category::create(['menu' => 'honeymoon', 'destination_id' => $thai->id, 'name' => 'Romantic Escapes', 'slug' => 'romantic-escapes', 'image_url' => '/cat.jpg']);
        $empty = Category::create(['menu' => 'destinations', 'destination_id' => $bali->id, 'name' => 'Empty', 'slug' => 'empty']);
        $cheap = $this->tour($thai, 'phuket', 30000);
        $dear = $this->tour($thai, 'krabi', 50000, featured: true);
        $draft = $this->tour($thai, 'secret', 10000, 'draft');
        $beach->tours()->attach([$cheap->id, $dear->id, $draft->id]);
        $honey->tours()->attach([$dear->id]);
        $empty->tours()->attach([$draft->id]);

        return compact('thai', 'bali');
    }

    public function test_a_menu_lists_only_countries_with_published_packages(): void
    {
        $this->setUpData();

        $r = $this->getJson('/api/v1/menus/destinations')->assertOk();
        $r->assertJsonPath('menu.title', 'Destinations');
        $this->assertSame(['thailand'], collect($r->json('data'))->pluck('slug')->all());
        $r->assertJsonPath('data.0.tours_count', 2);
        $r->assertJsonPath('data.0.menu_starting_price', 30000);

        $this->getJson('/api/v1/menus/honeymoon')->assertJsonPath('data.0.tours_count', 1);
        $this->getJson('/api/v1/menus/group-tours')->assertOk()->assertJsonPath('data', []);
    }

    public function test_an_unknown_menu_is_404(): void
    {
        $this->getJson('/api/v1/menus/nonsense')->assertNotFound();
        $this->getJson('/api/v1/menus/nonsense/thailand')->assertNotFound();
    }

    public function test_a_country_lists_its_categories_with_counts_and_an_image_fallback(): void
    {
        $this->setUpData();

        $r = $this->getJson('/api/v1/menus/destinations/thailand')->assertOk();
        $r->assertJsonPath('destination.name', 'Thailand');
        $r->assertJsonPath('data.0.slug', 'beach-holidays');
        $r->assertJsonPath('data.0.tours_count', 2);
        $r->assertJsonPath('data.0.image_url', '/img/krabi.jpg'); // no category image: falls back to the featured package's photo

        $this->getJson('/api/v1/menus/honeymoon/thailand')->assertJsonPath('data.0.image_url', '/cat.jpg');
        $this->getJson('/api/v1/menus/destinations/bali')->assertNotFound(); // only a category with no published package
        $this->getJson('/api/v1/menus/destinations/nowhere')->assertNotFound();
    }

    public function test_a_category_lists_published_packages_featured_first(): void
    {
        $this->setUpData();

        $r = $this->getJson('/api/v1/menus/destinations/thailand/beach-holidays')->assertOk();
        $r->assertJsonPath('category.name', 'Beach Holidays');
        $this->assertSame(['krabi', 'phuket'], collect($r->json('data'))->pluck('slug')->all());

        $this->getJson('/api/v1/menus/destinations/thailand/missing')->assertNotFound();
        $this->getJson('/api/v1/menus/group-tours/thailand/beach-holidays')->assertNotFound(); // wrong menu
    }
}
