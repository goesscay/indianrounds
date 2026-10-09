<?php

namespace App\Console\Commands;

use App\Models\Booking;
use App\Models\Category;
use App\Models\Destination;
use App\Models\Tour;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Throwable;

/**
 * Replaces ALL destinations with the ones in a destinations workbook (one row per country:
 * Country | Destination Name | Tagline | On Season | Off Season | Mid Season).
 *
 * Deleting a destination also deletes its packages, departures, price options and categories
 * (database cascade). To protect real customers it refuses to run if any booking exists on a
 * package that would be removed; blog posts only lose their destination link.
 */
class CatalogueReplaceDestinations extends Command
{
    protected $signature = 'catalogue:replace-destinations {file : Path to the destinations workbook (.xlsx)}
        {--dry-run : Validate and show what would change, without changing anything}';

    protected $description = 'Remove every destination and add the ones in a destinations workbook';

    private const HEADERS = ['country', 'destination name', 'tagline', 'on season', 'off season', 'mid season'];

    /** Existing licensed photos reused when a country already has one; the rest show a placeholder until photos arrive. */
    private const PHOTO_ALIASES = ['united-arab-emirates' => 'dubai', 'indonesia' => 'bali'];

    public function handle(): int
    {
        $file = (string) $this->argument('file');
        if (! is_file($file)) {
            $this->error("File not found: {$file}");

            return self::FAILURE;
        }

        [$rows, $errors] = $this->read($file);
        if ($errors !== []) {
            foreach ($errors as $e) {
                $this->error($e);
            }
            $this->error(count($errors).' problem(s) found. Nothing was changed.');

            return self::FAILURE;
        }

        $tourIds = Tour::query()->pluck('id');
        $booked = Booking::query()->whereIn('tour_id', $tourIds)->count();
        if ($booked > 0) {
            $this->error("{$booked} booking(s) exist on packages that would be removed. Resolve or move them first. Nothing was changed.");

            return self::FAILURE;
        }

        $this->table(['Will be removed', 'Count'], [
            ['destinations', Destination::query()->count()],
            ['packages', $tourIds->count()],
            ['categories', Category::query()->count()],
        ]);
        $this->table(['#', 'Country', 'Places', 'Photo'], collect($rows)->map(fn (array $r, int $i) => [$i + 1, $r['name'], $r['places'], $r['image_url'] ?? '(placeholder)'])->all());

        if ($this->option('dry-run')) {
            $this->info('Dry run OK: the workbook is valid. Nothing was changed.');

            return self::SUCCESS;
        }

        DB::transaction(function () use ($rows): void {
            Destination::query()->delete();
            foreach ($rows as $i => $r) {
                Destination::query()->create([
                    'name' => $r['name'], 'slug' => $r['slug'], 'region' => $r['region'], 'tagline' => $r['tagline'],
                    'best_time' => $r['best_time'], 'image_url' => $r['image_url'], 'featured' => true, 'sort' => $i + 1,
                    'seo_content' => ['places' => $r['places'], 'seasons' => $r['seasons']],
                ]);
            }
        });

        $this->info(count($rows).' destinations added; all previous destinations and their packages were removed.');

        return self::SUCCESS;
    }

    /**
     * @return array{0: list<array<string, mixed>>, 1: list<string>}
     */
    private function read(string $file): array
    {
        try {
            $reader = IOFactory::createReaderForFile($file);
            $reader->setReadDataOnly(true);
            $sheet = $reader->load($file)->getActiveSheet();
        } catch (Throwable $e) {
            return [[], ['Could not open the workbook: '.$e->getMessage()]];
        }

        $errors = [];
        foreach (self::HEADERS as $i => $expected) {
            $got = strtolower(trim((string) $sheet->getCell([$i + 1, 1])->getValue()));
            if ($got !== $expected) {
                $errors[] = 'Column '.($i + 1)." header should be \"{$expected}\" but is \"{$got}\".";
            }
        }
        if ($errors !== []) {
            return [[], $errors];
        }

        $rows = [];
        $seen = [];
        for ($r = 2; $r <= $sheet->getHighestDataRow(); $r++) {
            $cell = fn (int $c): string => trim((string) $sheet->getCell([$c, $r])->getValue());
            $country = $cell(1);
            if ($country === '' && $cell(2) === '' && $cell(3) === '') {
                continue;
            }
            $where = "Row {$r}".($country !== '' ? " ({$country})" : '');
            if ($country === '') {
                $errors[] = "{$where}: country is required.";

                continue;
            }
            if ($cell(3) === '') {
                $errors[] = "{$where}: tagline is required.";
            }
            $slug = Str::slug($country);
            if (isset($seen[$slug])) {
                $errors[] = "{$where}: duplicate country.";
            }
            $seen[$slug] = true;

            $seasons = [];
            foreach (['on' => 4, 'off' => 5, 'mid' => 6] as $key => $col) {
                $season = $this->season($cell($col));
                if ($season === null) {
                    $errors[] = "{$where}: the ".$key.' season must look like "Oct–Mar | places | Peak activities: ...".';

                    continue;
                }
                $seasons[$key] = $season;
            }

            $rows[] = [
                'name' => $country, 'slug' => $slug, 'region' => strtolower($country) === 'india' ? 'india' : 'international',
                'tagline' => $cell(3), 'places' => $cell(2), 'seasons' => $seasons, 'best_time' => $seasons['on']['months'] ?? null,
                'image_url' => $this->photo($slug),
            ];
        }
        if ($rows === [] && $errors === []) {
            $errors[] = 'The workbook has no destination rows.';
        }

        return [$rows, $errors];
    }

    /** @return array{months: string, places: string, activities: string}|null */
    private function season(string $text): ?array
    {
        $parts = array_map('trim', explode(' | ', $text));
        $prefix = 'Peak activities:';
        if (count($parts) !== 3 || $parts[0] === '' || $parts[1] === '' || ! str_starts_with($parts[2], $prefix)) {
            return null;
        }

        return ['months' => $parts[0], 'places' => $parts[1], 'activities' => trim(substr($parts[2], strlen($prefix)))];
    }

    private function photo(string $slug): ?string
    {
        $name = self::PHOTO_ALIASES[$slug] ?? $slug;

        return is_file(base_path("../web/public/photos/destinations/{$name}.jpg")) ? "/photos/destinations/{$name}.jpg" : null;
    }
}
