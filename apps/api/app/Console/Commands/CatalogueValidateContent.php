<?php

namespace App\Console\Commands;

use App\Services\CatalogueContent;
use Illuminate\Console\Command;

/** Checks catalogue content files against the format without touching the database. */
class CatalogueValidateContent extends Command
{
    protected $signature = 'catalogue:validate-content {files?* : Content files (default: every file in database/data/catalogue)}';

    protected $description = 'Validate catalogue content files (no database needed)';

    public function handle(CatalogueContent $content): int
    {
        $files = $this->argument('files') ?: (glob(CatalogueContent::dir().'/*.json') ?: []);
        $problems = 0;
        foreach ($files as $file) {
            if (! is_file($file)) {
                $this->error("File not found: {$file}");
                $problems++;

                continue;
            }
            $data = json_decode((string) file_get_contents($file), true);
            $errors = is_array($data) ? $content->validate($data) : ['not valid JSON'];
            if (is_array($data) && basename($file, '.json') !== ($data['destination'] ?? null)) {
                $errors[] = 'the file name must match its "destination" slug';
            }
            foreach ($errors as $e) {
                $this->error(basename($file).': '.$e);
                $problems++;
            }
            if ($errors === []) {
                $this->info(basename($file).': OK');
            }
        }

        return $problems === 0 ? self::SUCCESS : self::FAILURE;
    }
}
