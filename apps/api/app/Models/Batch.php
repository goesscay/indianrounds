<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $capacity
 * @property int $seats_booked
 * @property string $status
 * @property Carbon $starts_on
 * @property Carbon $ends_on
 * @property-read int $seats_left
 * @property-read bool $is_open
 */
class Batch extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return ['starts_on' => 'date', 'ends_on' => 'date'];
    }

    /** @return BelongsTo<Tour, $this> */
    public function tour(): BelongsTo
    {
        return $this->belongsTo(Tour::class);
    }

    public function getSeatsLeftAttribute(): int
    {
        return max(0, $this->capacity - $this->seats_booked);
    }

    public function getIsOpenAttribute(): bool
    {
        return $this->status === 'open' && $this->seats_left > 0;
    }
}
