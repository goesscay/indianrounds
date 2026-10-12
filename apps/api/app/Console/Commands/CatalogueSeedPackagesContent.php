<?php

namespace App\Console\Commands;

use App\Services\CatalogueContent;
use Illuminate\Console\Command;

/**
 * Writes the catalogue content files (database/data/catalogue/<destination>.json) to the database: browse categories,
 * the full write-up of each package, new group trips with departures, and the photo paths.
 */
class CatalogueSeedPackagesContent extends Command
{
    protected $signature = 'catalogue:seed-packages-content {destination? : Only this destination slug (default: every file)}
        {--skip-photos : Do not set any photo paths (use before the photo files are in place)}
        {--force : Replace photos that are already set}
        {--dry-run : Validate and report without saving}';

    protected $description = 'Apply the written catalogue content (categories, package details, group trips, photos)';

    public function handle(CatalogueContent $content): int
    {
        $only = $this->argument('destination');
        $files = glob(CatalogueContent::dir().'/*.json') ?: [];
        sort($files);
        if ($only !== null) {
            $files = array_values(array_filter($files, fn (string $f) => basename($f, '.json') === $only));
        }
        if ($files === []) {
            $this->error('No content files found.');

            return self::FAILURE;
        }

        $parsed = [];
        $problems = 0;
        foreach ($files as $file) {
            $data = json_decode((string) file_get_contents($file), true);
            $errors = is_array($data) ? $content->validate($data) : ['not valid JSON'];
            if (is_array($data) && basename($file, '.json') !== ($data['destination'] ?? null)) {
                $errors[] = 'the file name must match its "destination" slug';
            }
            foreach ($errors as $e) {
                $this->error(basename($file).': '.$e);
                $problems++;
            }
            $parsed[] = $data;
        }
        if ($problems > 0) {
            $this->error("{$problems} problem(s) found. Nothing was saved.");

            return self::FAILURE;
        }

        $rows = [];
        $failed = false;
        foreach ($parsed as $data) {
            $r = $content->apply($data, ! $this->option('skip-photos'), (bool) $this->option('force'), (bool) $this->option('dry-run'));
            if ($r['missing_tours'] !== []) {
                $this->error("{$data['destination']}: these packages do not exist on the site: ".implode(', ', $r['missing_tours']));
                $failed = true;

                continue;
            }
            $rows[] = [$data['destination'], $r['tours'], $r['created'], $r['categories'], $r['photos_missing'] === [] ? '-' : count($r['photos_missing']).' missing'];
        }
        $this->table(['Destination', 'Packages', 'New group trips', 'Categories', 'Photos'], $rows);

        if ($failed) {
            return self::FAILURE;
        }
        $this->info($this->option('dry-run') ? 'Dry run OK: nothing was changed.' : 'Catalogue content saved.');

        return self::SUCCESS;
    }
}
