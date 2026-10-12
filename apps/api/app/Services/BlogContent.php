<?php

namespace App\Services;

use App\Models\Destination;
use App\Models\Post;
use Illuminate\Support\Facades\Validator;

/**
 * Reads the written blog articles (database/data/blog/<slug>.md), checks them and saves them as posts.
 * The file format is described in docs/blog-content-format.md.
 *
 * A new article is published straight away, dated `age` days ago. An article that already exists keeps its
 * date and has its text, photo, quick facts and featured flag replaced (use --only-new to leave it alone).
 */
class BlogContent
{
    public const AUTHOR = 'Indian Rounds Team';

    public static function dir(): string
    {
        return database_path('data/blog');
    }

    public static function webFile(string $path): string
    {
        return base_path('../web/public'.$path);
    }

    /** @return list<string> every article slug that has a file */
    public static function slugs(): array
    {
        $files = glob(self::dir().'/*.md') ?: [];
        sort($files);

        return array_map(fn (string $f) => basename($f, '.md'), $files);
    }

    /**
     * Splits an article file into its front matter and body.
     *
     * @return array{data: array<string, mixed>, errors: list<string>}
     */
    public function parse(string $slug, string $text): array
    {
        $text = str_replace("\r\n", "\n", $text);
        if (! preg_match('/\A---\n(.*?)\n---\n(.*)\z/s', $text, $m)) {
            return ['data' => [], 'errors' => ['the file must start with a front matter block between two --- lines']];
        }

        $meta = [];
        $facts = [];
        $inFacts = false;
        $errors = [];
        foreach (explode("\n", $m[1]) as $line) {
            if (trim($line) === '') {
                continue;
            }
            if ($inFacts && preg_match('/^-\s*([^:]+):\s*(.+)$/', $line, $f)) {
                $facts[] = ['label' => trim($f[1]), 'value' => trim($f[2])];

                continue;
            }
            if (! preg_match('/^([a-z_]+):\s*(.*)$/', $line, $kv)) {
                $errors[] = "front matter line not understood: {$line}";

                continue;
            }
            $inFacts = $kv[1] === 'facts';
            if (! $inFacts) {
                $meta[$kv[1]] = trim($kv[2]);
            }
        }

        $data = [
            'slug' => $slug,
            'title' => $meta['title'] ?? '',
            'type' => $meta['type'] ?? '',
            'destination' => ($meta['destination'] ?? '') !== '' ? $meta['destination'] : null,
            'excerpt' => $meta['excerpt'] ?? '',
            'cover' => $meta['cover'] ?? '',
            'featured' => ($meta['featured'] ?? 'no') === 'yes',
            'age' => (int) ($meta['age'] ?? 0),
            'meta' => ($meta['meta'] ?? '') !== '' ? $meta['meta'] : null,
            'facts' => $facts,
            'body' => trim($m[2]),
        ];
        foreach (array_diff(array_keys($meta), ['title', 'type', 'destination', 'excerpt', 'cover', 'featured', 'age', 'meta']) as $unknown) {
            $errors[] = "unknown front matter key: {$unknown}";
        }

        return ['data' => $data, 'errors' => $errors];
    }

    /**
     * @param  array<string, mixed>  $data  a parsed article
     * @param  list<string>  $knownSlugs  slugs of all articles, to check links between them
     * @return list<string> problems (empty when the article is valid)
     */
    public function validate(array $data, array $knownSlugs = []): array
    {
        $v = Validator::make($data, [
            'slug' => ['required', 'regex:/^[a-z0-9-]+$/', 'max:200'],
            'title' => 'required|string|max:90',
            'type' => ['required', 'in:'.implode(',', Post::TYPES)],
            'destination' => 'nullable|string|exists:destinations,slug',
            'excerpt' => 'required|string|min:60|max:200',
            'cover' => ['required', 'regex:#^/photos/\S+\.(jpg|jpeg|png|webp)$#'],
            'age' => 'integer|min:0|max:2000',
            'meta' => 'nullable|string|max:160',
            'facts' => 'array|max:8',
            'facts.*.label' => 'required|string|max:40',
            'facts.*.value' => 'required|string|max:160',
            'body' => 'required|string',
        ], [], ['destination' => 'destination slug']);

        $errors = $v->errors()->all();
        $body = (string) ($data['body'] ?? '');

        if (is_string($data['cover'] ?? null) && $data['cover'] !== '' && ! $v->errors()->has('cover') && ! is_file(self::webFile($data['cover']))) {
            $errors[] = "the cover photo {$data['cover']} does not exist under apps/web/public";
        }
        if (str_word_count(strip_tags($body)) < 400) {
            $errors[] = 'the body is too short (under 400 words)';
        }
        if (preg_match('/^# /m', $body)) {
            $errors[] = 'the body must not contain a top-level "# " heading';
        }
        if (preg_match('/<[a-z][^>]*>/i', $body)) {
            $errors[] = 'the body must not contain HTML';
        }
        preg_match_all('/!\[[^\]]*\]\((\S+?)\)/', $body, $imgs);
        foreach ($imgs[1] as $img) {
            if (! preg_match('#^/photos/\S+$#', $img) || ! is_file(self::webFile($img))) {
                $errors[] = "the image {$img} does not exist under apps/web/public";
            }
        }
        preg_match_all('/\]\(\/blog\/([a-z0-9-]+)\)/', $body, $links);
        foreach (array_unique($links[1]) as $target) {
            if ($knownSlugs !== [] && ! in_array($target, $knownSlugs, true)) {
                $errors[] = "the link /blog/{$target} points to an article that does not exist";
            }
        }
        preg_match_all('/\]\(\/destinations\/([a-z0-9-]+)\)/', $body, $dests);
        foreach (array_unique($dests[1]) as $target) {
            if (! Destination::query()->where('slug', $target)->exists()) {
                $errors[] = "the link /destinations/{$target} points to a destination that does not exist";
            }
        }

        return $errors;
    }

    /**
     * @param  array<string, mixed>  $data  a valid parsed article
     * @return 'created'|'updated'|'skipped'
     */
    public function apply(array $data, bool $onlyNew = false): string
    {
        $existing = Post::query()->where('slug', $data['slug'])->first();
        if ($existing && $onlyNew) {
            return 'skipped';
        }

        $fields = [
            'title' => $data['title'],
            'excerpt' => $data['excerpt'],
            'body' => $data['body'],
            'content_type' => $data['type'],
            'destination_id' => $data['destination'] ? Destination::query()->where('slug', $data['destination'])->value('id') : null,
            'cover_image_url' => $data['cover'],
            'meta_description' => $data['meta'],
            'key_facts' => $data['facts'] === [] ? null : $data['facts'],
            'is_featured' => $data['featured'],
            'status' => 'published',
        ];

        if ($existing) {
            $existing->update($fields);

            return 'updated';
        }

        Post::create($fields + [
            'slug' => $data['slug'],
            'author_name' => self::AUTHOR,
            'published_at' => now()->subDays($data['age'])->setTime(9, 0),
        ]);

        return 'created';
    }
}
