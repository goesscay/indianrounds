<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property string $slug
 * @property string $title
 * @property int $duration_nights
 * @property list<string>|null $tags
 * @property int|null $base_price
 * @property int|null $original_price
 * @property bool $show_price
 * @property-read int $duration_days
 * @property Destination $destination
 * @property Collection<int, TourVariant> $variants
 * @property Collection<int, Batch> $batches
 */
class Tour extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'highlights' => 'array',
            'itinerary' => 'array',
            'inclusions' => 'array',
            'exclusions' => 'array',
            'notes' => 'array',
            'must_carry' => 'array',
            'gallery' => 'array',
            'tags' => 'array',
            'featured' => 'boolean',
            'show_price' => 'boolean',
        ];
    }

    /** @return BelongsTo<Destination, $this> */
    public function destination(): BelongsTo
    {
        return $this->belongsTo(Destination::class);
    }

    /** @return BelongsToMany<Category, $this> */
    public function categories(): BelongsToMany
    {
        return $this->belongsToMany(Category::class);
    }

    /** @return HasMany<TourVariant, $this> */
    public function variants(): HasMany
    {
        return $this->hasMany(TourVariant::class);
    }

    /** @return HasMany<Batch, $this> */
    public function batches(): HasMany
    {
        return $this->hasMany(Batch::class);
    }

    /**
     * @param  Builder<Tour>  $query
     * @return Builder<Tour>
     */
    public function scopePublished(Builder $query): Builder
    {
        return $query->where('status', 'published');
    }

    /** The price is shown publicly only when one is set and staff have not hidden it. */
    public function priceVisible(): bool
    {
        return $this->base_price !== null && $this->show_price;
    }

    /**
     * Packages with a visible price first (cheapest or dearest first); the rest, which are enquiry-only, last.
     *
     * @param  Builder<Tour>  $query
     * @return Builder<Tour>
     */
    public function scopeOrderByVisiblePrice(Builder $query, string $direction = 'asc'): Builder
    {
        return $query->orderByRaw('case when base_price is null or show_price = false then 1 else 0 end')
            ->orderBy('base_price', $direction === 'desc' ? 'desc' : 'asc');
    }

    public function getDurationDaysAttribute(): int
    {
        return $this->duration_nights + 1;
    }
}
