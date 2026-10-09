<?php

namespace App\Console\Commands;

use App\Models\Destination;
use App\Models\Tour;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Throwable;

/**
 * Imports packages from the itinerary workbook (one sheet: Destination Name | Package Name | Itinerary Brief |
 * Itinerary Day 1..N). The package name carries the length ("... - 5 Nights / 6 Days"); day N sits in column N+3
 * (columns past the labelled "Day 9" are unlabelled in the client's file but continue the days).
 *
 * The workbook has no prices: packages are created quote-only (no price) and as drafts unless --status says otherwise.
 * Re-running is safe and only touches what the workbook contains (destination, title, length, overview, itinerary), so
 * prices, inclusions, photos and status set later in the admin are never overwritten.
 */
class CatalogueImportPackages extends Command
{
    protected $signature = 'catalogue:import-packages {file : Path to the packages workbook (.xlsx)}
        {--dry-run : Validate and show what would be imported, without changing anything}
        {--status= : draft or published; applied to every package. Without it new packages are drafts and existing ones keep their status}';

    protected $description = 'Import packages (itineraries) from the packages workbook as quote-only packages';

    /** Names used in the workbook that differ from the destination names on the site. */
    private const DESTINATION_ALIASES = ['dubai' => 'united-arab-emirates', 'bali' => 'indonesia', 'tanzania-zanzibar' => 'tanzania'];

    private const PLACEHOLDER_BRIEF = 'Explore the destinations and experiences planned in this itinerary';

    private const FIRST_DAY_COLUMN = 4;

    /** @var list<string> */
    private array $errors = [];

    /** @var list<string> */
    private array $warnings = [];

    public function handle(): int
    {
        $file = (string) $this->argument('file');
        $status = $this->option('status') === null ? null : (string) $this->option('status');
        if (! is_file($file)) {
            $this->error("File not found: {$file}");

            return self::FAILURE;
        }
        if ($status !== null && ! in_array($status, ['draft', 'published'], true)) {
            $this->error('--status must be draft or published.');

            return self::FAILURE;
        }

        $packages = $this->read($file);
        foreach ($this->warnings as $w) {
            $this->warn('Warning: '.$w);
        }
        if ($this->errors !== []) {
            foreach ($this->errors as $e) {
                $this->error($e);
            }
            $this->error(count($this->errors).' problem(s) found. Nothing was imported.');

            return self::FAILURE;
        }

        $existing = Tour::query()->whereIn('code', array_column($packages, 'code'))->pluck('code')->all();
        $this->table(['Destination', 'Package', 'Nights', 'Days given', 'Itinerary', 'New?'], array_map(fn (array $p) => [
            $p['destination']->name, Str::limit($p['title'], 50), $p['nights'], count($p['itinerary']), $p['itinerary'] === [] ? 'none' : 'yes', in_array($p['code'], $existing, true) ? 'update' : 'new',
        ], $packages));
        $this->info(count($packages).' package(s) ready: '.count(array_diff(array_column($packages, 'code'), $existing)).' new, '.count($existing).' to update.');

        if ($this->option('dry-run')) {
            $this->info('Dry run OK: nothing was changed.');

            return self::SUCCESS;
        }

        DB::transaction(function () use ($packages, $status): void {
            foreach ($packages as $p) {
                $tour = Tour::query()->firstOrNew(['code' => $p['code']]);
                $isNew = ! $tour->exists;
                $tour->fill([
                    'destination_id' => $p['destination']->id, 'title' => $p['title'], 'duration_nights' => $p['nights'],
                    'overview' => $p['overview'], 'itinerary' => $p['itinerary'],
                ]);
                if ($isNew) {
                    $tour->fill(['slug' => $this->uniqueSlug($p['title'], $p['destination']->slug, $p['code']), 'tour_type' => 'custom', 'haul_class' => 'long', 'base_price' => null, 'show_price' => true, 'status' => 'draft']);
                }
                if ($status !== null) {
                    $tour->status = $status;
                }
                $tour->save();
            }
        });

        $this->info('Import complete.');

        return self::SUCCESS;
    }

    /** @return list<array{code: string, destination: Destination, title: string, nights: int, overview: string|null, itinerary: list<array{day: int, title: string, description: string}>}> */
    private function read(string $file): array
    {
        try {
            $reader = IOFactory::createReaderForFile($file);
            $reader->setReadDataOnly(true);
            $sheet = $reader->load($file)->getActiveSheet();
        } catch (Throwable $e) {
            $this->errors[] = 'Could not open the workbook: '.$e->getMessage();

            return [];
        }

        foreach (['destination name', 'package name', 'itinerary brief'] as $i => $expected) {
            $got = strtolower(trim((string) $sheet->getCell([$i + 1, 1])->getValue()));
            if ($got !== $expected) {
                $this->errors[] = 'Column '.($i + 1)." header should be \"{$expected}\" but is \"{$got}\".";
            }
        }
        if ($this->errors !== []) {
            return [];
        }

        $destinations = Destination::query()->get()->keyBy('slug');
        $lastCol = Coordinate::columnIndexFromString($sheet->getHighestDataColumn());
        $out = [];
        $codes = [];

        for ($r = 2; $r <= $sheet->getHighestDataRow(); $r++) {
            $name = trim((string) $sheet->getCell([2, $r])->getValue());
            $destName = trim((string) $sheet->getCell([1, $r])->getValue());
            if ($name === '' && $destName === '') {
                continue;
            }
            $where = "Row {$r}".($name !== '' ? " ({$name})" : '');
            if ($name === '' || $destName === '') {
                $this->errors[] = "{$where}: destination and package name are both required.";

                continue;
            }

            $slug = Str::slug($destName);
            $destination = $destinations[self::DESTINATION_ALIASES[$slug] ?? $slug] ?? null;
            if ($destination === null) {
                $this->errors[] = "{$where}: destination \"{$destName}\" is not a destination on the site.";

                continue;
            }

            // Days are numbered in the order they appear. A blank column in the middle is a slip in the sheet
            // (a day cannot be skipped), so the days after it close the gap.
            $itinerary = [];
            $skipped = false;
            for ($c = self::FIRST_DAY_COLUMN; $c <= $lastCol; $c++) {
                $text = trim((string) $sheet->getCell([$c, $r])->getValue());
                if ($text === '') {
                    $skipped = $skipped || $itinerary !== [];

                    continue;
                }
                if (count($itinerary) >= 30) {
                    $this->errors[] = "{$where}: more than 30 itinerary days.";

                    break;
                }
                $itinerary[] = $this->day(count($itinerary) + 1, $text);
                if ($skipped) {
                    $this->warnings[] = "{$where}: a blank day column in the sheet was skipped, so the days after it were renumbered ({$c} -> day ".count($itinerary).').';
                    $skipped = false;
                }
            }

            [$title, $nights] = $this->titleAndNights($name);
            if ($nights === null && $itinerary !== []) {
                $nights = max(array_column($itinerary, 'day')) - 1;
                $this->warnings[] = "{$where}: no length in the name, so {$nights} nights was taken from the {$nights}+1 itinerary days.";
            }
            if ($nights === null || $nights < 1) {
                $this->warnings[] = "{$where}: NOT imported, its length (nights) is unknown (none in the name, no itinerary). Send the nights and it can be added.";

                continue;
            }

            $given = count($itinerary);
            if ($given === 0) {
                $this->warnings[] = "{$where}: has no day-by-day itinerary.";
            } elseif ($given !== $nights + 1) {
                $this->warnings[] = "{$where}: {$nights} nights should have ".($nights + 1)." itinerary days but has {$given}.";
            }

            $overview = $this->overview((string) $sheet->getCell([3, $r])->getValue());
            if ($overview === null) {
                $this->warnings[] = "{$where}: the brief is only placeholder text, so the overview is left blank.";
            }

            $code = mb_substr($destination->slug.'-'.Str::slug($title), 0, 60);
            if (isset($codes[$code])) {
                $this->errors[] = "{$where}: duplicate of row {$codes[$code]} for the same destination.";

                continue;
            }
            $codes[$code] = $r;

            $out[] = ['code' => $code, 'destination' => $destination, 'title' => $title, 'nights' => $nights, 'overview' => $overview, 'itinerary' => $itinerary];
        }

        if ($out === [] && $this->errors === []) {
            $this->errors[] = 'The workbook has no packages.';
        }

        return $out;
    }

    /** @return array{0: string, 1: int|null} */
    private function titleAndNights(string $name): array
    {
        if (preg_match('/^(.*?)\s*[-–]\s*(\d+)\s*Nights?\s*\/\s*\d+\s*Days?\s*$/iu', $name, $m) === 1 && trim($m[1]) !== '') {
            return [trim($m[1]), (int) $m[2]];
        }

        return [$name, null];
    }

    /**
     * One day's bullet lines become a heading (the first bullet) and a body (the rest); a long first bullet is shortened for the heading and kept whole in the body.
     *
     * @return array{day: int, title: string, description: string}
     */
    private function day(int $day, string $text): array
    {
        $lines = array_values(array_filter(array_map(
            fn (string $l) => trim((string) preg_replace('/^\s*[•\-*]\s*/u', '', $l)),
            preg_split('/\r\n|\r|\n/', $text) ?: [],
        ), fn (string $l) => $l !== ''));

        $first = rtrim($lines[0] ?? $text, '.');
        $title = $first;
        $body = array_slice($lines, 1);
        if (mb_strlen($first) > 90) {
            $title = rtrim(mb_substr($first, 0, mb_strrpos(mb_substr($first, 0, 90), ' ') ?: 90), ' ,;').'…';
            $body = $lines;
        }

        return ['day' => $day, 'title' => $title, 'description' => implode("\n", $body !== [] ? $body : [$lines[0] ?? $text])];
    }

    private function overview(string $brief): ?string
    {
        $brief = trim($brief);
        if ($brief === '' || str_contains($brief, self::PLACEHOLDER_BRIEF)) {
            return null;
        }
        $brief = (string) preg_replace('/\.{2,}/', '.', $brief);

        return trim((string) preg_replace('/\s+/u', ' ', $brief));
    }

    private function uniqueSlug(string $title, string $destinationSlug, string $code): string
    {
        $slug = Str::slug($title);
        foreach ([$slug, $slug.'-'.$destinationSlug, $slug.'-'.$code] as $candidate) {
            if (! Tour::query()->where('slug', $candidate)->exists()) {
                return $candidate;
            }
        }

        return $slug.'-'.$code.'-'.Str::lower(Str::random(4));
    }
}
