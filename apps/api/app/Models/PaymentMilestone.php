<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $booking_id
 * @property int $sequence
 * @property string $label
 * @property Carbon $due_on
 * @property int $amount
 * @property string $status
 * @property string|null $gateway_order_id
 * @property string|null $gateway_payment_id
 * @property Carbon|null $paid_at
 * @property Booking $booking
 */
class PaymentMilestone extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return ['due_on' => 'date', 'paid_at' => 'datetime'];
    }

    /** @return BelongsTo<Booking, $this> */
    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }
}
