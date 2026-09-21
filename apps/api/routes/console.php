<?php

use App\Http\Controllers\Api\HealthController;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

use Illuminate\Support\Facades\Schedule;

Schedule::call(fn () => Cache::put(HealthController::HEARTBEAT_KEY, now()->toIso8601String(), 3600))->name('scheduler-heartbeat')->everyMinute();
Schedule::command('sanctum:prune-expired --hours=24')->daily();
Schedule::command('bookings:release-expired')->everyMinute()->withoutOverlapping();
Schedule::command('payments:send-reminders')->dailyAt('09:00')->withoutOverlapping();
