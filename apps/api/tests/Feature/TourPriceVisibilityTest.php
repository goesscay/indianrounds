<?php

namespace Tests\Feature;

use App\Models\Batch;
use App\Models\Category;
use App\Models\Destination;
use App\Models\Tour;
use App\Models\TourVariant;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TourPriceVisibilityTest extends TestCase
{
    use RefreshDatabase;

    private Destination $dest;

    protected function setUp(): void
    {
        parent::setUp();
        $this->dest = Destination::create(['name' => 'Thailand', 'slug' => 'thailand', 'region' => 'international']);
    }

    private function tour(string $slug, ?int $price, bool $show = true, ?int $original = null): Tour
    {
        return Tour::create([
            'destination_id' => $this->dest->id, 'slug' => $slug, 'title' => ucfirst($slug), 'duration_nights' => 3, 'base_price' => $price,
            'original_price' => $original, 'show_price' => $show, 'status' => 'published',
        ]);
    }

    private function superAdmin(): void
    {
        $this->seed(RbacSeeder::class);
        $u = User::factory()->create(['department' => null, 'staff_tier' => 'admin', 'is_active' => true]);
        $u->assignRole('super_admin');
        Sanctum::actingAs($u, ['staff']);
    }

    public function test_a_package_without_a_price_is_public_with_price_null(): void
    {
        $this->tour('no-price', null);

        $this->getJson('/api/v1/tours/no-price')->assertOk()->assertJsonPath('data.price', null)->assertJsonPath('data.original_price', null);
        $this->getJson('/api/v1/tours')->assertOk()->assertJsonPath('data.0.slug', 'no-price')->assertJsonPath('data.0.price', null);
        $this->getJson('/api/v1/destinations/thailand')->assertOk()->assertJsonPath('data.tours.0.price', null);
    }

    public function test_a_price_staff_have_hidden_never_leaves_the_server(): void
    {
        $t = $this->tour('hidden', 49999, false, 59999);
        TourVariant::create(['tour_id' => $t->id, 'label' => 'Twin', 'price' => 49999]);
        $this->tour('shown', 39999, true, 44999);

        $detail = $this->getJson('/api/v1/tours/hidden')->assertOk();
        $detail->assertJsonPath('data.price', null)->assertJsonPath('data.original_price', null)->assertJsonPath('data.variants', []);
        $this->assertStringNotContainsString('49999', (string) $detail->getContent());
        $this->assertStringNotContainsString('59999', (string) $detail->getContent());

        $list = $this->getJson('/api/v1/tours')->assertOk();
        $this->assertStringNotContainsString('49999', (string) $list->getContent());
        $this->getJson('/api/v1/tours/shown')->assertJsonPath('data.price', 39999)->assertJsonPath('data.original_price', 44999);
    }

    public function test_price_sorting_and_filters_only_use_visible_prices_and_put_enquiry_only_packages_last(): void
    {
        $this->tour('dear', 90000);
        $this->tour('cheap', 20000);
        $this->tour('none', null);
        $this->tour('hidden', 10000, false);

        $this->assertSame(['cheap', 'dear'], array_slice(collect($this->getJson('/api/v1/tours?sort=price_asc')->json('data'))->pluck('slug')->all(), 0, 2));
        $this->assertSame(['dear', 'cheap'], array_slice(collect($this->getJson('/api/v1/tours?sort=price_desc')->json('data'))->pluck('slug')->all(), 0, 2));
        $last = collect($this->getJson('/api/v1/tours?sort=price_desc')->json('data'))->pluck('slug')->slice(2)->sort()->values()->all();
        $this->assertSame(['hidden', 'none'], $last);

        $this->assertSame(['cheap'], collect($this->getJson('/api/v1/tours?max_price=50000')->json('data'))->pluck('slug')->all());
    }

    public function test_the_menu_starting_price_ignores_hidden_prices_and_can_be_empty(): void
    {
        $cat = Category::create(['menu' => 'destinations', 'destination_id' => $this->dest->id, 'name' => 'Beach', 'slug' => 'beach']);
        $cat->tours()->attach([$this->tour('hidden', 10000, false)->id, $this->tour('shown', 30000)->id]);
        $this->getJson('/api/v1/menus/destinations')->assertOk()->assertJsonPath('data.0.menu_starting_price', 30000);

        Tour::query()->where('slug', 'shown')->update(['base_price' => null]);
        $this->getJson('/api/v1/menus/destinations')->assertOk()->assertJsonPath('data.0.menu_starting_price', null);
    }

    public function test_an_enquiry_only_package_cannot_be_booked_online(): void
    {
        $user = User::factory()->create();
        foreach ([['no-price', null, true], ['hidden', 25000, false]] as [$slug, $price, $show]) {
            $t = $this->tour($slug, $price, $show);
            $batch = Batch::create(['tour_id' => $t->id, 'starts_on' => now()->addDays(40), 'ends_on' => now()->addDays(43), 'capacity' => 10, 'status' => 'open']);

            $this->actingAs($user, 'sanctum')->postJson('/api/v1/bookings', [
                'tour_slug' => $slug, 'batch_id' => $batch->id, 'gst_state' => 'Tamil Nadu',
                'contact' => ['name' => 'Asha', 'phone' => '9876543210', 'email' => 'a@example.com'],
                'travellers' => [['name' => 'Asha', 'age' => 30, 'gender' => 'female']],
            ])->assertUnprocessable()->assertJsonValidationErrors('tour_slug');
            $this->assertSame(0, $batch->fresh()->seats_booked);
        }
    }

    public function test_staff_can_create_a_package_without_a_price_and_toggle_whether_it_is_shown(): void
    {
        $this->superAdmin();

        $id = $this->postJson('/api/v1/admin/tours', ['destination_id' => $this->dest->id, 'title' => 'On Request', 'duration_nights' => 4, 'status' => 'published'])
            ->assertCreated()->json('data.id');
        $this->assertNull(Tour::query()->findOrFail($id)->base_price);
        $this->assertTrue(Tour::query()->findOrFail($id)->show_price);

        $this->putJson("/api/v1/admin/tours/{$id}", ['base_price' => 55000, 'show_price' => false])->assertOk();
        $this->getJson('/api/v1/admin/tours/'.$id)->assertOk()->assertJsonPath('data.base_price', 55000)->assertJsonPath('data.show_price', false);
        $this->getJson('/api/v1/tours/on-request')->assertOk()->assertJsonPath('data.price', null);

        $this->putJson("/api/v1/admin/tours/{$id}", ['show_price' => true])->assertOk();
        $this->getJson('/api/v1/tours/on-request')->assertOk()->assertJsonPath('data.price', 55000);

        $this->putJson("/api/v1/admin/tours/{$id}", ['base_price' => null])->assertOk();
        $this->getJson('/api/v1/tours/on-request')->assertOk()->assertJsonPath('data.price', null);
    }
}
