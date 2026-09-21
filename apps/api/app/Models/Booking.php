<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $reference
 * @property int $user_id
 * @property int $tour_id
 * @property int $batch_id
 * @property int|null $variant_id
 * @property string $status
 * @property string $haul_class
 * @property int $traveller_count
 * @property int $unit_price
 * @property int $subtotal
 * @property float $gst_rate
 * @property int $gst_amount
 * @property int $total_amount
 * @property string $gst_state
 * @property string $contact_name
 * @property string $contact_phone
 * @property string $contact_email
 * @property Carbon|null $reserved_until
 * @property Carbon|null $confirmed_at
 * @property Carbon $created_at
 * @property Tour $tour
 * @property Batch $batch
 * @property TourVariant|null $variant
 * @property Collection<int, PaymentMilestone> $milestones
 * @property Collection<int, BookingTraveller> $travellers
 */
class Booking extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'gst_rate' => 'float',
            'reserved_until' => 'datetime',
            'confirmed_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<Tour, $this> */
    public function tour(): BelongsTo
    {
        return $this->belongsTo(Tour::class);
    }

    /** @return BelongsTo<Batch, $this> */
    public function batch(): BelongsTo
    {
        return $this->belongsTo(Batch::class);
    }

    /** @return BelongsTo<TourVariant, $this> */
    public function variant(): BelongsTo
    {
        return $this->belongsTo(TourVariant::class);
    }

    /** @return HasMany<PaymentMilestone, $this> */
    public function milestones(): HasMany
    {
        return $this->hasMany(PaymentMilestone::class)->orderBy('sequence');
    }

    /** @return HasMany<BookingTraveller, $this> */
    public function travellers(): HasMany
    {
        return $this->hasMany(BookingTraveller::class);
    }

    public function getPaidAmountAttribute(): int
    {
        return (int) $this->milestones->where('status', 'paid')->sum('amount');
    }
}
