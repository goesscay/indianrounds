<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $booking_id
 * @property int $user_id
 * @property int $amount
 * @property string $status
 * @property string|null $reference
 * @property string|null $notes
 * @property Carbon|null $created_at
 */
class Refund extends Model
{
    protected $guarded = [];

    /** @return BelongsTo<Booking, $this> */
    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }
}
