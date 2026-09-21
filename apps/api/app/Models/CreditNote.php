<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $code
 * @property int $user_id
 * @property int $source_booking_id
 * @property int $amount
 * @property Carbon $issued_on
 * @property Carbon $expires_on
 * @property string $status
 * @property int|null $redeemed_booking_id
 */
class CreditNote extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return ['issued_on' => 'date', 'expires_on' => 'date', 'redeemed_at' => 'datetime'];
    }

    /** @return BelongsTo<Booking, $this> */
    public function sourceBooking(): BelongsTo
    {
        return $this->belongsTo(Booking::class, 'source_booking_id');
    }

    public function isUsable(): bool
    {
        return $this->status === 'active' && $this->expires_on->gte(now()->startOfDay());
    }

    /** Status as shown to customers: an unused note past its expiry reads as expired. */
    public function effectiveStatus(): string
    {
        return $this->status === 'active' && $this->expires_on->lt(now()->startOfDay()) ? 'expired' : $this->status;
    }
}
