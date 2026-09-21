<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Destination;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class DestinationController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => Destination::query()->withCount('tours')->orderBy('sort')->orderBy('name')->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $data['slug'] = $data['slug'] ?? Str::slug($data['name']);
        $request->merge(['slug' => $data['slug']]);
        $request->validate(['slug' => 'unique:destinations,slug']);

        $d = Destination::create($data);
        AuditLog::record('destination.created', $d, null, $d->only(['name', 'slug']));

        return response()->json(['data' => $d], 201);
    }

    public function update(Request $request, Destination $destination): JsonResponse
    {
        $data = $this->validated($request, $destination);
        $before = $destination->only(array_keys($data));
        $destination->update($data);
        AuditLog::record('destination.updated', $destination, $before, $destination->only(array_keys($data)));

        return response()->json(['data' => $destination->fresh()]);
    }

    public function destroy(Destination $destination): JsonResponse
    {
        if ($destination->tours()->exists()) {
            return response()->json(['message' => 'Move or delete this destination’s tours first.'], 422);
        }
        AuditLog::record('destination.deleted', $destination, $destination->only(['name', 'slug']));
        $destination->delete();

        return response()->json(['message' => 'Deleted.']);
    }

    /** @return array<string, mixed> */
    private function validated(Request $request, ?Destination $existing = null): array
    {
        return $request->validate([
            'name' => ($existing ? 'sometimes|' : '').'required|string|max:120',
            'slug' => ['sometimes', 'string', 'max:140', 'regex:/^[a-z0-9-]+$/', Rule::unique('destinations', 'slug')->ignore($existing?->id)],
            'region' => 'sometimes|in:india,international',
            'tagline' => 'nullable|string|max:255',
            'starting_price' => 'nullable|integer|min:0',
            'image_url' => 'nullable|url|max:500',
            'best_time' => 'nullable|string|max:120',
            'seo_content' => 'nullable|array',
            'seo_content.overview' => 'nullable|string|max:5000',
            'seo_content.best_time' => 'nullable|string|max:500',
            'featured' => 'sometimes|boolean',
            'sort' => 'sometimes|integer|min:0|max:65535',
        ]);
    }
}
