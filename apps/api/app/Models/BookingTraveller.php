<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string $name
 * @property int|null $age
 * @property string|null $gender
 */
class BookingTraveller extends Model
{
    protected $guarded = [];
}
