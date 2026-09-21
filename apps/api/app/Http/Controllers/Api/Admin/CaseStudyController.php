<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\CaseStudy;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CaseStudyController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => CaseStudy::query()->orderBy('sort')->orderByDesc('id')->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $c = CaseStudy::create($this->validated($request));
        AuditLog::record('case_study.created', $c, null, $c->only(['client_name', 'published']));

        return response()->json(['data' => $c], 201);
    }

    public function update(Request $request, CaseStudy $caseStudy): JsonResponse
    {
        $data = $this->validated($request, true);
        $before = $caseStudy->only(array_keys($data));
        $caseStudy->update($data);
        AuditLog::record('case_study.updated', $caseStudy, $before, $caseStudy->only(array_keys($data)));

        return response()->json(['data' => $caseStudy->fresh()]);
    }

    public function destroy(CaseStudy $caseStudy): JsonResponse
    {
        AuditLog::record('case_study.deleted', $caseStudy, $caseStudy->only(['client_name']));
        $caseStudy->delete();

        return response()->json(['message' => 'Deleted.']);
    }

    /** @return array<string, mixed> */
    private function validated(Request $request, bool $partial = false): array
    {
        $req = $partial ? 'sometimes|required' : 'required';

        return $request->validate([
            'client_name' => "{$req}|string|max:160",
            'destination' => "{$req}|string|max:120",
            'headcount' => "{$req}|integer|min:1|max:10000",
            'blurb' => "{$req}|string|max:1000",
            'quote' => 'nullable|string|max:1000',
            'quote_name' => 'nullable|string|max:120',
            'quote_title' => 'nullable|string|max:160',
            'published' => 'sometimes|boolean',
            'sort' => 'sometimes|integer|min:0|max:65535',
        ]);
    }
}
