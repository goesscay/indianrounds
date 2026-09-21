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
 * @property Carbon|null $published_at
 * @property Destination|null $destination
 */
class Post extends Model
{
    public const TYPES = ['places_to_visit', 'things_to_do', 'places_to_eat', 'places_to_shop', 'travel_journal', 'stories', 'news', 'general'];

    protected $guarded = [];

    protected function casts(): array
    {
        return ['published_at' => 'datetime'];
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
