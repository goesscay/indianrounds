<?php

namespace App\Console\Commands;

use App\Services\BlogContent;
use Illuminate\Console\Command;

/**
 * Writes the blog article files (database/data/blog/<slug>.md) to the database as published posts.
 */
class BlogSeedPosts extends Command
{
    protected $signature = 'blog:seed-posts {slug? : Only this article (default: every file)}
        {--only-new : Leave articles that already exist untouched}
        {--dry-run : Validate and report without saving}';

    protected $description = 'Check and apply the written blog articles';

    public function handle(BlogContent $blog): int
    {
        $all = BlogContent::slugs();
        $slugs = $this->argument('slug') !== null ? array_values(array_intersect($all, [(string) $this->argument('slug')])) : $all;
        if ($slugs === []) {
            $this->error('No article files found.');

            return self::FAILURE;
        }

        $parsed = [];
        $problems = 0;
        foreach ($slugs as $slug) {
            $r = $blog->parse($slug, (string) file_get_contents(BlogContent::dir()."/{$slug}.md"));
            $errors = [...$r['errors'], ...($r['data'] === [] ? [] : $blog->validate($r['data'], $all))];
            foreach ($errors as $e) {
                $this->error("{$slug}.md: {$e}");
                $problems++;
            }
            $parsed[] = $r['data'];
        }
        if ($problems > 0) {
            $this->error("{$problems} problem(s) found. Nothing was saved.");

            return self::FAILURE;
        }

        if ($this->option('dry-run')) {
            $this->info(count($parsed).' article(s) are valid. Nothing was saved (dry run).');

            return self::SUCCESS;
        }

        $counts = ['created' => 0, 'updated' => 0, 'skipped' => 0];
        foreach ($parsed as $data) {
            $counts[$blog->apply($data, (bool) $this->option('only-new'))]++;
        }
        $this->info("Articles: {$counts['created']} created, {$counts['updated']} updated, {$counts['skipped']} skipped.");

        return self::SUCCESS;
    }
}
