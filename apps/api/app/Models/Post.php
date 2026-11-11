<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $title
 * @property string $slug
 * @property string|null $excerpt
 * @property string $body
 * @property string $content_type
 * @property int|null $destination_id
 * @property string $author_name
 * @property string|null $cover_image_url
 * @property int $read_minutes
 * @property string|null $meta_description
 * @property string $status
 * @property bool $is_featured
 * @property list<array{label: string, value: string}>|null $key_facts
 * @property array<string, mixed>|null $layout
 * @property Carbon|null $published_at
 * @property Destination|null $destination
 */
class Post extends Model
{
    public const TYPES = ['places_to_visit', 'things_to_do', 'places_to_eat', 'places_to_shop', 'travel_journal', 'stories', 'news', 'general'];

    /** Choice settings of the article page layout: setting => [allowed values, default]. */
    public const LAYOUT_CHOICES = [
        'hero_style' => [['overlay', 'banner', 'minimal'], 'overlay'],
        'hero_height' => [['compact', 'standard', 'tall'], 'standard'],
        'sidebar' => [['right', 'left', 'none'], 'right'],
        'content_width' => [['narrow', 'standard', 'wide'], 'standard'],
    ];

    /** On/off blocks of the article page layout: setting => default. */
    public const LAYOUT_TOGGLES = [
        'show_breadcrumbs' => true,
        'show_author_date' => true,
        'show_excerpt' => true,
        'show_quick_facts' => true,
        'show_toc' => true,
        'show_plan_card' => true,
        'show_share' => true,
        'show_disclaimer' => true,
        'show_trips' => true,
        'show_related' => true,
    ];

    /** Optional wording of the "Plan your trip" card; blank uses the standard text. */
    public const LAYOUT_TEXTS = ['cta_title' => 100, 'cta_text' => 200];

    protected $guarded = [];

    /**
     * The saved layout filled in with defaults, so the website never has to guess.
     *
     * @return array<string, mixed>
     */
    public function resolvedLayout(): array
    {
        $saved = is_array($this->layout) ? $this->layout : [];
        $out = [];
        foreach (self::LAYOUT_CHOICES as $key => [$allowed, $default]) {
            $out[$key] = in_array($saved[$key] ?? null, $allowed, true) ? $saved[$key] : $default;
        }
        foreach (self::LAYOUT_TOGGLES as $key => $default) {
            $out[$key] = isset($saved[$key]) ? (bool) $saved[$key] : $default;
        }
        foreach (array_keys(self::LAYOUT_TEXTS) as $key) {
            $out[$key] = isset($saved[$key]) && is_string($saved[$key]) ? $saved[$key] : '';
        }

        return $out;
    }

    protected function casts(): array
    {
        return ['published_at' => 'datetime', 'is_featured' => 'boolean', 'key_facts' => 'array', 'layout' => 'array'];
    }

    protected static function booted(): void
    {
        static::saving(function (Post $post) {
            $post->read_minutes = max(1, (int) ceil(str_word_count(strip_tags($post->body)) / 200));
            if ($post->status === 'published' && $post->published_at === null) {
                $post->published_at = now();
            }
        });
    }

    /** @return BelongsTo<Destination, $this> */
    public function destination(): BelongsTo
    {
        return $this->belongsTo(Destination::class);
    }

    /**
     * @param  Builder<Post>  $query
     * @return Builder<Post>
     */
    public function scopeLive(Builder $query): Builder
    {
        return $query->where('status', 'published')->where('published_at', '<=', now());
    }
}
