<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Lead extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return ['travel_date' => 'date'];
    }
}
