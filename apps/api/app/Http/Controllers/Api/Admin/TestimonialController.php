<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Testimonial;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TestimonialController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => Testimonial::query()->orderBy('sort')->orderByDesc('id')->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $t = Testimonial::create($this->validated($request));
        AuditLog::record('testimonial.created', $t, null, $t->only(['name']));

        return response()->json(['data' => $t], 201);
    }

    public function update(Request $request, Testimonial $testimonial): JsonResponse
    {
        $data = $this->validated($request, true);
        $before = $testimonial->only(array_keys($data));
        $testimonial->update($data);
        AuditLog::record('testimonial.updated', $testimonial, $before, $testimonial->only(array_keys($data)));

        return response()->json(['data' => $testimonial->fresh()]);
    }

    public function destroy(Testimonial $testimonial): JsonResponse
    {
        AuditLog::record('testimonial.deleted', $testimonial, $testimonial->only(['name']));
        $testimonial->delete();

        return response()->json(['message' => 'Deleted.']);
    }

    /** @return array<string, mixed> */
    private function validated(Request $request, bool $partial = false): array
    {
        $req = $partial ? 'sometimes|required' : 'required';

        return $request->validate([
            'name' => "{$req}|string|max:120",
            'location' => 'nullable|string|max:120',
            'rating' => 'sometimes|integer|min:1|max:5',
            'quote' => "{$req}|string|max:1000",
            'featured' => 'sometimes|boolean',
            'sort' => 'sometimes|integer|min:0|max:65535',
        ]);
    }
}
