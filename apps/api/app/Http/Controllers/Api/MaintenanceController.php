<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Site-wide maintenance switch. The public read is what the website checks on every request,
 * so it is uncached and tiny. Only a Super Admin (settings.manage) can change it, and every
 * change is written to the audit log. The API itself keeps serving during maintenance so that
 * payment webhooks and the back office keep working; the website shows the maintenance page.
 */
class MaintenanceController extends Controller
{
    private const KEY = 'maintenance';

    /** @return array{enabled: bool, message: string|null, expected_back: string|null, updated_at: string|null} */
    private function state(): array
    {
        $v = Setting::read(self::KEY);
        $v = is_array($v) ? $v : [];

        return [
            'enabled' => (bool) ($v['enabled'] ?? false),
            'message' => isset($v['message']) && $v['message'] !== '' ? (string) $v['message'] : null,
            'expected_back' => isset($v['expected_back']) && $v['expected_back'] !== '' ? (string) $v['expected_back'] : null,
            'updated_at' => isset($v['updated_at']) ? (string) $v['updated_at'] : null,
        ];
    }

    public function show(): JsonResponse
    {
        return response()->json(['data' => $this->state()])->header('Cache-Control', 'no-store');
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'enabled' => 'required|boolean',
            'message' => 'nullable|string|max:300',
            'expected_back' => 'nullable|string|max:100',
        ]);

        $before = $this->state();
        $after = [
            'enabled' => (bool) $data['enabled'],
            'message' => $data['message'] ?? null,
            'expected_back' => $data['expected_back'] ?? null,
            'updated_at' => now()->toIso8601String(),
        ];
        Setting::query()->updateOrCreate(['key' => self::KEY], ['value' => $after]);
        AuditLog::record($after['enabled'] ? 'maintenance.enabled' : 'maintenance.disabled', null, $before, $after);

        return $this->show();
    }
}
