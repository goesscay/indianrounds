<?php

namespace Tests\Feature;

use App\Models\Batch;
use App\Models\Category;
use App\Models\Destination;
use App\Models\Tour;
use App\Services\CatalogueImporter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use Tests\TestCase;

class CatalogueImportTest extends TestCase
{
    use RefreshDatabase;

    private const TEMPLATE = '../../docs/client-data/IndianRounds_Package_Data_Template.xlsx';

    /** @var list<string> */
    private array $tmp = [];

    protected function tearDown(): void
    {
        foreach ($this->tmp as $f) {
            is_dir($f) ? $this->rmdir($f) : @unlink($f);
        }
        parent::tearDown();
    }

    private function rmdir(string $d): void
    {
        foreach (glob($d.'/*') ?: [] as $f) {
            is_dir($f) ? $this->rmdir($f) : @unlink($f);
        }
        @rmdir($d);
    }

    /** A workbook with the real template's sheet names and header layout (the real file is too slow to rewrite in a test), filled like a client would. */
    private function workbook(?callable $tweak = null): string
    {
        $book = new Spreadsheet;
        $book->removeSheetByIndex(0);
        foreach (['Destinations' => ['Region', 'Country / destination name'], 'Categories' => ['Menu', 'Country'], 'Packages' => ['Package ID', 'Package title'],
            'Placements' => ['Package ID', 'Menu | Country | Category'], 'Itinerary' => ['Package ID', 'Day number'], 'PriceOptions' => ['Package ID', 'Option name'],
            'Departures' => ['Package ID', 'Start date']] as $name => $headers) {
            $ws = $book->createSheet();
            $ws->setTitle($name);
            foreach ($headers as $i => $h) {
                $ws->setCellValue([$i + 1, 4], $h.' *');
            }
        }
        $set = fn (string $sheet, int $row, array $vals) => array_walk($vals, fn ($v, $col) => $book->getSheetByName($sheet)?->setCellValue([$col, $row], $v));

        $set('Destinations', 6, [1 => 'International', 2 => 'Thailand', 3 => 'Beaches | Culture | Nightlife', 4 => 'November to March', 5 => 'Thailand mixes island beaches with temples and street food.', 6 => 'country-thailand.jpg', 7 => 'Yes', 8 => 1]);
        $set('Categories', 7, [1 => 'Destinations', 2 => 'Thailand', 3 => 'Beach Holidays', 4 => 'Sun and sand.', 5 => 'cat-th-beach.jpg', 6 => 1]);
        $set('Categories', 8, [1 => 'Group Tours', 2 => 'Thailand', 3 => 'Fixed Departures']);
        $set('Categories', 9, [1 => 'Honeymoon', 2 => 'Thailand', 3 => 'Romantic Escapes']);
        $set('Packages', 6, [
            1 => 'TH-001', 2 => 'Phuket & Krabi Escape', 3 => 'Thailand', 4 => 'International long-haul', 5 => 4,
            7 => 'Chennai airport', 8 => 'Chennai airport', 9 => 'Four nights of islands and beaches.', 10 => 'A relaxed island holiday with hopping and sunsets.',
            11 => 39999, 12 => 45999, 13 => "Island hopping\nSunset cruise", 14 => "Return flights\n5 nights hotel", 15 => 'Visa fee', 16 => "- Weather can change\n- Carry ID", 17 => 'Passport',
            18 => 'TH-001-cover.jpg', 19 => 'TH-001-2.jpg, TH-001-3.jpg', 20 => 'Yes', 21 => 'Published', 22 => 'Yes', 23 => 'No', 24 => 'No', 25 => 'No',
        ]);
        foreach (['Destinations | Thailand | Beach Holidays', 'Group Tours | Thailand | Fixed Departures', 'Honeymoon | Thailand | Romantic Escapes'] as $i => $key) {
            $set('Placements', 7 + $i, [1 => 'TH-001', 2 => $key]);
        }
        foreach (range(1, 5) as $day) {
            $set('Itinerary', 10 + $day, [1 => 'TH-001', 2 => $day, 3 => "Day {$day} title", 4 => "What happens on day {$day}."]);
        }
        $set('PriceOptions', 6, [1 => 'TH-001', 2 => 'Twin sharing', 3 => 39999, 4 => 45999]);
        $set('PriceOptions', 7, [1 => 'TH-001', 2 => 'Single room', 3 => 52999]);
        $set('Departures', 6, [1 => 'TH-001', 2 => Date::PHPToExcel(strtotime('2027-06-05')), 4 => 20, 5 => 'Open']);
        $set('Departures', 7, [1 => 'TH-001', 2 => '19-06-2027', 4 => 18, 5 => 'Open']);

        if ($tweak) {
            $tweak($book, $set);
        }

        $path = tempnam(sys_get_temp_dir(), 'cat').'.xlsx';
        IOFactory::createWriter($book, 'Xlsx')->save($path);
        $this->tmp[] = $path;

        return $path;
    }

    private function import(string $path, ?string $images = null, bool $dry = false): array
    {
        return app(CatalogueImporter::class)->import($path, $images, $dry);
    }

    public function test_the_untouched_template_imports_nothing_because_examples_are_ignored(): void
    {
        $r = $this->import(base_path(self::TEMPLATE));

        $this->assertSame([], $r['errors']);
        $this->assertSame(0, $r['summary']['packages']);
        $this->assertSame(0, Destination::query()->count());
    }

    public function test_a_complete_workbook_imports_destinations_categories_and_packages(): void
    {
        $r = $this->import($this->workbook());
        $this->assertSame([], $r['errors']);

        $d = Destination::query()->where('slug', 'thailand')->firstOrFail();
        $this->assertSame('international', $d->region);
        $this->assertTrue($d->featured);
        $this->assertSame('Thailand mixes island beaches with temples and street food.', $d->seo_content['overview']);
        $this->assertSame(39999, (int) $d->starting_price);

        $t = Tour::query()->where('code', 'TH-001')->firstOrFail();
        $this->assertSame('group', $t->tour_type);
        $this->assertSame('long', $t->haul_class);
        $this->assertSame(4, $t->duration_nights);
        $this->assertSame(39999, $t->base_price);
        $this->assertSame(45999, $t->original_price);
        $this->assertSame(['Island hopping', 'Sunset cruise'], $t->highlights);
        $this->assertSame(['Weather can change', 'Carry ID'], $t->notes);
        $this->assertCount(5, $t->itinerary);
        $this->assertSame(['day' => 1, 'title' => 'Day 1 title', 'description' => 'What happens on day 1.'], $t->itinerary[0]);
        $this->assertEqualsCanonicalizing(['family', 'couples'], $t->tags);
        $this->assertSame('/uploads/catalogue/TH-001-cover.jpg', $t->image_url);
        $this->assertSame(['/uploads/catalogue/TH-001-2.jpg', '/uploads/catalogue/TH-001-3.jpg'], $t->gallery);
        $this->assertSame(['Single room', 'Twin sharing'], $t->variants()->orderBy('label')->pluck('label')->all());

        $this->assertSame(3, Category::query()->count());
        $this->assertEqualsCanonicalizing(['destinations', 'group-tours', 'honeymoon'], $t->categories()->pluck('menu')->all());

        $batches = $t->batches()->orderBy('starts_on')->get();
        $this->assertCount(2, $batches);
        $this->assertSame('2027-06-05', $batches[0]->starts_on->toDateString());
        $this->assertSame('2027-06-09', $batches[0]->ends_on->toDateString());
        $this->assertSame(20, $batches[0]->capacity);
        $this->assertSame('2027-06-19', $batches[1]->starts_on->toDateString());
    }

    public function test_importing_twice_updates_instead_of_duplicating_and_never_shrinks_a_booked_departure(): void
    {
        $this->import($this->workbook());
        Batch::query()->orderBy('starts_on')->firstOrFail()->update(['seats_booked' => 12]);

        $second = $this->workbook(fn ($book, $set) => $set('Departures', 6, [4 => 5]));
        $r = $this->import($second);

        $this->assertSame([], $r['errors']);
        $this->assertSame(1, Tour::query()->count());
        $this->assertSame(1, Destination::query()->count());
        $this->assertSame(3, Category::query()->count());
        $this->assertSame(2, Batch::query()->count());
        $this->assertSame(2, Tour::query()->firstOrFail()->variants()->count());
        $this->assertSame(12, Batch::query()->orderBy('starts_on')->firstOrFail()->capacity, 'capacity must not drop below seats already booked');
    }

    public function test_the_sample_workbook_shown_to_the_client_imports_cleanly(): void
    {
        $r = $this->import(base_path('../../docs/client-data/IndianRounds_Package_Data_SAMPLE.xlsx'));

        $this->assertSame([], $r['errors']);
        $this->assertSame(8, Destination::query()->count());
        $this->assertSame(22, Category::query()->count());
        $this->assertSame(13, Tour::query()->count());
        $this->assertSame(14, Batch::query()->count());
        $this->assertSame(5, Tour::query()->where('tour_type', 'group')->count());
        $this->assertSame(['KER-002', 'KER-003', 'RAJ-002'], Tour::query()->whereJsonContains('tags', 'weekend')->orderBy('code')->pluck('code')->all());
        $this->assertSame(4, Tour::query()->whereJsonContains('tags', 'couples')->count());
        $this->assertSame(9499, (int) Destination::query()->where('slug', 'kerala')->value('starting_price'));
        $this->assertSame(7, count(Tour::query()->where('code', 'KER-001')->firstOrFail()->itinerary));
    }

    public function test_a_dry_run_validates_but_changes_nothing(): void
    {
        $r = $this->import($this->workbook(), null, true);

        $this->assertSame([], $r['errors']);
        $this->assertSame(1, $r['summary']['packages']);
        $this->assertSame(3, $r['summary']['placements']);
        $this->assertSame(0, Tour::query()->count());
        $this->assertSame(0, Destination::query()->count());
    }

    public function test_every_problem_is_reported_with_its_sheet_and_row_and_nothing_is_imported(): void
    {
        $bad = $this->workbook(function ($book, $set) {
            $book->getSheetByName('Itinerary')?->setCellValue([2, 13], null)->setCellValue([1, 13], null)->setCellValue([3, 13], null)->setCellValue([4, 13], null); // remove day 3
            $set('Packages', 6, [3 => 'Atlantis', 11 => 'lots']);
            $set('Placements', 10, [1 => 'TH-999', 2 => 'Destinations | Thailand | Beach Holidays']);
            $set('Categories', 10, [1 => 'Sales', 2 => 'Thailand', 3 => 'Oops']);
        });

        $r = $this->import($bad);
        $text = implode("\n", $r['errors']);

        $this->assertStringContainsString('Packages row 6 (TH-001): country "Atlantis" is not on the Destinations sheet', $text);
        $this->assertStringContainsString('Packages row 6 (TH-001): price per person must be a whole number', $text);
        $this->assertStringContainsString('itinerary must have exactly days 1 to 5', $text);
        $this->assertStringContainsString('Placements row 10: Package ID "TH-999" is not on the Packages sheet', $text);
        $this->assertStringContainsString('Categories row 10: menu must be one of', $text);
        $this->assertSame(0, Tour::query()->count());
        $this->assertSame(0, Destination::query()->count());
    }

    private function clear(Spreadsheet $book, string $sheet, array $rows, array $cols): void
    {
        foreach ($rows as $row) {
            foreach ($cols as $col) {
                $book->getSheetByName($sheet)?->setCellValue([$col, $row], null);
            }
        }
    }

    public function test_a_group_tour_needs_at_least_one_departure(): void
    {
        $r = $this->import($this->workbook(fn ($book) => $this->clear($book, 'Departures', [6, 7], [1, 2, 4, 5])));

        $this->assertStringContainsString('Package TH-001: is under Group Tours but has no departure dates', implode('
', $r['errors']));
    }

    public function test_every_package_needs_a_placement(): void
    {
        $r = $this->import($this->workbook(fn ($book) => $this->clear($book, 'Placements', [7, 8, 9], [1, 2])));

        $this->assertStringContainsString('Package TH-001: not placed anywhere', implode('
', $r['errors']));
    }

    public function test_a_renamed_or_missing_sheet_is_rejected(): void
    {
        $book = new Spreadsheet;
        $book->getActiveSheet()->setTitle('Sheet1');
        $path = tempnam(sys_get_temp_dir(), 'cat').'.xlsx';
        IOFactory::createWriter($book, 'Xlsx')->save($path);
        $this->tmp[] = $path;

        $r = $this->import($path);

        $this->assertStringContainsString("no 'Destinations' sheet", implode("\n", $r['errors']));
    }

    public function test_photos_are_validated_and_copied_when_a_folder_is_given(): void
    {
        $src = sys_get_temp_dir().'/catimg'.uniqid();
        $dest = sys_get_temp_dir().'/catdest'.uniqid();
        mkdir($src);
        $this->tmp[] = $src;
        $this->tmp[] = $dest;
        config(['catalogue.images_path' => $dest]);

        $png = function (string $name) use ($src) {
            $im = imagecreatetruecolor(8, 8);
            imagepng($im, "{$src}/{$name}");
        };
        foreach (['country-thailand.jpg', 'cat-th-beach.jpg', 'TH-001-cover.jpg', 'TH-001-2.jpg'] as $n) {
            $png($n); // real PNG data under a .jpg name is still a valid image
        }

        $path = $this->workbook();
        $missing = $this->import($path, $src, true);
        $this->assertStringContainsString('Image "TH-001-3.jpg" was not found', implode("\n", $missing['errors']));
        $this->assertSame(0, Tour::query()->count());

        $png('TH-001-3.jpg');
        $ok = $this->import($path, $src);

        $this->assertSame([], $ok['errors']);
        $this->assertFileExists("{$dest}/TH-001-cover.jpg");
        $this->assertFileExists("{$dest}/country-thailand.jpg");
    }
}
