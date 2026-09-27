<?php

namespace App\Console\Commands;

use App\Services\CatalogueImporter;
use Illuminate\Console\Command;

class CatalogueImport extends Command
{
    protected $signature = 'catalogue:import {file : Path to the completed client workbook (.xlsx)}
        {--images= : Folder containing the photo files named in the workbook}
        {--dry-run : Validate and show what would be imported, without changing anything}';

    protected $description = 'Import destinations, categories and packages from the client data workbook';

    public function handle(CatalogueImporter $importer): int
    {
        $file = (string) $this->argument('file');
        if (! is_file($file)) {
            $this->error("File not found: {$file}");

            return self::FAILURE;
        }
        $images = $this->option('images') ? (string) $this->option('images') : null;
        if ($images !== null && ! is_dir($images)) {
            $this->error("Images folder not found: {$images}");

            return self::FAILURE;
        }
        $dry = (bool) $this->option('dry-run');

        $r = $importer->import($file, $images, $dry);

        foreach ($r['warnings'] as $w) {
            $this->warn('Warning: '.$w);
        }
        if ($r['errors'] !== []) {
            $this->newLine();
            foreach ($r['errors'] as $e) {
                $this->error($e);
            }
            $this->newLine();
            $this->error(count($r['errors']).' problem(s) found. Nothing was imported. Fix the workbook and run again.');

            return self::FAILURE;
        }

        $this->table(['Item', 'Count'], collect($r['summary'])->map(fn ($n, $k) => [str_replace('_', ' ', $k), $n])->values()->all());
        $this->info($dry ? 'Dry run OK: the workbook is valid. Nothing was changed.' : 'Import complete.');

        return self::SUCCESS;
    }
}
