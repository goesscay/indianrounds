<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Destination;
use App\Models\Tour;
use App\Services\CatalogueContent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CatalogueContentTest extends TestCase
{
    use RefreshDatabase;

    /** @return list<string> */
    private function lines(int $n): array
    {
        return array_map(fn (int $i) => "Line number {$i}", range(1, $n));
    }

    /** @return array<string, mixed> */
    private function entry(string $slug): array
    {
        return [
            'slug' => $slug, 'summary' => 'A summary.', 'highlights' => $this->lines(5), 'inclusions' => $this->lines(7), 'exclusions' => $this->lines(6),
            'notes' => $this->lines(4), 'must_carry' => $this->lines(3), 'pickup' => 'Airport', 'drop_point' => 'Airport', 'photo' => 'a', 'gallery' => ['b', 'c'],
        ];
    }

    /** @return array<string, mixed> */
    private function content(): array
    {
        return [
            'destination' => 'thailand',
            'photos' => array_map(fn (string $s) => ['slot' => $s, 'query' => "{$s} thailand", 'caption' => $s], ['a', 'b', 'c', 'd', 'e', 'f']),
            'hero' => 'a',
            'categories' => [
                ['menu' => 'destinations', 'slug' => 'classic', 'name' => 'Classic', 'description' => 'Classic trips.', 'photo' => 'b', 'packages' => ['simply-thailand', 'thailand-group']],
                ['menu' => 'destinations', 'slug' => 'family', 'name' => 'Family', 'description' => 'Family trips.', 'photo' => 'c', 'packages' => ['simply-thailand']],
                ['menu' => 'honeymoon', 'slug' => 'romantic', 'name' => 'Romantic', 'description' => 'For couples.', 'photo' => 'd', 'packages' => ['simply-thailand']],
                ['menu' => 'group-tours', 'slug' => 'fixed', 'name' => 'Fixed Departures', 'description' => 'Fixed dates.', 'photo' => 'e', 'packages' => ['thailand-group']],
            ],
            'packages' => [$this->entry('simply-thailand') + ['overview' => 'Better overview.', 'price' => ['from' => 31000]]],
            'group_trips' => [$this->entry('thailand-group') + [
                'title' => 'Thailand Group Trip', 'nights' => 2, 'overview' => 'Overview.', 'price' => 29000, 'original_price' => 32000,
                'departures' => ['weekday' => 5, 'count' => 4, 'every_weeks' => 2, 'capacity' => 20],
                'itinerary' => [['day' => 1, 'title' => 'Arrive', 'description' => "Land.\nTransfer."], ['day' => 2, 'title' => 'Explore', 'description' => 'Sights.'], ['day' => 3, 'title' => 'Depart', 'description' => 'Fly home.']],
            ]],
        ];
    }

    private function seedSite(): Tour
    {
        $d = Destination::create(['name' => 'Thailand', 'slug' => 'thailand', 'region' => 'international']);

        return Tour::create([
            'destination_id' => $d->id, 'slug' => 'simply-thailand', 'title' => 'Simply Thailand', 'duration_nights' => 4, 'tour_type' => 'custom', 'haul_class' => 'long',
            'base_price' => null, 'show_price' => true, 'status' => 'draft', 'itinerary' => [['day' => 1, 'title' => 'Arrive', 'description' => 'x']],
        ]);
    }

    public function test_a_complete_file_is_valid(): void
    {
        $this->assertSame([], (new CatalogueContent)->validate($this->content()));
    }

    public function test_problems_are_reported(): void
    {
        $data = $this->content();
        $data['packages'][0]['photo'] = 'nope';
        $data['group_trips'][0]['itinerary'] = array_slice($data['group_trips'][0]['itinerary'], 0, 2);
        $data['categories'][0]['packages'][] = 'ghost';
        $data['group_trips'][0]['original_price'] = 100;

        $errors = implode(' | ', (new CatalogueContent)->validate($data));
        $this->assertStringContainsString('Photo slot "nope" is used but not defined', $errors);
        $this->assertStringContainsString('needs itinerary days 1 to 3', $errors);
        $this->assertStringContainsString('"ghost", which is not in packages or group_trips', $errors);
        $this->assertStringContainsString('original_price', $errors);
    }

    public function test_every_package_must_be_in_a_destinations_category_and_group_trips_in_the_group_menu(): void
    {
        $data = $this->content();
        $data['categories'] = array_values(array_filter($data['categories'], fn ($c) => $c['slug'] !== 'family' && $c['slug'] !== 'fixed' && $c['slug'] !== 'classic'));
        $data['categories'][] = ['menu' => 'honeymoon', 'slug' => 'x', 'name' => 'X', 'description' => 'd', 'photo' => 'b', 'packages' => ['thailand-group']];
        $data['categories'][] = ['menu' => 'destinations', 'slug' => 'y', 'name' => 'Y', 'description' => 'd', 'photo' => 'b', 'packages' => ['simply-thailand']];

        $errors = implode(' | ', (new CatalogueContent)->validate($data));
        $this->assertStringContainsString('"thailand-group" is not in any category of the destinations menu', $errors);
        $this->assertStringContainsString('is not in a category of the group-tours menu', $errors);
    }

    public function test_apply_writes_details_categories_group_trips_and_sample_pricing(): void
    {
        $tour = $this->seedSite();
        $result = (new CatalogueContent)->apply($this->content(), false, false, false);

        $this->assertSame(2, $result['tours']);
        $this->assertSame(1, $result['created']);
        $tour->refresh();
        $this->assertSame('draft', $tour->status, 'status is never changed');
        $this->assertSame('Better overview.', $tour->overview);
        $this->assertCount(5, $tour->highlights);
        $this->assertSame(31000, $tour->base_price);
        $this->assertContains('sample-pricing', $tour->tags);
        $this->assertContains('couples', $tour->tags, 'honeymoon placement adds the couples tag');
        $this->assertSame('x', $tour->itinerary[0]['description'], 'the itinerary is left alone');

        $trip = Tour::query()->where('slug', 'thailand-group')->firstOrFail();
        $this->assertSame('group', $trip->tour_type);
        $this->assertSame('published', $trip->status);
        $this->assertSame(29000, $trip->base_price);
        $dates = $trip->batches()->orderBy('starts_on')->get();
        $this->assertCount(4, $dates);
        $this->assertTrue($dates[0]->starts_on->isFriday());
        $this->assertTrue($dates[0]->starts_on->isFuture());
        $this->assertSame(14, (int) $dates[0]->starts_on->diffInDays($dates[1]->starts_on));
        $this->assertSame(2, (int) $dates[0]->starts_on->diffInDays($dates[0]->ends_on));

        $this->assertSame(4, Category::query()->count());
        $this->assertSame(['simply-thailand', 'thailand-group'], Category::query()->where('slug', 'classic')->firstOrFail()->tours()->orderBy('slug')->pluck('slug')->all());
    }

    public function test_re_running_does_not_duplicate_and_keeps_admin_prices(): void
    {
        $tour = $this->seedSite();
        $content = new CatalogueContent;
        $content->apply($this->content(), false, false, false);
        $tour->refresh()->update(['base_price' => 52000, 'tags' => ['hand-priced']]);

        $content->apply($this->content(), false, false, false);

        $this->assertSame(2, Tour::query()->count());
        $this->assertSame(4, Tour::query()->where('slug', 'thailand-group')->firstOrFail()->batches()->count());
        $this->assertSame(4, Category::query()->count());
        $this->assertSame(52000, $tour->fresh()->base_price, 'a price set by hand is not replaced by the sample');
    }

    public function test_unknown_existing_packages_stop_the_run(): void
    {
        $this->seedSite();
        $data = $this->content();
        $data['packages'][0]['slug'] = 'missing-one';
        $data['categories'][0]['packages'][0] = 'missing-one';
        $data['categories'][1]['packages'][0] = 'missing-one';
        $data['categories'][2]['packages'][0] = 'missing-one';

        $result = (new CatalogueContent)->apply($data, false, false, false);

        $this->assertSame(['missing-one'], $result['missing_tours']);
        $this->assertSame(1, Tour::query()->count());
    }

    public function test_photo_paths_are_only_set_when_the_files_exist(): void
    {
        $tour = $this->seedSite();
        $dir = dirname(CatalogueContent::photoFile('thailand', 'a'));
        @mkdir($dir, 0777, true);
        $made = [];
        foreach (['a', 'b'] as $slot) {
            $f = CatalogueContent::photoFile('thailand', $slot);
            file_put_contents($f, 'x');
            $made[] = $f;
        }

        try {
            $result = (new CatalogueContent)->apply($this->content(), true, false, false);
        } finally {
            array_map('unlink', $made);
            @rmdir($dir);
        }

        $this->assertSame('/photos/places/thailand/a.jpg', $tour->fresh()->image_url);
        $this->assertSame(['/photos/places/thailand/b.jpg'], $tour->fresh()->gallery, 'only the gallery photos that exist are kept');
        $this->assertContains('c', $result['photos_missing']);
        $this->assertSame('/photos/places/thailand/a.jpg', Destination::query()->firstOrFail()->image_url);
    }

    public function test_clearing_sample_pricing_removes_prices_and_dates_but_not_other_data(): void
    {
        $tour = $this->seedSite();
        (new CatalogueContent)->apply($this->content(), false, false, false);

        $this->artisan('catalogue:clear-sample-pricing', ['--dry-run' => true])->assertSuccessful();
        $this->assertSame(31000, $tour->fresh()->base_price);

        $this->artisan('catalogue:clear-sample-pricing')->assertSuccessful();

        $this->assertNull($tour->fresh()->base_price);
        $this->assertNotContains('sample-pricing', $tour->fresh()->tags);
        $this->assertContains('couples', $tour->fresh()->tags);
        $trip = Tour::query()->where('slug', 'thailand-group')->firstOrFail();
        $this->assertNull($trip->base_price);
        $this->assertSame(0, $trip->batches()->count());
    }

    public function test_clearing_is_refused_while_a_departure_has_bookings(): void
    {
        $this->seedSite();
        (new CatalogueContent)->apply($this->content(), false, false, false);
        Tour::query()->where('slug', 'thailand-group')->firstOrFail()->batches()->first()?->update(['seats_booked' => 2]);

        $this->artisan('catalogue:clear-sample-pricing')->expectsOutputToContain('Bookings exist')->assertFailed();
        $this->assertSame(29000, Tour::query()->where('slug', 'thailand-group')->firstOrFail()->base_price);
    }

    public function test_the_shipped_content_files_are_valid_and_every_photo_file_exists(): void
    {
        $files = glob(CatalogueContent::dir().'/*.json') ?: [];
        $this->assertCount(12, $files);
        foreach ($files as $file) {
            $data = json_decode((string) file_get_contents($file), true);
            $this->assertSame([], (new CatalogueContent)->validate($data), basename($file));
            foreach ($data['photos'] as $p) {
                $path = CatalogueContent::photoFile($data['destination'], $p['slot']);
                $this->assertFileExists($path);
                $this->assertGreaterThan(20000, filesize($path), "{$path} looks too small");
            }
        }
    }
}
