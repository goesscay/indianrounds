<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $reference
 * @property int $user_id
 * @property int|null $booking_id
 * @property string $subject
 * @property string $description
 * @property int $stage
 * @property string $status
 * @property string|null $officer_name
 * @property Carbon|null $acknowledged_at
 * @property Carbon $ack_due_at
 * @property Carbon $resolve_by
 * @property Carbon $statutory_deadline
 * @property Carbon|null $resolved_at
 * @property Carbon $created_at
 */
class Grievance extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'acknowledged_at' => 'datetime',
            'ack_due_at' => 'datetime',
            'resolve_by' => 'datetime',
            'statutory_deadline' => 'datetime',
            'resolved_at' => 'datetime',
        ];
    }
}
