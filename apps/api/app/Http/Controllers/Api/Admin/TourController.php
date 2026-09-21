<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Admin\Concerns\Paginates;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Batch;
use App\Models\Booking;
use App\Models\Tour;
use App\Models\TourVariant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class TourController extends Controller
{
    use Paginates;

    public function index(Request $request): JsonResponse
    {
        $q = Tour::query()->with('destination:id,name,slug')->withCount('batches')->latest('id');
        if ($request->filled('status')) {
            $q->where('status', $request->string('status'));
        }
        if ($request->filled('q')) {
            $term = '%'.str_replace(['%', '_'], ['\\%', '\\_'], (string) $request->string('q')).'%';
            $q->where('title', 'like', $term);
        }

        return $this->page($q->paginate(20), fn (Tour $t) => [
            'id' => $t->id, 'slug' => $t->slug, 'title' => $t->title, 'status' => $t->status, 'featured' => $t->featured,
            'destination' => $t->destination->name, 'duration_nights' => $t->duration_nights, 'price' => $t->base_price,
            'haul_class' => $t->haul_class, 'batches_count' => $t->batches_count,
        ]);
    }

    public function show(Tour $tour): JsonResponse
    {
        $tour->load(['variants', 'batches' => fn ($b) => $b->orderBy('starts_on')]);

        return response()->json(['data' => array_merge($tour->toArray(), ['batches' => $tour->batches->map(fn (Batch $b) => $this->batch($b))->all()])]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $this->guardPublish($request, $data['status'] ?? 'draft', null);
        $data['slug'] = $data['slug'] ?? $this->uniqueSlug($data['title']);
        $request->merge(['slug' => $data['slug']]);
        $request->validate(['slug' => 'unique:tours,slug']);
        $data['status'] ??= 'draft';

        $tour = Tour::create($data);
        AuditLog::record('tour.created', $tour, null, ['title' => $tour->title, 'price' => $tour->base_price, 'status' => $tour->status]);

        return response()->json(['data' => $tour], 201);
    }

    public function update(Request $request, Tour $tour): JsonResponse
    {
        $data = $this->validated($request, $tour);
        if (array_key_exists('status', $data)) {
            $this->guardPublish($request, $data['status'], $tour);
        }

        $before = $tour->only(array_keys($data));
        $tour->update($data);
        AuditLog::record('tour.updated', $tour, $before, $tour->only(array_keys($data)));

        return response()->json(['data' => $tour->fresh()]);
    }

    public function destroy(Tour $tour): JsonResponse
    {
        if (Booking::query()->where('tour_id', $tour->id)->exists()) {
            return response()->json(['message' => 'This tour has bookings. Unpublish it instead of deleting.'], 422);
        }
        AuditLog::record('tour.deleted', $tour, ['title' => $tour->title, 'slug' => $tour->slug]);
        $tour->delete();

        return response()->json(['message' => 'Deleted.']);
    }

    // Variants

    public function storeVariant(Request $request, Tour $tour): JsonResponse
    {
        $v = $tour->variants()->create($request->validate([
            'label' => 'required|string|max:160',
            'price' => 'required|integer|min:1',
            'original_price' => 'nullable|integer|min:0',
        ]));
        AuditLog::record('variant.created', $v, null, $v->only(['label', 'price']));

        return response()->json(['data' => $v], 201);
    }

    public function updateVariant(Request $request, TourVariant $variant): JsonResponse
    {
        $data = $request->validate([
            'label' => 'sometimes|required|string|max:160',
            'price' => 'sometimes|required|integer|min:1',
            'original_price' => 'nullable|integer|min:0',
        ]);
        $before = $variant->only(array_keys($data));
        $variant->update($data);
        AuditLog::record('variant.updated', $variant, $before, $variant->only(array_keys($data)));

        return response()->json(['data' => $variant->fresh()]);
    }

    public function destroyVariant(TourVariant $variant): JsonResponse
    {
        if (Booking::query()->where('variant_id', $variant->id)->exists()) {
            return response()->json(['message' => 'This option has bookings and cannot be deleted.'], 422);
        }
        AuditLog::record('variant.deleted', $variant, $variant->only(['label', 'price']));
        $variant->delete();

        return response()->json(['message' => 'Deleted.']);
    }

    // Batches (departures)

    public function storeBatch(Request $request, Tour $tour): JsonResponse
    {
        $data = $request->validate([
            'starts_on' => 'required|date|after:today',
            'ends_on' => 'required|date|after_or_equal:starts_on',
            'capacity' => 'required|integer|min:1|max:500',
        ]);
        $b = $tour->batches()->create($data + ['status' => 'open', 'seats_booked' => 0]);
        AuditLog::record('batch.created', $b, null, $b->only(['starts_on', 'ends_on', 'capacity']));

        return response()->json(['data' => $this->batch($b)], 201);
    }

    public function updateBatch(Request $request, Batch $batch): JsonResponse
    {
        $data = $request->validate([
            'starts_on' => 'sometimes|date',
            'ends_on' => 'sometimes|date',
            'capacity' => 'sometimes|integer|min:1|max:500',
            'status' => ['sometimes', Rule::in(['open', 'sold_out'])],
        ]);

        $capacity = $data['capacity'] ?? $batch->capacity;
        if ($capacity < $batch->seats_booked) {
            throw ValidationException::withMessages(['capacity' => "{$batch->seats_booked} seats are already booked; capacity cannot go below that."]);
        }
        $full = $batch->seats_booked >= $capacity;
        if ($full && ($data['status'] ?? null) === 'open') {
            throw ValidationException::withMessages(['status' => 'The departure is full, so it cannot be open.']);
        }
        if ($full) {
            $data['status'] = 'sold_out';
        }
        if (isset($data['starts_on']) && Booking::query()->where('batch_id', $batch->id)->whereIn('status', ['confirmed', 'pending_payment'])->exists()) {
            throw ValidationException::withMessages(['starts_on' => 'Bookings exist for this departure; contact the travellers before moving the date.']);
        }

        $before = $batch->only(array_keys($data));
        $batch->update($data);
        AuditLog::record('batch.updated', $batch, $before, $batch->only(array_keys($data)));

        return response()->json(['data' => $this->batch($batch->fresh() ?? $batch)]);
    }

    public function destroyBatch(Batch $batch): JsonResponse
    {
        if (Booking::query()->where('batch_id', $batch->id)->exists()) {
            return response()->json(['message' => 'This departure has bookings and cannot be deleted.'], 422);
        }
        AuditLog::record('batch.deleted', $batch, $batch->only(['starts_on', 'capacity']));
        $batch->delete();

        return response()->json(['message' => 'Deleted.']);
    }

    /** @return array<string, mixed> */
    private function batch(Batch $b): array
    {
        return [
            'id' => $b->id,
            'starts_on' => $b->starts_on->toDateString(),
            'ends_on' => $b->ends_on->toDateString(),
            'capacity' => $b->capacity,
            'seats_booked' => $b->seats_booked,
            'status' => $b->status,
        ];
    }

    /** Only Admins (tours.publish) may publish; staff can save drafts. */
    private function guardPublish(Request $request, string $newStatus, ?Tour $tour): void
    {
        $changing = $tour === null ? $newStatus === 'published' : $tour->status !== $newStatus;
        if ($changing && ($newStatus === 'published' || $tour?->status === 'published') && ! $request->user()->hasPermissionTo('tours.publish')) {
            throw ValidationException::withMessages(['status' => 'Only an Admin can publish or unpublish a tour.']);
        }
    }

    private function uniqueSlug(string $title): string
    {
        $base = Str::slug($title) ?: 'tour';
        $slug = $base;
        for ($i = 2; Tour::query()->where('slug', $slug)->exists(); $i++) {
            $slug = "{$base}-{$i}";
        }

        return $slug;
    }

    /** @return array<string, mixed> */
    private function validated(Request $request, ?Tour $existing = null): array
    {
        $req = $existing ? 'sometimes|required' : 'required';

        return $request->validate([
            'destination_id' => "{$req}|exists:destinations,id",
            'title' => "{$req}|string|max:160",
            'slug' => ['sometimes', 'string', 'max:180', 'regex:/^[a-z0-9-]+$/', Rule::unique('tours', 'slug')->ignore($existing?->id)],
            'summary' => 'nullable|string|max:500',
            'tour_type' => 'sometimes|in:group,custom',
            'haul_class' => 'sometimes|in:short,long',
            'duration_nights' => "{$req}|integer|min:0|max:60",
            'pickup' => 'nullable|string|max:160',
            'drop_point' => 'nullable|string|max:160',
            'overview' => 'nullable|string|max:10000',
            'highlights' => 'nullable|array|max:20',
            'highlights.*' => 'string|max:160',
            'itinerary' => 'nullable|array|max:60',
            'itinerary.*.day' => 'required|integer|min:1',
            'itinerary.*.title' => 'required|string|max:200',
            'itinerary.*.description' => 'required|string|max:3000',
            'inclusions' => 'nullable|array|max:40',
            'inclusions.*' => 'string|max:240',
            'exclusions' => 'nullable|array|max:40',
            'exclusions.*' => 'string|max:240',
            'notes' => 'nullable|array|max:20',
            'notes.*' => 'string|max:400',
            'must_carry' => 'nullable|array|max:40',
            'must_carry.*' => 'string|max:160',
            'image_url' => 'nullable|url|max:500',
            'base_price' => "{$req}|integer|min:1",
            'original_price' => 'nullable|integer|min:0',
            'featured' => 'sometimes|boolean',
            'status' => 'sometimes|in:draft,published',
        ]);
    }
}
