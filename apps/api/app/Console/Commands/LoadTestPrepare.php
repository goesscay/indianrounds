<?php

namespace App\Console\Commands;

use App\Models\Batch;
use App\Models\Destination;
use App\Models\Tour;
use App\Models\User;
use Illuminate\Console\Command;

/**
 * Creates an isolated tour with a small batch plus N customer accounts and their API tokens,
 * for `load/booking-load.mjs`. Never runs in production. Tokens are written to a file so the
 * load script can skip the (deliberately rate-limited) register/login endpoints.
 */
class LoadTestPrepare extends Command
{
    protected $signature = 'loadtest:prepare {--users=60 : Customer accounts to create} {--seats=10 : Capacity of the contested batch} {--out=load/tokens.json : Output file, relative to the repo root} {--cleanup : Remove load-test data instead}';

    protected $description = 'Prepare data for the booking concurrency/load test (non-production only)';

    private const SLUG = 'load-test-tour';

    private function cleanup(): void
    {
        // Deleting the users cascades to their bookings, milestones and travellers.
        User::query()->where('email', 'like', 'loadtest+%@example.test')->each(function (User $u) {
            $u->tokens()->delete();
            $u->delete();
        });
        $tour = Tour::query()->where('slug', self::SLUG)->first();
        $tour?->batches()->delete();
        $tour?->delete();
    }

    public function handle(): int
    {
        if (app()->isProduction()) {
            $this->error('Refusing to run in production.');

            return self::FAILURE;
        }

        // Always start clean: earlier runs leave bookings on the contested batch.
        $this->cleanup();
        if ($this->option('cleanup')) {
            $this->info('Load-test data removed.');

            return self::SUCCESS;
        }

        $destination = Destination::query()->firstOrFail();
        $tour = Tour::query()->updateOrCreate(['slug' => self::SLUG], [
            'destination_id' => $destination->id, 'title' => 'Load test tour', 'summary' => 'Not a real tour.', 'tour_type' => 'group', 'haul_class' => 'short',
            'duration_nights' => 2, 'pickup' => 'Chennai', 'drop_point' => 'Chennai', 'overview' => 'Load test', 'highlights' => [], 'itinerary' => [],
            'inclusions' => [], 'exclusions' => [], 'notes' => [], 'must_carry' => [], 'base_price' => 10000, 'original_price' => null, 'featured' => false, 'status' => 'published',
        ]);
        $batch = Batch::query()->create([
            'tour_id' => $tour->id, 'starts_on' => now()->addDays(60)->toDateString(), 'ends_on' => now()->addDays(62)->toDateString(),
            'capacity' => (int) $this->option('seats'), 'seats_booked' => 0, 'status' => 'open',
        ]);

        $users = [];
        for ($i = 1; $i <= (int) $this->option('users'); $i++) {
            $user = User::query()->updateOrCreate(['email' => "loadtest+{$i}@example.test"], [
                'name' => "Load Tester {$i}", 'phone' => '9876543210', 'password' => 'load-test-pass-1', 'gst_state' => 'Tamil Nadu',
            ]);
            $user->tokens()->delete();
            $users[] = ['email' => $user->email, 'token' => $user->createToken('loadtest', ['customer'], now()->addHours(2))->plainTextToken];
        }

        $out = dirname(base_path(), 2).'/'.$this->option('out');
        @mkdir(dirname($out), 0777, true);
        file_put_contents($out, json_encode(['tour' => self::SLUG, 'batch_id' => $batch->id, 'capacity' => $batch->capacity, 'users' => $users], JSON_PRETTY_PRINT));

        $this->info(sprintf('Prepared %d users and a %d-seat batch (id %d). Tokens: %s', count($users), $batch->capacity, $batch->id, $out));

        return self::SUCCESS;
    }
}
