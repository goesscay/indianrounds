<?php

namespace App\Console\Commands;

use App\Models\Booking;
use App\Services\BookingService;
use Illuminate\Console\Command;

class ReleaseExpiredBookings extends Command
{
    protected $signature = 'bookings:release-expired';

    protected $description = 'Release seats held by unpaid bookings whose reservation window has passed';

    public function handle(BookingService $bookings): int
    {
        $released = 0;

        Booking::query()
            ->where('status', 'pending_payment')
            ->where('reserved_until', '<', now())
            ->each(function (Booking $b) use ($bookings, &$released) {
                if ($bookings->expire($b)) {
                    $released++;
                }
            });

        $this->info("Released {$released} expired booking(s).");

        return self::SUCCESS;
    }
}
