<?php

namespace App\Console\Commands;

use App\Models\Tour;
use App\Services\CatalogueContent;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Removes the sample prices and departures that catalogue:seed-packages-content added, so those packages show
 * "Get a Free Quote" until real prices are entered. Refuses while any of them has a booking.
 */
class CatalogueClearSamplePricing extends Command
{
    protected $signature = 'catalogue:clear-sample-pricing {--dry-run : Only list what would be cleared}';

    protected $description = 'Clear the sample prices and departures added by the catalogue content';

    public function handle(): int
    {
        $tours = Tour::query()->whereJsonContains('tags', CatalogueContent::SAMPLE_TAG)->get();
        if ($tours->isEmpty()) {
            $this->info('No packages carry sample pricing.');

            return self::SUCCESS;
        }

        $booked = $tours->filter(fn (Tour $t) => $t->batches()->where('seats_booked', '>', 0)->exists());
        if ($booked->isNotEmpty()) {
            $this->error('Bookings exist on: '.$booked->pluck('slug')->implode(', ').'. Nothing was cleared.');

            return self::FAILURE;
        }

        $this->table(['Package', 'Price', 'Departures'], $tours->map(fn (Tour $t) => [$t->slug, $t->base_price ?? '-', $t->batches()->count()])->all());
        if ($this->option('dry-run')) {
            $this->info('Dry run: nothing was changed.');

            return self::SUCCESS;
        }

        DB::transaction(function () use ($tours): void {
            foreach ($tours as $t) {
                $t->batches()->delete();
                $t->base_price = null;
                $t->original_price = null;
                $t->tags = array_values(array_diff($t->tags ?? [], [CatalogueContent::SAMPLE_TAG]));
                $t->save();
            }
        });
        $this->info($tours->count().' package(s) cleared. They now show Get a Free Quote.');

        return self::SUCCESS;
    }
}
