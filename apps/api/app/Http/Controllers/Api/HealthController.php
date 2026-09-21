<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Uptime-monitor endpoint. 503 when the app cannot serve requests (database or cache down);
 * 200 "degraded" when it can but background work looks stuck, which matters because
 * reservation expiry and payment reminders depend on the scheduler.
 */
class HealthController extends Controller
{
    public const HEARTBEAT_KEY = 'scheduler:heartbeat';

    /** Minutes without a scheduler heartbeat before we report degraded. */
    public const STALE_AFTER = 5;

    public function __invoke(): JsonResponse
    {
        $checks = [
            'database' => $this->probe(fn () => DB::select('select 1') !== []),
            'cache' => $this->probe(function () {
                Cache::put('health:probe', '1', 10);

                return Cache::get('health:probe') === '1';
            }),
            'scheduler' => $this->scheduler(),
        ];

        $down = $checks['database'] !== 'ok' || $checks['cache'] !== 'ok';
        $status = $down ? 'down' : ($checks['scheduler'] === 'stale' ? 'degraded' : 'ok');

        return response()->json([
            'status' => $status,
            'app' => config('app.name'),
            'checks' => $checks,
        ], $down ? 503 : 200)->header('Cache-Control', 'no-store');
    }

    private function probe(callable $fn): string
    {
        try {
            return $fn() ? 'ok' : 'fail';
        } catch (Throwable) {
            return 'fail';
        }
    }

    private function scheduler(): string
    {
        try {
            $beat = Cache::get(self::HEARTBEAT_KEY);
        } catch (Throwable) {
            return 'unknown';
        }

        if ($beat === null) {
            return 'unknown';
        }

        return now()->diffInMinutes($beat, true) > self::STALE_AFTER ? 'stale' : 'ok';
    }
}
