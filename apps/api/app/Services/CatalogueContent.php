<?php

namespace App\Services;

use App\Models\Batch;
use App\Models\Category;
use App\Models\Destination;
use App\Models\Tour;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

/**
 * Applies a destination's written catalogue content (database/data/catalogue/<destination-slug>.json): photo slots,
 * browse categories ("groups of packages"), the full write-up of existing packages (summary, highlights, inclusions,
 * exclusions, notes, photos) and new group trips with generated departures.
 *
 * Existing packages keep their itinerary, status and any price set in the admin. A package given a "from" price
 * and every group trip price is sample pricing: it is tagged `sample-pricing` so it can be cleared in one step
 * (php artisan catalogue:clear-sample-pricing) once the real prices arrive.
 */
class CatalogueContent
{
    public const SAMPLE_TAG = 'sample-pricing';

    /** Tags that the menu placement implies, as the workbook importer does. */
    private const MENU_TAGS = ['weekend-escapes' => 'weekend', 'honeymoon' => 'couples'];

    public static function dir(): string
    {
        return database_path('data/catalogue');
    }

    public static function photoPath(string $destination, string $slot): string
    {
        return "/photos/places/{$destination}/{$slot}.jpg";
    }

    public static function photoFile(string $destination, string $slot): string
    {
        return base_path('../web/public'.self::photoPath($destination, $slot));
    }

    /**
     * Schema checks that need no database. Returns a list of problems (empty when the file is valid).
     *
     * @param  array<string, mixed>  $data
     * @return list<string>
     */
    public function validate(array $data): array
    {
        $slot = ['required', 'string', 'regex:/^[a-z0-9-]+$/'];
        $text = fn (int $max) => ['required', 'string', "max:{$max}"];
        $strings = fn (string $key, int $min, int $max) => [
            $key => ['required', 'array', "min:{$min}", "max:{$max}"],
            "{$key}.*" => ['required', 'string', 'max:220'],
        ];
        $content = fn (string $p) => array_merge(
            [
                "{$p}.summary" => $text(300),
                "{$p}.pickup" => ['nullable', 'string', 'max:120'],
                "{$p}.drop_point" => ['nullable', 'string', 'max:120'],
                "{$p}.photo" => $slot,
                "{$p}.gallery" => ['required', 'array', 'min:2', 'max:5'],
                "{$p}.gallery.*" => $slot,
            ],
            ...array_map(fn (array $r) => $this->prefixed($p, $strings(...$r)), [['highlights', 4, 8], ['inclusions', 6, 14], ['exclusions', 5, 12], ['notes', 4, 10], ['must_carry', 3, 10]]),
        );

        $rules = array_merge([
            'destination' => ['required', 'string', 'regex:/^[a-z0-9-]+$/'],
            'photos' => ['required', 'array', 'min:6', 'max:14'],
            'photos.*.slot' => $slot,
            'photos.*.query' => $text(90),
            'photos.*.caption' => $text(90),
            'hero' => $slot,
            'categories' => ['required', 'array', 'min:3', 'max:10'],
            'categories.*.menu' => ['required', 'in:'.implode(',', array_keys(Category::MENUS))],
            'categories.*.slug' => ['required', 'string', 'regex:/^[a-z0-9-]+$/'],
            'categories.*.name' => $text(80),
            'categories.*.description' => $text(300),
            'categories.*.photo' => $slot,
            'categories.*.packages' => ['required', 'array', 'min:1'],
            'categories.*.packages.*' => ['required', 'string', 'regex:/^[a-z0-9-]+$/'],
            'packages' => ['present', 'array'],
            'packages.*.slug' => ['required', 'string', 'regex:/^[a-z0-9-]+$/'],
            'packages.*.overview' => ['nullable', 'string', 'max:1500'],
            'packages.*.price' => ['nullable', 'array'],
            'packages.*.price.from' => ['required_with:packages.*.price', 'integer', 'min:5000', 'max:2000000'],
            'group_trips' => ['present', 'array', 'max:4'],
            'group_trips.*.slug' => ['required', 'string', 'regex:/^[a-z0-9-]+$/'],
            'group_trips.*.title' => $text(120),
            'group_trips.*.nights' => ['required', 'integer', 'min:2', 'max:15'],
            'group_trips.*.overview' => $text(1500),
            'group_trips.*.price' => ['required', 'integer', 'min:5000', 'max:2000000'],
            'group_trips.*.original_price' => ['nullable', 'integer', 'gt:group_trips.*.price'],
            'group_trips.*.departures.weekday' => ['required', 'integer', 'min:0', 'max:6'],
            'group_trips.*.departures.count' => ['required', 'integer', 'min:3', 'max:8'],
            'group_trips.*.departures.every_weeks' => ['required', 'integer', 'min:1', 'max:4'],
            'group_trips.*.departures.capacity' => ['required', 'integer', 'min:8', 'max:40'],
            'group_trips.*.itinerary' => ['required', 'array', 'min:3', 'max:16'],
            'group_trips.*.itinerary.*.day' => ['required', 'integer', 'min:1'],
            'group_trips.*.itinerary.*.title' => $text(100),
            'group_trips.*.itinerary.*.description' => $text(1200),
            'honeymoon_trips' => ['nullable', 'array', 'max:3'],
            'honeymoon_trips.*.slug' => ['required', 'string', 'regex:/^[a-z0-9-]+$/'],
            'honeymoon_trips.*.title' => $text(120),
            'honeymoon_trips.*.nights' => ['required', 'integer', 'min:3', 'max:12'],
            'honeymoon_trips.*.overview' => $text(1500),
            'honeymoon_trips.*.price' => ['required', 'integer', 'min:5000', 'max:2000000'],
            'honeymoon_trips.*.original_price' => ['nullable', 'integer', 'gt:honeymoon_trips.*.price'],
            'honeymoon_trips.*.itinerary' => ['required', 'array', 'min:4', 'max:14'],
            'honeymoon_trips.*.itinerary.*.day' => ['required', 'integer', 'min:1'],
            'honeymoon_trips.*.itinerary.*.title' => $text(100),
            'honeymoon_trips.*.itinerary.*.description' => $text(1200),
            'custom_trips' => ['nullable', 'array', 'max:6'],
            'custom_trips.*.slug' => ['required', 'string', 'regex:/^[a-z0-9-]+$/'],
            'custom_trips.*.title' => $text(120),
            'custom_trips.*.nights' => ['required', 'integer', 'min:2', 'max:15'],
            'custom_trips.*.overview' => $text(1500),
            'custom_trips.*.price' => ['nullable', 'integer', 'min:3000', 'max:2000000'],
            'custom_trips.*.original_price' => ['nullable', 'integer', 'gt:custom_trips.*.price'],
            'custom_trips.*.itinerary' => ['required', 'array', 'min:3', 'max:16'],
            'custom_trips.*.itinerary.*.day' => ['required', 'integer', 'min:1'],
            'custom_trips.*.itinerary.*.title' => $text(100),
            'custom_trips.*.itinerary.*.description' => $text(1200),
            'destination_record' => ['nullable', 'array'],
            'destination_record.name' => ['required_with:destination_record', 'string', 'max:120'],
            'destination_record.region' => ['required_with:destination_record', 'in:india,international'],
            'destination_record.tagline' => ['required_with:destination_record', 'string', 'max:255'],
            'destination_record.best_time' => ['required_with:destination_record', 'string', 'max:120'],
            'destination_record.places' => ['required_with:destination_record', 'string', 'max:500'],
            'destination_record.sort' => ['nullable', 'integer', 'min:0', 'max:65535'],
            'destination_record.seasons' => ['required_with:destination_record', 'array'],
            'destination_record.seasons.*.months' => ['required', 'string', 'max:60'],
            'destination_record.seasons.*.places' => ['required', 'string', 'max:600'],
            'destination_record.seasons.*.activities' => ['required', 'string', 'max:1200'],
            'destination_record.profile' => ['required_with:destination_record', 'array'],
            'destination_record.profile.overview' => ['required_with:destination_record', 'string', 'max:5000'],
            'destination_record.profile.facts' => ['required_with:destination_record', 'array'],
            'destination_record.profile.facts.*' => ['string', 'max:200'],
            'destination_record.profile.travel_info' => ['required_with:destination_record', 'array'],
            'destination_record.profile.travel_info.*' => ['string', 'max:1500'],
            'destination_record.profile.reasons' => ['required_with:destination_record', 'array', 'min:4', 'max:12'],
            'destination_record.profile.attractions' => ['required_with:destination_record', 'array', 'min:6', 'max:16'],
            'destination_record.profile.experiences' => ['required_with:destination_record', 'array', 'min:5', 'max:16'],
            'destination_record.profile.food' => ['required_with:destination_record', 'array', 'min:4', 'max:12'],
            'destination_record.profile.tips' => ['required_with:destination_record', 'array', 'min:5', 'max:12'],
            'destination_record.profile.reasons.*.title' => ['required', 'string', 'max:120'],
            'destination_record.profile.reasons.*.text' => ['nullable', 'string', 'max:700'],
            'destination_record.profile.attractions.*.title' => ['required', 'string', 'max:120'],
            'destination_record.profile.attractions.*.text' => ['nullable', 'string', 'max:700'],
            'destination_record.profile.experiences.*.title' => ['required', 'string', 'max:120'],
            'destination_record.profile.experiences.*.text' => ['nullable', 'string', 'max:700'],
            'destination_record.profile.food.*.title' => ['required', 'string', 'max:120'],
            'destination_record.profile.food.*.text' => ['nullable', 'string', 'max:700'],
            'destination_record.profile.tips.*.title' => ['required', 'string', 'max:120'],
            'destination_record.profile.tips.*.text' => ['nullable', 'string', 'max:700'],
            'destination_record.profile.faqs' => ['required_with:destination_record', 'array', 'min:4', 'max:15'],
            'destination_record.profile.faqs.*.q' => ['required', 'string', 'max:250'],
            'destination_record.profile.faqs.*.a' => ['required', 'string', 'max:1500'],
        ], $content('packages.*'), $content('group_trips.*'), $content('honeymoon_trips.*'), $content('custom_trips.*'));

        $validator = Validator::make($data, $rules);
        $errors = $validator->errors()->all();

        // Cross checks the schema cannot express.
        $slots = array_column(is_array($data['photos'] ?? null) ? $data['photos'] : [], 'slot');
        $known = array_flip(array_filter($slots, 'is_string'));
        $used = [(string) ($data['hero'] ?? '')];
        foreach (['categories', 'packages', 'group_trips', 'honeymoon_trips', 'custom_trips'] as $group) {
            foreach ((array) ($data[$group] ?? []) as $row) {
                $used[] = (string) ($row['photo'] ?? '');
                foreach ((array) ($row['gallery'] ?? []) as $g) {
                    $used[] = (string) $g;
                }
            }
        }
        foreach (array_unique($used) as $s) {
            if ($s !== '' && ! isset($known[$s])) {
                $errors[] = "Photo slot \"{$s}\" is used but not defined in photos.";
            }
        }
        if (count($slots) !== count(array_unique($slots))) {
            $errors[] = 'Photo slots must be unique.';
        }

        $slugs = [];
        foreach (['packages', 'group_trips', 'honeymoon_trips', 'custom_trips'] as $group) {
            foreach ((array) ($data[$group] ?? []) as $row) {
                $slug = (string) ($row['slug'] ?? '');
                if (isset($slugs[$slug])) {
                    $errors[] = "Package \"{$slug}\" appears twice.";
                }
                $slugs[$slug] = $group;
            }
        }
        foreach ([...(array) ($data['group_trips'] ?? []), ...(array) ($data['honeymoon_trips'] ?? []), ...(array) ($data['custom_trips'] ?? [])] as $g) {
            $nights = (int) ($g['nights'] ?? 0);
            $days = array_column((array) ($g['itinerary'] ?? []), 'day');
            if ($days !== range(1, $nights + 1)) {
                $errors[] = "Group trip \"{$g['slug']}\": {$nights} nights needs itinerary days 1 to ".($nights + 1).'.';
            }
        }
        $inMenus = [];
        foreach ((array) ($data['categories'] ?? []) as $c) {
            foreach ((array) ($c['packages'] ?? []) as $p) {
                if (! isset($slugs[$p])) {
                    $errors[] = "Category \"{$c['slug']}\" lists \"{$p}\", which is not in packages, group_trips, honeymoon_trips or custom_trips.";
                }
                if (($c['menu'] ?? '') === 'destinations') {
                    $inMenus[$p] = true;
                }
            }
        }
        foreach ($slugs as $slug => $group) {
            if (! isset($inMenus[$slug])) {
                $errors[] = "Package \"{$slug}\" is not in any category of the destinations menu.";
            }
        }
        foreach ((array) ($data['group_trips'] ?? []) as $g) {
            $inGroupMenu = collect((array) ($data['categories'] ?? []))->contains(fn ($c) => in_array($c['menu'] ?? '', ['group-tours', 'weekend-escapes'], true) && in_array($g['slug'] ?? '', (array) ($c['packages'] ?? []), true));
            if (! $inGroupMenu) {
                $errors[] = "Group trip \"{$g['slug']}\" is not in a category of the group-tours or weekend-escapes menu.";
            }
        }

        foreach ((array) ($data['honeymoon_trips'] ?? []) as $g) {
            $inHoneymoon = collect((array) ($data['categories'] ?? []))->contains(fn ($c) => ($c['menu'] ?? '') === 'honeymoon' && in_array($g['slug'] ?? '', (array) ($c['packages'] ?? []), true));
            if (! $inHoneymoon) {
                $errors[] = "Honeymoon trip \"{$g['slug']}\" is not in a category of the honeymoon menu.";
            }
        }

        return array_values(array_unique($errors));
    }

    /**
     * @param  array<string, mixed>  $data  A validated file
     * @return array{tours: int, created: int, categories: int, photos_missing: list<string>, missing_tours: list<string>}
     */
    public function apply(array $data, bool $withPhotos, bool $force, bool $dryRun): array
    {
        if ($dryRun) {
            // Run everything so the counts are real, then undo it.
            DB::beginTransaction();
            try {
                return $this->applyAll($data, $withPhotos, $force);
            } finally {
                DB::rollBack();
            }
        }

        return DB::transaction(fn () => $this->applyAll($data, $withPhotos, $force));
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array{tours: int, created: int, categories: int, photos_missing: list<string>, missing_tours: list<string>}
     */
    private function applyAll(array $data, bool $withPhotos, bool $force): array
    {
        $destination = Destination::query()->where('slug', $data['destination'])->first();
        if ($destination === null && is_array($data['destination_record'] ?? null)) {
            $destination = $this->createDestination($data['destination'], $data['destination_record']);
        }
        $destination ??= Destination::query()->where('slug', $data['destination'])->firstOrFail();
        $dest = $destination->slug;
        $summary = ['tours' => 0, 'created' => 0, 'categories' => 0, 'photos_missing' => [], 'missing_tours' => []];

        $photo = function (?string $slot) use ($dest, $withPhotos, &$summary): ?string {
            if (! $withPhotos || $slot === null) {
                return null;
            }
            if (! is_file(self::photoFile($dest, $slot))) {
                $summary['photos_missing'][] = $slot;

                return null;
            }

            return self::photoPath($dest, $slot);
        };
        $gallery = fn (array $slots) => array_values(array_filter(array_map($photo, $slots)));

        foreach (['packages', 'group_trips'] as $group) {
            foreach ($data[$group] as $row) {
                if ($group === 'packages' && ! Tour::query()->where('slug', $row['slug'])->where('destination_id', $destination->id)->exists()) {
                    $summary['missing_tours'][] = $row['slug'];
                }
            }
        }
        if ($summary['missing_tours'] !== []) {
            return $summary;
        }

        $run = function () use ($data, $destination, $photo, $gallery, $force, &$summary): void {
            $tours = [];
            foreach ($data['packages'] as $row) {
                $tour = Tour::query()->where('slug', $row['slug'])->firstOrFail();
                $fields = [
                    'summary' => $row['summary'], 'overview' => $row['overview'] ?? $tour->overview,
                    'highlights' => $row['highlights'], 'inclusions' => $row['inclusions'], 'exclusions' => $row['exclusions'],
                    'notes' => $row['notes'], 'must_carry' => $row['must_carry'], 'pickup' => $row['pickup'] ?? null, 'drop_point' => $row['drop_point'] ?? null,
                ];
                $tour->fill($fields);
                $this->applyImages($tour, $row, $photo, $gallery, $force);
                if (isset($row['price']['from']) && ($tour->base_price === null || $this->isSample($tour))) {
                    $tour->base_price = (int) $row['price']['from'];
                    $tour->show_price = true;
                    $tour->tags = $this->withTag($tour->tags, self::SAMPLE_TAG);
                }
                $tour->save();
                $tours[$row['slug']] = $tour;
                $summary['tours']++;
            }

            foreach ($data['group_trips'] as $row) {
                $tour = Tour::query()->firstOrNew(['slug' => $row['slug']]);
                if (! $tour->exists) {
                    $summary['created']++;
                    $tour->fill(['slug' => $row['slug'], 'code' => mb_substr('content-'.$row['slug'], 0, 60), 'status' => 'published', 'featured' => false]);
                }
                $tour->fill([
                    'destination_id' => $destination->id, 'title' => $row['title'], 'tour_type' => 'group',
                    'haul_class' => $destination->region === 'india' ? 'short' : 'long', 'duration_nights' => $row['nights'],
                    'summary' => $row['summary'], 'overview' => $row['overview'], 'highlights' => $row['highlights'], 'itinerary' => $row['itinerary'],
                    'inclusions' => $row['inclusions'], 'exclusions' => $row['exclusions'], 'notes' => $row['notes'], 'must_carry' => $row['must_carry'],
                    'pickup' => $row['pickup'] ?? null, 'drop_point' => $row['drop_point'] ?? null,
                    'base_price' => $row['price'], 'original_price' => $row['original_price'] ?? null, 'show_price' => true,
                    'tags' => $this->withTag($tour->tags, self::SAMPLE_TAG),
                ]);
                $this->applyImages($tour, $row, $photo, $gallery, true);
                $tour->save();
                if (! $tour->batches()->exists()) {
                    $this->makeDepartures($tour, $row['departures'], (int) $row['nights']);
                }
                $tours[$row['slug']] = $tour;
                $summary['tours']++;
            }

            foreach ($data['honeymoon_trips'] ?? [] as $row) {
                $tour = Tour::query()->firstOrNew(['slug' => $row['slug']]);
                if (! $tour->exists) {
                    $summary['created']++;
                    $tour->fill(['slug' => $row['slug'], 'code' => mb_substr('content-'.$row['slug'], 0, 60), 'status' => 'published', 'featured' => false]);
                }
                $tour->fill([
                    'destination_id' => $destination->id, 'title' => $row['title'], 'tour_type' => 'custom',
                    'haul_class' => $destination->region === 'india' ? 'short' : 'long', 'duration_nights' => $row['nights'],
                    'summary' => $row['summary'], 'overview' => $row['overview'], 'highlights' => $row['highlights'], 'itinerary' => $row['itinerary'],
                    'inclusions' => $row['inclusions'], 'exclusions' => $row['exclusions'], 'notes' => $row['notes'], 'must_carry' => $row['must_carry'],
                    'pickup' => $row['pickup'] ?? null, 'drop_point' => $row['drop_point'] ?? null,
                    'base_price' => $row['price'], 'original_price' => $row['original_price'] ?? null, 'show_price' => true,
                    'tags' => $this->withTag($tour->tags, self::SAMPLE_TAG),
                ]);
                $this->applyImages($tour, $row, $photo, $gallery, true);
                $tour->save();
                $tours[$row['slug']] = $tour;
                $summary['tours']++;
            }

            foreach ($data['custom_trips'] ?? [] as $row) {
                $tour = Tour::query()->firstOrNew(['slug' => $row['slug']]);
                if (! $tour->exists) {
                    $summary['created']++;
                    $tour->fill(['slug' => $row['slug'], 'code' => mb_substr('content-'.$row['slug'], 0, 60), 'status' => 'published', 'featured' => false]);
                }
                $price = $row['price'] ?? null;
                $tour->fill([
                    'destination_id' => $destination->id, 'title' => $row['title'], 'tour_type' => 'custom',
                    'haul_class' => $destination->region === 'india' ? 'short' : 'long', 'duration_nights' => $row['nights'],
                    'summary' => $row['summary'], 'overview' => $row['overview'], 'highlights' => $row['highlights'], 'itinerary' => $row['itinerary'],
                    'inclusions' => $row['inclusions'], 'exclusions' => $row['exclusions'], 'notes' => $row['notes'], 'must_carry' => $row['must_carry'],
                    'pickup' => $row['pickup'] ?? null, 'drop_point' => $row['drop_point'] ?? null,
                    'base_price' => $price, 'original_price' => $price === null ? null : ($row['original_price'] ?? null), 'show_price' => true,
                    'tags' => $price === null ? ($tour->tags ?? []) : $this->withTag($tour->tags, self::SAMPLE_TAG),
                ]);
                $this->applyImages($tour, $row, $photo, $gallery, true);
                $tour->save();
                $tours[$row['slug']] = $tour;
                $summary['tours']++;
            }

            foreach ($data['categories'] as $i => $c) {
                $category = Category::query()->firstOrNew(['menu' => $c['menu'], 'destination_id' => $destination->id, 'slug' => $c['slug']]);
                $category->fill(['name' => $c['name'], 'description' => $c['description'], 'sort' => $category->exists ? $category->sort : 10 + $i]);
                $image = $photo($c['photo'] ?? null);
                if ($image !== null && ($category->image_url === null || $force)) {
                    $category->image_url = $image;
                }
                $category->save();
                $category->tours()->syncWithoutDetaching(array_map(fn (string $s) => $tours[$s]->id, $c['packages']));
                if (isset(self::MENU_TAGS[$c['menu']])) {
                    foreach ($c['packages'] as $s) {
                        $tours[$s]->tags = $this->withTag($tours[$s]->tags, self::MENU_TAGS[$c['menu']]);
                        $tours[$s]->save();
                    }
                }
                $summary['categories']++;
            }

            $heroImage = $photo($data['hero']);
            if ($heroImage !== null && ($destination->image_url === null || $force)) {
                $destination->image_url = $heroImage;
                $destination->save();
            }
        };

        $run();

        return $summary;
    }

    /**
     * @param  array<string, mixed>  $record
     */
    private function createDestination(string $slug, array $record): Destination
    {
        $profile = (array) ($record['profile'] ?? []);

        return Destination::query()->create([
            'slug' => $slug, 'name' => $record['name'], 'region' => $record['region'], 'tagline' => $record['tagline'], 'best_time' => $record['best_time'],
            'featured' => true, 'sort' => $record['sort'] ?? 100,
            'seo_content' => ['places' => $record['places'], 'seasons' => $record['seasons']] + $profile,
        ]);
    }

    /**
     * @param  array<string, mixed>  $row
     */
    private function applyImages(Tour $tour, array $row, callable $photo, callable $gallery, bool $force): void
    {
        $image = $photo($row['photo'] ?? null);
        if ($image !== null && ($tour->image_url === null || $force)) {
            $tour->image_url = $image;
            $tour->gallery = $gallery($row['gallery'] ?? []);
        }
    }

    /**
     * @param  array{weekday: int, count: int, every_weeks: int, capacity: int}  $plan
     */
    private function makeDepartures(Tour $tour, array $plan, int $nights): void
    {
        $date = Carbon::today()->toImmutable()->addDays(21);
        while ($date->dayOfWeek !== $plan['weekday']) {
            $date = $date->addDay();
        }
        for ($i = 0; $i < $plan['count']; $i++) {
            $start = $date->addWeeks($i * $plan['every_weeks']);
            Batch::query()->create(['tour_id' => $tour->id, 'starts_on' => $start->toDateString(), 'ends_on' => $start->addDays($nights)->toDateString(), 'capacity' => $plan['capacity'], 'seats_booked' => 0, 'status' => 'open']);
        }
    }

    public function isSample(Tour $tour): bool
    {
        return in_array(self::SAMPLE_TAG, $tour->tags ?? [], true);
    }

    /**
     * @param  list<string>|null  $tags
     * @return list<string>
     */
    private function withTag(?array $tags, string $tag): array
    {
        return array_values(array_unique([...($tags ?? []), $tag]));
    }

    /**
     * @param  array<string, mixed>  $rules
     * @return array<string, mixed>
     */
    private function prefixed(string $prefix, array $rules): array
    {
        $out = [];
        foreach ($rules as $k => $v) {
            $out["{$prefix}.{$k}"] = $v;
        }

        return $out;
    }
}
