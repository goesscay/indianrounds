<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $name
 * @property string $country_code
 * @property string $phone
 * @property string|null $email
 * @property string|null $destination
 * @property int|null $travellers
 * @property Carbon|null $travel_date
 * @property string|null $message
 * @property string $source
 * @property string|null $page
 * @property string $status
 * @property string|null $notes
 * @property int|null $assigned_to
 * @property string|null $company
 * @property array<string, mixed>|null $details
 * @property Carbon|null $created_at
 */
class Lead extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return ['travel_date' => 'date', 'details' => 'array'];
    }
}
