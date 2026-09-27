<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * @property int $id
 * @property string $menu
 * @property int $destination_id
 * @property string $name
 * @property string $slug
 * @property string|null $description
 * @property string|null $image_url
 * @property int $sort
 * @property Destination $destination
 */
class Category extends Model
{
    /** Menu slug => label. The slugs are part of the public URLs (/group-tours, /honeymoon, ...). */
    public const MENUS = [
        'destinations' => 'Destinations',
        'group-tours' => 'Group Tours',
        'weekend-escapes' => 'Weekend Escapes',
        'honeymoon' => 'Honeymoon',
    ];

    protected $guarded = [];

    /** @return BelongsTo<Destination, $this> */
    public function destination(): BelongsTo
    {
        return $this->belongsTo(Destination::class);
    }

    /** @return BelongsToMany<Tour, $this> */
    public function tours(): BelongsToMany
    {
        return $this->belongsToMany(Tour::class);
    }
}
