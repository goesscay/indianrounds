<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Category;
use App\Models\Destination;
use App\Models\Tour;
use App\Models\User;
use Database\Seeders\CatalogueSeeder;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use Tests\TestCase;

class ReplaceDestinationsTest extends TestCase
{
    use RefreshDatabase;

    private const SEASON = 'Oct–Mar | Burj Khalifa, Dubai Mall | Peak activities: outdoor sightseeing, desert safari.';

    /** @var list<string> */
    private array $tmp = [];

    protected function tearDown(): void
    {
        array_map('unlink', array_filter($this->tmp, 'is_file'));
        parent::tearDown();
    }

    /** @param list<list<string>> $rows */
    private function workbook(array $rows, ?array $headers = null): string
    {
        $book = new Spreadsheet;
        $sheet = $book->getActiveSheet();
        $sheet->setTitle('Tour Packages');
        foreach ($headers ?? ['Country', 'Destination Name', 'Tagline', 'On Season', 'Off Season', 'Mid Season'] as $i => $h) {
            $sheet->setCellValue([$i + 1, 1], $h);
        }
        foreach ($rows as $r => $row) {
            foreach ($row as $c => $v) {
                $sheet->setCellValue([$c + 1, $r + 2], $v);
            }
        }
        $path = tempnam(sys_get_temp_dir(), 'dst').'.xlsx';
        IOFactory::createWriter($book, 'Xlsx')->save($path);
        $this->tmp[] = $path;

        return $path;
    }

    private function dubai(): array
    {
        return ['United Arab Emirates', 'Dubai, Abu Dhabi, Sharjah', 'Skylines and desert horizons.', self::SEASON, 'Jun–Sep | Dubai Mall | Peak activities: indoor attractions.', 'Apr–May | Dubai Frame | Peak activities: beaches at dawn.'];
    }

    public function test_it_replaces_every_destination_with_the_workbook_rows(): void
    {
        $this->seed(CatalogueSeeder::class);
        $this->assertGreaterThan(5, Destination::query()->count());
        $this->assertGreaterThan(5, Tour::query()->count());

        $path = $this->workbook([$this->dubai(), ['Georgia', 'Tbilisi, Kakheti', 'Wander the Caucasus.', self::SEASON, self::SEASON, self::SEASON]]);
        $this->artisan('catalogue:replace-destinations', ['file' => $path])->assertSuccessful();

        $this->assertSame(['united-arab-emirates', 'georgia'], Destination::query()->orderBy('sort')->pluck('slug')->all());
        $this->assertSame(0, Tour::query()->count(), 'old packages are removed with their destinations');
        $this->assertSame(0, Category::query()->count());

        $uae = Destination::query()->where('slug', 'united-arab-emirates')->firstOrFail();
        $this->assertSame('United Arab Emirates', $uae->name);
        $this->assertSame('international', $uae->region);
        $this->assertSame('Skylines and desert horizons.', $uae->tagline);
        $this->assertSame('Oct–Mar', $uae->best_time);
        $this->assertTrue($uae->featured);
        $this->assertSame(1, $uae->sort);
        $this->assertSame('Dubai, Abu Dhabi, Sharjah', $uae->seo_content['places']);
        $this->assertSame(['months' => 'Oct–Mar', 'places' => 'Burj Khalifa, Dubai Mall', 'activities' => 'outdoor sightseeing, desert safari.'], $uae->seo_content['seasons']['on']);
        $this->assertSame('Jun–Sep', $uae->seo_content['seasons']['off']['months']);
        $this->assertSame('Apr–May', $uae->seo_content['seasons']['mid']['months']);
        $this->assertSame('/photos/destinations/dubai.jpg', $uae->image_url, 'reuses the existing Dubai photo');
        $this->assertSame('/photos/destinations/georgia.jpg', Destination::query()->where('slug', 'georgia')->value('image_url'));
    }

    public function test_the_public_api_serves_the_new_destinations_with_their_season_data(): void
    {
        $this->artisan('catalogue:replace-destinations', ['file' => $this->workbook([$this->dubai()])])->assertSuccessful();

        $this->getJson('/api/v1/destinations')->assertOk()->assertJsonPath('data.0.name', 'United Arab Emirates');
        $this->getJson('/api/v1/destinations/united-arab-emirates')->assertOk()
            ->assertJsonPath('data.seo_content.seasons.on.months', 'Oct–Mar')
            ->assertJsonPath('data.seo_content.places', 'Dubai, Abu Dhabi, Sharjah');
    }

    public function test_a_dry_run_changes_nothing(): void
    {
        $this->seed(CatalogueSeeder::class);
        $before = Destination::query()->count();

        $this->artisan('catalogue:replace-destinations', ['file' => $this->workbook([$this->dubai()]), '--dry-run' => true])->assertSuccessful();

        $this->assertSame($before, Destination::query()->count());
        $this->assertSame(0, Destination::query()->where('slug', 'united-arab-emirates')->count());
    }

    public function test_it_refuses_to_run_when_a_booking_exists_on_a_package_it_would_remove(): void
    {
        $this->seed(CatalogueSeeder::class);
        $tour = Tour::query()->firstOrFail();
        $user = User::factory()->create();
        Booking::create([
            'reference' => 'IR123456', 'user_id' => $user->id, 'tour_id' => $tour->id, 'batch_id' => $tour->batches()->firstOrFail()->id, 'status' => 'confirmed', 'haul_class' => 'short',
            'traveller_count' => 1, 'unit_price' => 1000, 'subtotal' => 1000, 'gst_rate' => 0.05, 'gst_amount' => 50, 'total_amount' => 1050, 'gst_state' => 'Tamil Nadu',
            'contact_name' => 'A', 'contact_phone' => '9876543210', 'contact_email' => 'a@example.com',
        ]);
        $before = Destination::query()->count();

        $this->artisan('catalogue:replace-destinations', ['file' => $this->workbook([$this->dubai()])])->assertFailed();

        $this->assertSame($before, Destination::query()->count());
        $this->assertSame(1, Booking::query()->count());
    }

    public function test_bad_rows_are_reported_and_nothing_is_changed(): void
    {
        $this->seed(CatalogueSeeder::class);
        $before = Destination::query()->count();

        $path = $this->workbook([
            ['Thailand', 'Bangkok', '', 'not a season', self::SEASON, self::SEASON],
            ['Thailand', 'Phuket', 'Dup.', self::SEASON, self::SEASON, self::SEASON],
        ]);
        $this->artisan('catalogue:replace-destinations', ['file' => $path])
            ->expectsOutputToContain('Row 2 (Thailand): tagline is required')
            ->expectsOutputToContain('Row 2 (Thailand): the on season must look like')
            ->expectsOutputToContain('Row 3 (Thailand): duplicate country')
            ->assertFailed();

        $this->assertSame($before, Destination::query()->count());
    }

    public function test_the_wrong_workbook_layout_is_rejected(): void
    {
        $path = $this->workbook([$this->dubai()], ['Nation', 'Cities', 'Slogan', 'A', 'B', 'C']);

        $this->artisan('catalogue:replace-destinations', ['file' => $path])->expectsOutputToContain('Column 1 header should be "country"')->assertFailed();
        $this->artisan('catalogue:replace-destinations', ['file' => 'C:/nope/missing.xlsx'])->assertFailed();
    }

    private function superAdmin(): void
    {
        $this->seed(RbacSeeder::class);
        $u = User::factory()->create(['department' => null, 'staff_tier' => 'admin', 'is_active' => true]);
        $u->assignRole('super_admin');
        Sanctum::actingAs($u, ['staff']);
    }

    public function test_editing_a_destination_in_the_admin_keeps_its_season_data(): void
    {
        $this->artisan('catalogue:replace-destinations', ['file' => $this->workbook([$this->dubai()])])->assertSuccessful();
        $this->superAdmin();
        $id = Destination::query()->firstOrFail()->id;

        // The admin form only sends the overview: the places and seasons must survive.
        $this->putJson("/api/v1/admin/destinations/{$id}", ['tagline' => 'New tagline', 'seo_content' => ['overview' => 'Hand-written overview.']])->assertOk();

        $d = Destination::query()->findOrFail($id);
        $this->assertSame('New tagline', $d->tagline);
        $this->assertSame('Hand-written overview.', $d->seo_content['overview']);
        $this->assertSame('Dubai, Abu Dhabi, Sharjah', $d->seo_content['places']);
        $this->assertSame('Oct–Mar', $d->seo_content['seasons']['on']['months']);
    }

    public function test_seasons_can_be_edited_and_cleared_from_the_admin(): void
    {
        $this->artisan('catalogue:replace-destinations', ['file' => $this->workbook([$this->dubai()])])->assertSuccessful();
        $this->superAdmin();
        $id = Destination::query()->firstOrFail()->id;

        $this->putJson("/api/v1/admin/destinations/{$id}", ['seo_content' => ['seasons' => ['on' => ['months' => 'Nov–Feb', 'places' => 'Dubai', 'activities' => 'beaches'], 'off' => null, 'mid' => null]]])->assertOk();

        $seasons = Destination::query()->findOrFail($id)->seo_content['seasons'];
        $this->assertSame('Nov–Feb', $seasons['on']['months']);
        $this->assertArrayNotHasKey('off', $seasons);
        $this->assertArrayNotHasKey('mid', $seasons);
        $this->assertSame('Dubai, Abu Dhabi, Sharjah', Destination::query()->findOrFail($id)->seo_content['places']);

        $this->putJson("/api/v1/admin/destinations/{$id}", ['seo_content' => ['seasons' => ['on' => ['places' => 'no months given']]]])->assertUnprocessable()->assertJsonValidationErrors('seo_content.seasons.on.months');
    }

    public function test_the_destination_list_includes_the_on_season_months_for_cards(): void
    {
        $this->artisan('catalogue:replace-destinations', ['file' => $this->workbook([$this->dubai()])])->assertSuccessful();

        $this->getJson('/api/v1/destinations')->assertOk()->assertJsonPath('data.0.best_time', 'Oct–Mar');
    }
}
