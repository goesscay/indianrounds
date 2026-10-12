<?php

namespace App\Console\Commands;

use App\Models\Destination;
use Illuminate\Console\Command;

/**
 * Fills the destination pages with their written profile (overview, quick facts, reasons to visit, attractions,
 * experiences, food, tips, travel info and FAQs) from database/data/destination_profiles.json, keyed by destination slug.
 *
 * Only parts that are still empty are filled, so anything edited in the admin is kept, unless --force is given.
 * Seasons, places and photos are never touched.
 */
class CatalogueSeedDestinationContent extends Command
{
    protected $signature = 'catalogue:seed-destination-content
        {--file= : Path to a profiles JSON file (default: database/data/destination_profiles.json)}
        {--force : Replace parts that already have content}
        {--dry-run : Show what would change without saving}';

    protected $description = 'Fill destination pages with the written profile content (overview, facts, attractions, tips, FAQs)';

    public function handle(): int
    {
        $path = (string) ($this->option('file') ?: database_path('data/destination_profiles.json'));
        if (! is_file($path)) {
            $this->error("File not found: {$path}");

            return self::FAILURE;
        }
        $profiles = json_decode((string) file_get_contents($path), true);
        if (! is_array($profiles)) {
            $this->error('The profiles file is not valid JSON.');

            return self::FAILURE;
        }

        $force = (bool) $this->option('force');
        $dry = (bool) $this->option('dry-run');
        $rows = [];

        foreach ($profiles as $slug => $profile) {
            $destination = Destination::query()->where('slug', $slug)->first();
            if ($destination === null) {
                $this->warn("No destination with the slug \"{$slug}\"; skipped.");

                continue;
            }
            $seo = is_array($destination->seo_content) ? $destination->seo_content : [];
            $filled = [];
            foreach ($profile as $key => $value) {
                $current = $seo[$key] ?? null;
                if ($current === null || $current === [] || $current === '' || $force) {
                    $seo[$key] = $value;
                    $filled[] = $key;
                }
            }
            $rows[] = [$destination->name, $filled === [] ? 'nothing new' : implode(', ', $filled)];
            if (! $dry && $filled !== []) {
                $destination->seo_content = $seo;
                $destination->save();
            }
        }

        $this->table(['Destination', 'Filled'], $rows);
        $this->info($dry ? 'Dry run OK: nothing was changed.' : 'Destination content saved.');

        return self::SUCCESS;
    }
}
