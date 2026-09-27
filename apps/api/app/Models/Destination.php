<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property string $name
 * @property string $slug
 * @property string $region
 * @property array<string, mixed>|null $seo_content
 */
class Destination extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return ['seo_content' => 'array', 'featured' => 'boolean'];
    }

    /** @return HasMany<Category, $this> */
    public function categories(): HasMany
    {
        return $this->hasMany(Category::class);
    }

    /** @return HasMany<Tour, $this> */
    public function tours(): HasMany
    {
        return $this->hasMany(Tour::class);
    }
}
