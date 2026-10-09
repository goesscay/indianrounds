<?php

namespace Tests\Feature;

use App\Models\Destination;
use App\Models\Tour;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\PendingCommand;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use Tests\TestCase;

class ImportPackagesTest extends TestCase
{
    use RefreshDatabase;

    private const PLACEHOLDER = "Explore the destinations and experiences planned in this itinerary.\nEnjoy a memorable journey from start to finish.";

    /** @var list<string> */
    private array $tmp = [];

    protected function setUp(): void
    {
        parent::setUp();
        foreach (['United Arab Emirates', 'Indonesia', 'Tanzania', 'Singapore', 'Malaysia', 'Thailand'] as $i => $n) {
            Destination::create(['name' => $n, 'slug' => str($n)->slug()->toString(), 'region' => 'international', 'sort' => $i]);
        }
    }

    protected function tearDown(): void
    {
        array_map('unlink', array_filter($this->tmp, 'is_file'));
        parent::tearDown();
    }

    /**
     * @param  list<array<int, string|null>>  $rows  [destination, package name, brief, day 1, day 2, ...] (day N is column N+3)
     */
    private function workbook(array $rows): string
    {
        $book = new Spreadsheet;
        $sheet = $book->getActiveSheet();
        $sheet->setTitle('Itinerary Details');
        foreach (['Destination Name', 'Package Name', 'Itinerary Brief', 'Itinerary Day 1', 'Itinerary Day 2'] as $i => $h) {
            $sheet->setCellValue([$i + 1, 1], $h);
        }
        foreach ($rows as $r => $row) {
            foreach ($row as $c => $v) {
                if ($v !== null) {
                    $sheet->setCellValue([$c + 1, $r + 2], $v);
                }
            }
        }
        $path = tempnam(sys_get_temp_dir(), 'pkg').'.xlsx';
        IOFactory::createWriter($book, 'Xlsx')->save($path);
        $this->tmp[] = $path;

        return $path;
    }

    /** @param  array<string, mixed>  $opts */
    private function runImport(string $file, array $opts = []): PendingCommand
    {
        return $this->artisan('catalogue:import-packages', ['file' => $file] + $opts);
    }

    /** @return list<array<int, string|null>> */
    private function rows(): array
    {
        $day = fn (string $a, string $b = 'Overnight stay.') => "• {$a}\n• {$b}";

        return [
            ['Dubai', 'Wonders of Dubai - 5 Nights / 6 Days', "Discover Dubai..\nContinue with the city tour for a memorable journey.", $day('Arrive in Dubai and transfer to the hotel.'), $day('Visit Burj Khalifa.'), $day('Desert safari.'), $day('Marina cruise.'), $day('Leisure day.'), $day('Check out and fly home.')],
            ['Bali', 'Bali - Buy 1 Get 1 Free - 5 Nights / 6 Days', self::PLACEHOLDER, $day('Arrive in Bali.'), $day('Ubud day.')],
            ['Tanzania - Zanzibar', 'The Great African Safari - 9 Nights / 10 Days', 'Safari.'] + array_fill(3, 10, "• A long safari day\n• Game drive"),
            ['Singapore', 'Cost Saver Malaysia Singapore - 6 Nights / 7 Days', 'Two countries.', $day('Arrive in Singapore.')],
            ['Malaysia', 'Cost Saver Malaysia Singapore - 6 Nights / 7 Days', 'Two countries.', $day('Arrive in Kuala Lumpur.')],
            ['Thailand', 'Phuket Special Offer - 4 Nights / 5 Days', self::PLACEHOLDER],
            ['Thailand', 'Phuket By Van Tours', self::PLACEHOLDER],
        ];
    }

    public function test_it_imports_quote_only_drafts_with_cleaned_content(): void
    {
        $this->runImport($this->workbook($this->rows()))->assertSuccessful();

        $this->assertSame(6, Tour::query()->count(), 'the row with no length and no itinerary is skipped');
        $dubai = Tour::query()->where('code', 'united-arab-emirates-wonders-of-dubai')->firstOrFail();
        $this->assertSame('Wonders of Dubai', $dubai->title);
        $this->assertSame(5, $dubai->duration_nights);
        $this->assertSame('draft', $dubai->status);
        $this->assertNull($dubai->base_price);
        $this->assertTrue($dubai->show_price);
        $this->assertSame('custom', $dubai->tour_type);
        $this->assertSame('united-arab-emirates', $dubai->destination->slug, 'Dubai is mapped to the United Arab Emirates');
        $this->assertSame('Discover Dubai. Continue with the city tour for a memorable journey.', $dubai->overview);
        $this->assertCount(6, $dubai->itinerary);
        $this->assertSame(['day' => 1, 'title' => 'Arrive in Dubai and transfer to the hotel', 'description' => 'Overnight stay.'], $dubai->itinerary[0]);

        $bali = Tour::query()->where('title', 'Bali - Buy 1 Get 1 Free')->firstOrFail();
        $this->assertSame('indonesia', $bali->destination->slug);
        $this->assertNull($bali->overview, 'a placeholder brief is not used');
        $this->assertSame('tanzania', Tour::query()->where('title', 'The Great African Safari')->firstOrFail()->destination->slug);
    }

    public function test_day_columns_beyond_the_labelled_ones_continue_the_days(): void
    {
        $this->runImport($this->workbook($this->rows()))->assertSuccessful();

        $days = Tour::query()->where('title', 'The Great African Safari')->firstOrFail()->itinerary;
        $this->assertSame(range(1, 10), array_column($days, 'day'));
    }

    public function test_a_blank_day_column_in_the_middle_is_closed_up_and_reported(): void
    {
        $day = fn (string $a) => "• {$a}
• Overnight stay.";
        $file = $this->workbook([['Thailand', 'Phuket Escape - 3 Nights / 4 Days', 'Phuket.', $day('Arrive.'), $day('Beach.'), null, $day('Island.'), $day('Depart.')]]);

        $this->runImport($file)->expectsOutputToContain('a blank day column in the sheet was skipped')->assertSuccessful();

        $days = Tour::query()->firstOrFail()->itinerary;
        $this->assertSame([1, 2, 3, 4], array_column($days, 'day'));
        $this->assertSame('Depart', $days[3]['title']);
    }

    public function test_the_same_package_under_two_destinations_gets_two_distinct_entries(): void
    {
        $this->runImport($this->workbook($this->rows()))->assertSuccessful();

        $both = Tour::query()->where('title', 'Cost Saver Malaysia Singapore')->orderBy('id')->get();
        $this->assertCount(2, $both);
        $this->assertSame(['singapore', 'malaysia'], $both->map(fn (Tour $t) => $t->destination->slug)->all());
        $this->assertCount(2, $both->pluck('slug')->unique());
        $this->assertCount(2, $both->pluck('code')->unique());
    }

    public function test_problems_are_reported_as_warnings_without_blocking(): void
    {
        $this->runImport($this->workbook($this->rows()))
            ->expectsOutputToContain('Phuket By Van Tours): NOT imported')
            ->expectsOutputToContain('Phuket Special Offer - 4 Nights / 5 Days): has no day-by-day itinerary')
            ->expectsOutputToContain('6 nights should have 7 itinerary days but has 1')
            ->expectsOutputToContain('the brief is only placeholder text')
            ->assertSuccessful();
    }

    public function test_a_dry_run_changes_nothing(): void
    {
        $this->runImport($this->workbook($this->rows()), ['--dry-run' => true])->assertSuccessful();

        $this->assertSame(0, Tour::query()->count());
    }

    public function test_re_running_updates_but_keeps_prices_and_status_set_in_the_admin(): void
    {
        $file = $this->workbook($this->rows());
        $this->runImport($file)->assertSuccessful();
        Tour::query()->where('title', 'Wonders of Dubai')->update(['base_price' => 45000, 'show_price' => false, 'status' => 'published', 'inclusions' => ['Flights'], 'image_url' => '/uploads/x.jpg']);

        $this->runImport($file)->assertSuccessful();

        $this->assertSame(6, Tour::query()->count());
        $t = Tour::query()->where('title', 'Wonders of Dubai')->firstOrFail();
        $this->assertSame(45000, $t->base_price);
        $this->assertFalse($t->show_price);
        $this->assertSame('published', $t->status, 'status is untouched unless --status is given');
        $this->assertSame(['Flights'], $t->inclusions);
        $this->assertSame('/uploads/x.jpg', $t->image_url);
    }

    public function test_the_status_option_publishes_every_package(): void
    {
        $file = $this->workbook($this->rows());
        $this->runImport($file)->assertSuccessful();
        $this->runImport($file, ['--status' => 'published'])->assertSuccessful();

        $this->assertSame(6, Tour::query()->where('status', 'published')->count());
        $this->runImport($file, ['--status' => 'bogus'])->assertFailed();
    }

    public function test_an_unknown_destination_stops_the_import(): void
    {
        $file = $this->workbook(array_merge([['Atlantis', 'Lost City - 3 Nights / 4 Days', 'x', '• Arrive.']], $this->rows()));

        $this->runImport($file)->expectsOutputToContain('destination "Atlantis" is not a destination on the site')->assertFailed();
        $this->assertSame(0, Tour::query()->count());
    }

    public function test_a_wrong_layout_is_rejected(): void
    {
        $book = new Spreadsheet;
        $book->getActiveSheet()->setCellValue([1, 1], 'Country')->setCellValue([2, 1], 'Name')->setCellValue([3, 1], 'Text');
        $path = tempnam(sys_get_temp_dir(), 'pkg').'.xlsx';
        IOFactory::createWriter($book, 'Xlsx')->save($path);
        $this->tmp[] = $path;

        $this->runImport($path)->expectsOutputToContain('Column 1 header should be "destination name"')->assertFailed();
    }
}
