<?php

namespace App\Services;

use App\Models\Batch;
use App\Models\Category;
use App\Models\Destination;
use App\Models\Tour;
use App\Models\TourVariant;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use Throwable;

/**
 * Imports the client's package workbook (docs/client-data/IndianRounds_Package_Data_Template.xlsx,
 * built by scripts/build_client_template.py; the sheet/column layout below is the contract).
 *
 * Validate-everything-first: nothing is written unless the whole workbook is clean. Re-importing is
 * safe and idempotent: destinations, categories and tours are matched by slug / Package ID, departures
 * by date, and anything already booked is never removed or shrunk.
 */
class CatalogueImporter
{
    private const FIRST_ROW = 5;

    /** sheet => [field => 1-based column, ...]; only the client-typed columns (auto columns are ignored). */
    private const SHEETS = [
        'Destinations' => ['region' => 1, 'name' => 2, 'tagline' => 3, 'best_time' => 4, 'about' => 5, 'image' => 6, 'homepage' => 7, 'order' => 8],
        'Categories' => ['menu' => 1, 'country' => 2, 'name' => 3, 'description' => 4, 'image' => 5, 'order' => 6],
        'Packages' => [
            'code' => 1, 'title' => 2, 'country' => 3, 'flight' => 4, 'nights' => 5, 'pickup' => 7, 'drop' => 8, 'summary' => 9, 'overview' => 10,
            'price' => 11, 'original' => 12, 'highlights' => 13, 'inclusions' => 14, 'exclusions' => 15, 'notes' => 16, 'must_carry' => 17,
            'image' => 18, 'gallery' => 19, 'featured' => 20, 'status' => 21, 'family' => 22, 'luxury' => 23, 'festival' => 24, 'christmas' => 25,
        ],
        'Placements' => ['code' => 1, 'key' => 2],
        'Itinerary' => ['code' => 1, 'day' => 2, 'title' => 3, 'description' => 4],
        'PriceOptions' => ['code' => 1, 'label' => 2, 'price' => 3, 'original' => 4],
        'Departures' => ['code' => 1, 'start' => 2, 'seats' => 4, 'status' => 5],
    ];

    /** Header text each sheet must start with, to catch a template that was edited or a wrong file. */
    private const HEADERS = [
        'Destinations' => ['Region', 'Country / destination name'],
        'Categories' => ['Menu', 'Country'],
        'Packages' => ['Package ID', 'Package title'],
        'Placements' => ['Package ID', 'Menu | Country | Category'],
        'Itinerary' => ['Package ID', 'Day number'],
        'PriceOptions' => ['Package ID', 'Option name'],
        'Departures' => ['Package ID', 'Start date'],
    ];

    /** @var list<string> */
    private array $errors = [];

    /** @var list<string> */
    private array $warnings = [];

    /**
     * @return array{errors: list<string>, warnings: list<string>, summary: array<string, int>}
     */
    public function import(string $file, ?string $imagesDir = null, bool $dryRun = false): array
    {
        $this->errors = $this->warnings = [];

        try {
            $reader = IOFactory::createReaderForFile($file);
            $reader->setReadDataOnly(true);
            $book = $reader->load($file);
        } catch (Throwable $e) {
            return ['errors' => ['Could not open the workbook: '.$e->getMessage()], 'warnings' => [], 'summary' => []];
        }

        $data = [];
        foreach (self::SHEETS as $name => $map) {
            $sheet = $book->getSheetByName($name);
            if ($sheet === null) {
                $this->errors[] = "The workbook has no '{$name}' sheet. Use the original template without renaming sheets.";

                continue;
            }
            if (! $this->headersOk($sheet, $name)) {
                continue;
            }
            $data[$name] = $this->rows($sheet, $map);
        }
        if ($this->errors !== []) {
            return $this->result([]);
        }

        $plan = $this->validate($data);
        if ($this->errors === []) {
            $this->checkImages($plan, $imagesDir, $dryRun);
        }
        if ($this->errors !== [] || $dryRun) {
            return $this->result($this->count($plan));
        }

        DB::transaction(fn () => $this->apply($plan));

        return $this->result($this->count($plan));
    }

    // ------------------------------------------------------------------ reading

    /** @phpstan-impure */
    private function headersOk(Worksheet $sheet, string $name): bool
    {
        foreach (self::HEADERS[$name] as $i => $expected) {
            $got = trim(str_replace(' *', '', (string) $sheet->getCell([$i + 1, 4])->getValue()));
            if (! str_starts_with(strtolower($got), strtolower($expected))) {
                $this->errors[] = "Sheet '{$name}': column ".($i + 1)." header should start with \"{$expected}\" but is \"{$got}\". Do not rename, move or delete columns.";

                return false;
            }
        }

        return true;
    }

    /**
     * @param  array<string, int>  $map
     * @return list<array<string, mixed>>
     */
    private function rows(Worksheet $sheet, array $map): array
    {
        $rows = [];
        $last = $sheet->getHighestDataRow();
        for ($r = self::FIRST_ROW; $r <= $last; $r++) {
            $row = ['_row' => $r];
            $any = false;
            foreach ($map as $field => $col) {
                $v = $sheet->getCell([$col, $r])->getValue();
                if (is_string($v)) {
                    $v = trim($v);
                    $v = $v === '' ? null : $v;
                }
                $row[$field] = $v;
                $any = $any || $v !== null;
            }
            if (! $any || $this->isExample($row)) {
                continue;
            }
            $rows[] = $row;
        }

        return $rows;
    }

    /** @param array<string, mixed> $row */
    private function isExample(array $row): bool
    {
        foreach (['code', 'name', 'country', 'menu', 'key'] as $k) {
            $v = $row[$k] ?? null;
            if (is_string($v) && (str_starts_with(strtoupper($v), 'EXAMPLE') || str_starts_with(strtoupper($v), 'EX-'))) {
                return true;
            }
        }

        return false;
    }

    // ------------------------------------------------------------------ validation

    /**
     * @phpstan-impure
     *
     * @param  array<string, list<array<string, mixed>>>  $data
     * @return array<string, mixed>
     */
    private function validate(array $data): array
    {
        $plan = ['destinations' => [], 'categories' => [], 'packages' => [], 'images' => []];

        foreach ($data['Destinations'] as $r) {
            $where = "Destinations row {$r['_row']}";
            $name = $this->text($r['name']);
            if ($name === null) {
                $this->errors[] = "{$where}: country / destination name is required.";

                continue;
            }
            $region = strtolower($this->text($r['region']) ?? '');
            if (! in_array($region, ['india', 'international'], true)) {
                $this->errors[] = "{$where} ({$name}): region must be India or International.";
            }
            if ($this->text($r['tagline']) === null) {
                $this->errors[] = "{$where} ({$name}): tagline is required.";
            }
            if ($this->text($r['image']) === null) {
                $this->errors[] = "{$where} ({$name}): cover image file name is required.";
            }
            $key = Str::slug($name);
            if (isset($plan['destinations'][$key])) {
                $this->errors[] = "{$where} ({$name}): duplicate destination.";
            }
            $plan['destinations'][$key] = [
                'name' => $name, 'region' => $region, 'tagline' => $this->text($r['tagline']), 'best_time' => $this->text($r['best_time']),
                'about' => $this->text($r['about']), 'image' => $this->text($r['image']), 'featured' => $this->yes($r['homepage']),
                'sort' => $this->int($r['order']) ?? 0,
            ];
        }

        foreach ($data['Categories'] as $r) {
            $where = "Categories row {$r['_row']}";
            $menu = $this->menuSlug($r['menu']);
            $country = $this->text($r['country']);
            $name = $this->text($r['name']);
            if ($menu === null) {
                $this->errors[] = "{$where}: menu must be one of ".implode(', ', Category::MENUS).'.';
            }
            if ($country === null || ! isset($plan['destinations'][Str::slug($country)]) && ! Destination::query()->where('slug', Str::slug($country))->exists()) {
                $this->errors[] = "{$where}: country \"{$country}\" is not on the Destinations sheet.";
            }
            if ($name === null) {
                $this->errors[] = "{$where}: category name is required.";
            }
            if ($menu === null || $country === null || $name === null) {
                continue;
            }
            if (str_contains($name, ' | ') || str_contains($country, ' | ')) {
                $this->errors[] = "{$where}: names cannot contain \" | \".";
            }
            $key = $menu.'|'.Str::slug($country).'|'.Str::slug($name);
            if (isset($plan['categories'][$key])) {
                $this->errors[] = "{$where}: duplicate category \"{$name}\" for {$country} in this menu.";
            }
            $plan['categories'][$key] = [
                'menu' => $menu, 'country' => Str::slug($country), 'name' => $name, 'slug' => Str::slug($name),
                'description' => $this->text($r['description']), 'image' => $this->text($r['image']), 'sort' => $this->int($r['order']) ?? 0,
                'label' => Category::MENUS[$menu].' | '.$country.' | '.$name,
            ];
        }

        foreach ($data['Packages'] as $r) {
            $where = "Packages row {$r['_row']}";
            $code = $this->text($r['code']);
            if ($code === null || preg_match('/^[A-Za-z0-9_-]+$/', $code) !== 1) {
                $this->errors[] = "{$where}: Package ID is required (letters, numbers, - and _ only, no spaces).";

                continue;
            }
            $where .= " ({$code})";
            if (isset($plan['packages'][$code])) {
                $this->errors[] = "{$where}: duplicate Package ID.";

                continue;
            }
            $country = $this->text($r['country']);
            if ($country === null || ! isset($plan['destinations'][Str::slug($country)]) && ! Destination::query()->where('slug', Str::slug($country))->exists()) {
                $this->errors[] = "{$where}: country \"{$country}\" is not on the Destinations sheet.";
            }
            $flight = $this->text($r['flight']);
            if ($flight === null || ! in_array(strtolower($flight), ['domestic / short-haul', 'international long-haul'], true)) {
                $this->errors[] = "{$where}: flight type must be picked from the list.";
            }
            $nights = $this->int($r['nights']);
            if ($nights === null || $nights < 1 || $nights > 60) {
                $this->errors[] = "{$where}: nights must be a whole number from 1 to 60.";
            }
            $price = $this->int($r['price']);
            if ($price === null || $price < 1) {
                $this->errors[] = "{$where}: price per person must be a whole number of rupees.";
            }
            $original = $this->int($r['original']);
            if ($r['original'] !== null && ($original === null || ($price !== null && $original < $price))) {
                $this->errors[] = "{$where}: original / MRP price must be a whole number and not lower than the price.";
            }
            foreach (['title' => 'title', 'summary' => 'short summary', 'overview' => 'overview', 'inclusions' => 'inclusions', 'exclusions' => 'exclusions', 'image' => 'cover image file name'] as $f => $label) {
                if ($this->text($r[$f]) === null) {
                    $this->errors[] = "{$where}: {$label} is required.";
                }
            }
            $summary = $this->text($r['summary']);
            if ($summary !== null && mb_strlen($summary) > 300) {
                $this->errors[] = "{$where}: short summary is over 300 characters.";
            }
            $status = strtolower($this->text($r['status']) ?? 'published');
            if (! in_array($status, ['published', 'draft'], true)) {
                $this->errors[] = "{$where}: status must be Published or Draft.";
            }
            $tags = [];
            foreach (['family' => 'family', 'luxury' => 'luxury', 'festival' => 'festival', 'christmas' => 'seasonal-christmas'] as $f => $tag) {
                if ($this->yes($r[$f])) {
                    $tags[] = $tag;
                }
            }
            $plan['packages'][$code] = [
                'code' => $code, 'title' => $this->text($r['title']), 'country' => Str::slug((string) $country), 'long_haul' => strtolower((string) $flight) === 'international long-haul',
                'nights' => $nights, 'pickup' => $this->text($r['pickup']), 'drop' => $this->text($r['drop']), 'summary' => $summary, 'overview' => $this->text($r['overview']),
                'price' => $price, 'original' => $original,
                'highlights' => $this->lines($r['highlights']), 'inclusions' => $this->lines($r['inclusions']), 'exclusions' => $this->lines($r['exclusions']),
                'notes' => $this->lines($r['notes']), 'must_carry' => $this->lines($r['must_carry']),
                'image' => $this->text($r['image']), 'gallery' => $this->list($r['gallery']), 'featured' => $this->yes($r['featured']), 'status' => $status,
                'tags' => $tags, 'placements' => [], 'itinerary' => [], 'variants' => [], 'departures' => [], 'group' => false,
            ];
        }

        foreach ($data['Placements'] as $r) {
            $where = "Placements row {$r['_row']}";
            $code = $this->text($r['code']);
            $key = $this->text($r['key']);
            if ($code === null || ! isset($plan['packages'][$code])) {
                $this->errors[] = "{$where}: Package ID \"{$code}\" is not on the Packages sheet.";

                continue;
            }
            $parts = $key === null ? [] : array_map('trim', explode(' | ', $key));
            $menu = count($parts) === 3 ? $this->menuSlug($parts[0]) : null;
            $catKey = $menu === null ? null : $menu.'|'.Str::slug($parts[1]).'|'.Str::slug($parts[2]);
            if ($catKey === null || ! isset($plan['categories'][$catKey])) {
                $this->errors[] = "{$where} ({$code}): \"{$key}\" is not a category on the Categories sheet.";

                continue;
            }
            if (in_array($catKey, $plan['packages'][$code]['placements'], true)) {
                $this->warnings[] = "{$where} ({$code}): duplicate placement ignored.";

                continue;
            }
            $plan['packages'][$code]['placements'][] = $catKey;
            if ($plan['categories'][$catKey]['country'] !== $plan['packages'][$code]['country']) {
                $this->warnings[] = "{$where} ({$code}): placed under a different country than the package's own country.";
            }
            if ($menu === 'group-tours') {
                $plan['packages'][$code]['group'] = true;
            }
            if ($menu === 'weekend-escapes') {
                $plan['packages'][$code]['tags'][] = 'weekend';
            }
            if ($menu === 'honeymoon') {
                $plan['packages'][$code]['tags'][] = 'couples';
            }
        }

        foreach ($data['Itinerary'] as $r) {
            $where = "Itinerary row {$r['_row']}";
            $code = $this->text($r['code']);
            $day = $this->int($r['day']);
            if ($code === null || ! isset($plan['packages'][$code])) {
                $this->errors[] = "{$where}: Package ID \"{$code}\" is not on the Packages sheet.";

                continue;
            }
            if ($day === null || $day < 1 || $this->text($r['title']) === null || $this->text($r['description']) === null) {
                $this->errors[] = "{$where} ({$code}): day number, day title and description are all required.";

                continue;
            }
            if (isset($plan['packages'][$code]['itinerary'][$day])) {
                $this->errors[] = "{$where} ({$code}): day {$day} appears twice.";

                continue;
            }
            $plan['packages'][$code]['itinerary'][$day] = ['day' => $day, 'title' => $this->text($r['title']), 'description' => $this->text($r['description'])];
        }

        foreach ($data['PriceOptions'] as $r) {
            $where = "PriceOptions row {$r['_row']}";
            $code = $this->text($r['code']);
            $price = $this->int($r['price']);
            $original = $this->int($r['original']);
            if ($code === null || ! isset($plan['packages'][$code])) {
                $this->errors[] = "{$where}: Package ID \"{$code}\" is not on the Packages sheet.";

                continue;
            }
            if ($this->text($r['label']) === null || $price === null || $price < 1 || ($r['original'] !== null && ($original === null || $original < $price))) {
                $this->errors[] = "{$where} ({$code}): option name and a whole-number price are required; original price cannot be lower than the price.";

                continue;
            }
            $plan['packages'][$code]['variants'][$this->text($r['label'])] = ['label' => $this->text($r['label']), 'price' => $price, 'original' => $original];
        }

        foreach ($data['Departures'] as $r) {
            $where = "Departures row {$r['_row']}";
            $code = $this->text($r['code']);
            $start = $this->date($r['start']);
            $seats = $this->int($r['seats']);
            $status = strtolower($this->text($r['status']) ?? 'open');
            if ($code === null || ! isset($plan['packages'][$code])) {
                $this->errors[] = "{$where}: Package ID \"{$code}\" is not on the Packages sheet.";

                continue;
            }
            if ($start === null || $seats === null || $seats < 1 || ! in_array($status, ['open', 'sold out'], true)) {
                $this->errors[] = "{$where} ({$code}): a valid start date, seats (1 or more) and status Open / Sold out are required.";

                continue;
            }
            if ($start->lt(CarbonImmutable::today())) {
                $this->warnings[] = "{$where} ({$code}): start date {$start->toDateString()} is in the past.";
            }
            $plan['packages'][$code]['departures'][$start->toDateString()] = ['start' => $start, 'seats' => $seats, 'status' => str_replace(' ', '_', $status)];
        }

        foreach ($plan['packages'] as $code => $p) {
            $where = "Package {$code}";
            if ($p['placements'] === []) {
                $this->errors[] = "{$where}: not placed anywhere. Add at least one row on the Placements sheet.";
            }
            if ($p['nights'] !== null) {
                $expected = $p['nights'] + 1;
                $days = array_keys($p['itinerary']);
                sort($days);
                if ($days !== range(1, $expected)) {
                    $this->errors[] = "{$where}: itinerary must have exactly days 1 to {$expected} (has ".($days === [] ? 'none' : implode(',', $days)).').';
                }
            }
            if ($p['group'] && $p['departures'] === []) {
                $this->errors[] = "{$where}: is under Group Tours but has no departure dates on the Departures sheet.";
            }
            if (! $p['group'] && $p['departures'] !== []) {
                $this->warnings[] = "{$where}: has departure dates but is not under the Group Tours menu; it will still be bookable on those dates.";
            }
        }

        foreach ($plan['categories'] as $k => $c) {
            $has = false;
            foreach ($plan['packages'] as $p) {
                $has = $has || in_array($k, $p['placements'], true);
            }
            if (! $has) {
                $this->warnings[] = "Category \"{$c['label']}\" has no packages and will not be shown on the website.";
            }
        }

        return $plan;
    }

    // ------------------------------------------------------------------ images

    /** @param array<string, mixed> $plan */
    private function checkImages(array &$plan, ?string $dir, bool $dryRun): void
    {
        $files = [];
        foreach ($plan['destinations'] as $d) {
            $files[] = $d['image'];
        }
        foreach ($plan['categories'] as $c) {
            $files[] = $c['image'];
        }
        foreach ($plan['packages'] as $p) {
            $files[] = $p['image'];
            array_push($files, ...$p['gallery']);
        }
        $files = array_values(array_unique(array_filter($files)));

        if ($dir === null) {
            if ($files !== []) {
                $this->warnings[] = count($files).' image file names are referenced but no --images folder was given: links are set, the files must be copied to the site separately.';
            }
            $plan['images'] = [];

            return;
        }

        $dest = rtrim((string) config('catalogue.images_path'), '/\\');
        foreach ($files as $name) {
            $src = rtrim($dir, '/\\').DIRECTORY_SEPARATOR.$name;
            if (! is_file($src)) {
                $this->errors[] = "Image \"{$name}\" was not found in {$dir}.";

                continue;
            }
            $info = @getimagesize($src);
            if ($info === false || ! in_array($info[2], [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_WEBP], true)) {
                $this->errors[] = "Image \"{$name}\" is not a valid JPG / PNG / WEBP file.";

                continue;
            }
            if (filesize($src) > 5 * 1024 * 1024) {
                $this->warnings[] = "Image \"{$name}\" is over 5 MB; please compress it for faster pages.";
            }
            $plan['images'][$name] = [$src, $dest.DIRECTORY_SEPARATOR.$this->safeName($name)];
        }
        if (! $dryRun && $this->errors === [] && $plan['images'] !== [] && ! is_dir($dest) && ! @mkdir($dest, 0775, true) && ! is_dir($dest)) {
            $this->errors[] = "Cannot create the images folder {$dest}.";
        }
    }

    private function safeName(string $name): string
    {
        return (string) preg_replace('/[^A-Za-z0-9._-]+/', '-', basename($name));
    }

    private function url(?string $file): ?string
    {
        return $file === null ? null : rtrim((string) config('catalogue.images_url'), '/').'/'.$this->safeName($file);
    }

    // ------------------------------------------------------------------ writing

    /** @param array<string, mixed> $plan */
    private function apply(array $plan): void
    {
        foreach ($plan['images'] as [$src, $dst]) {
            copy($src, $dst);
        }

        $destIds = [];
        foreach ($plan['destinations'] as $slug => $d) {
            $model = Destination::query()->firstOrNew(['slug' => $slug]);
            $seo = is_array($model->seo_content) ? $model->seo_content : [];
            if ($d['about'] !== null) {
                $seo['overview'] = $d['about'];
            }
            $model->fill([
                'name' => $d['name'], 'region' => $d['region'], 'tagline' => $d['tagline'], 'best_time' => $d['best_time'],
                'image_url' => $this->url($d['image']), 'featured' => $d['featured'], 'sort' => $d['sort'], 'seo_content' => $seo,
            ])->save();
            $destIds[$slug] = $model->id;
        }
        $destId = fn (string $slug): int => $destIds[$slug] ?? (int) Destination::query()->where('slug', $slug)->value('id');

        $catIds = [];
        foreach ($plan['categories'] as $key => $c) {
            $model = Category::query()->firstOrNew(['menu' => $c['menu'], 'destination_id' => $destId($c['country']), 'slug' => $c['slug']]);
            $model->fill(['name' => $c['name'], 'description' => $c['description'], 'image_url' => $this->url($c['image']), 'sort' => $c['sort']])->save();
            $catIds[$key] = $model->id;
        }

        $owned = ['family', 'luxury', 'festival', 'seasonal-christmas', 'weekend', 'couples'];
        foreach ($plan['packages'] as $code => $p) {
            $tour = Tour::query()->firstOrNew(['code' => $code]);
            $slug = Str::slug($p['title']);
            if (Tour::query()->where('slug', $slug)->where('code', '!=', $code)->exists()) {
                $slug .= '-'.Str::lower($code);
            }
            $kept = array_values(array_diff(is_array($tour->tags) ? $tour->tags : [], $owned));
            $tour->fill([
                'destination_id' => $destId($p['country']), 'slug' => $slug, 'title' => $p['title'], 'summary' => $p['summary'],
                'tour_type' => $p['group'] ? 'group' : 'custom', 'haul_class' => $p['long_haul'] ? 'long' : 'short', 'duration_nights' => $p['nights'],
                'pickup' => $p['pickup'], 'drop_point' => $p['drop'], 'overview' => $p['overview'],
                'highlights' => $p['highlights'], 'itinerary' => array_values($this->sorted($p['itinerary'])), 'inclusions' => $p['inclusions'],
                'exclusions' => $p['exclusions'], 'notes' => $p['notes'], 'must_carry' => $p['must_carry'],
                'image_url' => $this->url($p['image']), 'gallery' => array_map(fn (string $g) => $this->url($g), $p['gallery']),
                'base_price' => $p['price'], 'original_price' => $p['original'], 'featured' => $p['featured'], 'status' => $p['status'],
                'tags' => array_values(array_unique([...$kept, ...$p['tags']])),
            ])->save();

            $tour->categories()->sync(array_map(fn (string $k) => $catIds[$k], $p['placements']));

            $labels = array_keys($p['variants']);
            foreach ($p['variants'] as $v) {
                TourVariant::query()->updateOrCreate(['tour_id' => $tour->id, 'label' => $v['label']], ['price' => $v['price'], 'original_price' => $v['original']]);
            }
            // Options that bookings already point at are kept so booking history stays intact.
            TourVariant::query()->where('tour_id', $tour->id)->whereNotIn('label', $labels)
                ->whereNotIn('id', DB::table('bookings')->whereNotNull('variant_id')->select('variant_id'))->delete();

            foreach ($p['departures'] as $dep) {
                $batch = Batch::query()->where('tour_id', $tour->id)->whereDate('starts_on', $dep['start']->toDateString())->first()
                    ?? new Batch(['tour_id' => $tour->id, 'starts_on' => $dep['start']->toDateString()]);
                $batch->fill([
                    'ends_on' => $dep['start']->addDays($p['nights'])->toDateString(),
                    'capacity' => max($dep['seats'], (int) $batch->seats_booked),
                    'status' => $dep['status'],
                ])->save();
            }
        }

        foreach ($plan['destinations'] as $slug => $_) {
            $min = Tour::query()->published()->where('destination_id', $destIds[$slug])->min('base_price');
            Destination::query()->whereKey($destIds[$slug])->update(['starting_price' => $min]);
        }
    }

    /**
     * @param  array<int, array<string, mixed>>  $items
     * @return array<int, array<string, mixed>>
     */
    private function sorted(array $items): array
    {
        ksort($items);

        return $items;
    }

    // ------------------------------------------------------------------ helpers

    /** @param array<string, mixed> $plan @return array<string, int> */
    private function count(array $plan): array
    {
        if ($plan === []) {
            return [];
        }

        return [
            'destinations' => count($plan['destinations']), 'categories' => count($plan['categories']), 'packages' => count($plan['packages']),
            'itinerary_days' => array_sum(array_map(fn ($p) => count($p['itinerary']), $plan['packages'])),
            'price_options' => array_sum(array_map(fn ($p) => count($p['variants']), $plan['packages'])),
            'departures' => array_sum(array_map(fn ($p) => count($p['departures']), $plan['packages'])),
            'placements' => array_sum(array_map(fn ($p) => count($p['placements']), $plan['packages'])),
            'images' => count($plan['images']),
        ];
    }

    /**
     * @param  array<string, int>  $summary
     * @return array{errors: list<string>, warnings: list<string>, summary: array<string, int>}
     */
    private function result(array $summary): array
    {
        return ['errors' => $this->errors, 'warnings' => $this->warnings, 'summary' => $summary];
    }

    private function text(mixed $v): ?string
    {
        if ($v === null) {
            return null;
        }
        $s = trim(is_scalar($v) ? (string) $v : '');

        return $s === '' ? null : $s;
    }

    private function int(mixed $v): ?int
    {
        if (is_string($v)) {
            $v = str_replace([',', ' '], '', $v);
        }
        if (! is_numeric($v) || (float) $v != (int) (float) $v) {
            return null;
        }

        return (int) (float) $v;
    }

    private function yes(mixed $v): bool
    {
        return in_array(strtolower($this->text($v) ?? ''), ['yes', 'y', 'true', '1'], true);
    }

    private function menuSlug(mixed $v): ?string
    {
        $label = strtolower($this->text($v) ?? '');
        foreach (Category::MENUS as $slug => $name) {
            if ($label === strtolower($name) || $label === $slug) {
                return $slug;
            }
        }

        return null;
    }

    /** @return list<string> one item per line, blanks and simple bullets removed */
    private function lines(mixed $v): array
    {
        $out = [];
        foreach (preg_split('/\r\n|\r|\n/', $this->text($v) ?? '') ?: [] as $line) {
            $line = trim((string) preg_replace('/^\s*(?:[-*\x{2022}]|\d+[.)])\s+/u', '', $line));
            if ($line !== '') {
                $out[] = $line;
            }
        }

        return $out;
    }

    /** @return list<string> */
    private function list(mixed $v): array
    {
        return array_values(array_filter(array_map('trim', explode(',', $this->text($v) ?? '')), fn ($s) => $s !== ''));
    }

    private function date(mixed $v): ?CarbonImmutable
    {
        if ($v === null) {
            return null;
        }
        if (is_numeric($v)) {
            return CarbonImmutable::instance(ExcelDate::excelToDateTimeObject((float) $v))->startOfDay();
        }
        foreach (['d-m-Y', 'd/m/Y', 'Y-m-d', 'd-M-Y', 'j-n-Y'] as $format) {
            try {
                $d = CarbonImmutable::createFromFormat($format, trim((string) $v));
                if ($d !== null && $d->format($format) === trim((string) $v)) {
                    return $d->startOfDay();
                }
            } catch (Throwable) {
            }
        }

        return null;
    }
}
