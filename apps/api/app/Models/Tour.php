<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property string $slug
 * @property string $title
 * @property int $duration_nights
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
        ];
    }

    /** @return BelongsTo<Destination, $this> */
    public function destination(): BelongsTo
    {
        return $this->belongsTo(Destination::class);
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

    public function getDurationDaysAttribute(): int
    {
        return $this->duration_nights + 1;
    }
}
