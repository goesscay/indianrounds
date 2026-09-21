<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string $label
 * @property int $price
 * @property int|null $original_price
 */
class TourVariant extends Model
{
    protected $guarded = [];
}
