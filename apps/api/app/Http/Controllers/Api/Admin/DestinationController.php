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
        if (array_key_exists('seo_content', $data)) {
            // Fields the client did not send (e.g. the seasons, from a form that only edits the overview) are kept.
            $incoming = $data['seo_content'] ?? [];
            if (isset($incoming['seasons']) && is_array($incoming['seasons'])) {
                $incoming['seasons'] = array_filter($incoming['seasons'], fn ($v) => $v !== null && $v !== []);
            }
            $data['seo_content'] = array_filter(
                array_replace(is_array($destination->seo_content) ? $destination->seo_content : [], $incoming),
                fn ($v) => $v !== null && $v !== [],
            );
        }
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
            'image_url' => ['nullable', 'string', 'max:500', 'regex:#^(https?://|/)\S+$#'], // full link or a site path like /photos/x.jpg
            'best_time' => 'nullable|string|max:120',
            'seo_content' => 'nullable|array',
            'seo_content.overview' => 'nullable|string|max:5000',
            'seo_content.best_time' => 'nullable|string|max:500',
            'seo_content.places' => 'nullable|string|max:500',
            'seo_content.seasons' => 'nullable|array',
            'seo_content.seasons.on' => 'nullable|array',
            'seo_content.seasons.mid' => 'nullable|array',
            'seo_content.seasons.off' => 'nullable|array',
            'seo_content.seasons.*.months' => 'required_with:seo_content.seasons.*|string|max:60',
            'seo_content.seasons.*.places' => 'nullable|string|max:600',
            'seo_content.seasons.*.activities' => 'nullable|string|max:1200',
            'featured' => 'sometimes|boolean',
            'sort' => 'sometimes|integer|min:0|max:65535',
        ]);
    }
}
