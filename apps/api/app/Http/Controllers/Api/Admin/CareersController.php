<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Admin\Concerns\Paginates;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\JobApplication;
use App\Models\JobOpening;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CareersController extends Controller
{
    use Paginates;

    public const STATUSES = ['new', 'shortlisted', 'rejected', 'hired'];

    public function openings(): JsonResponse
    {
        return response()->json(['data' => JobOpening::query()->withCount('applications')->orderBy('sort')->orderByDesc('id')->get()]);
    }

    public function storeOpening(Request $request): JsonResponse
    {
        $o = JobOpening::create($this->openingRules($request));
        AuditLog::record('job_opening.created', $o, null, $o->only(['title', 'status']));

        return response()->json(['data' => $o], 201);
    }

    public function updateOpening(Request $request, JobOpening $opening): JsonResponse
    {
        $data = $this->openingRules($request, true);
        $before = $opening->only(array_keys($data));
        $opening->update($data);
        AuditLog::record('job_opening.updated', $opening, $before, $opening->only(array_keys($data)));

        return response()->json(['data' => $opening->fresh()]);
    }

    public function destroyOpening(JobOpening $opening): JsonResponse
    {
        AuditLog::record('job_opening.deleted', $opening, $opening->only(['title']));
        $opening->delete();

        return response()->json(['message' => 'Deleted.']);
    }

    public function applications(Request $request): JsonResponse
    {
        $q = JobApplication::query()->with('opening:id,title')->latest('id');
        foreach (['status', 'job_opening_id'] as $f) {
            if ($request->filled($f)) {
                $q->where($f, $request->input($f));
            }
        }

        return $this->page($q->paginate(25), fn (JobApplication $a) => [
            'id' => $a->id,
            'opening' => $a->opening->title ?? 'General application',
            'name' => $a->name,
            'email' => $a->email,
            'phone' => $a->phone,
            'gender' => $a->gender,
            'age' => $a->age,
            'profile_url' => $a->profile_url,
            'experience' => $a->experience,
            'message' => $a->message,
            'has_resume' => $a->resume_path !== null,
            'resume_name' => $a->resume_name,
            'status' => $a->status,
            'notes' => $a->notes,
            'created_at' => $a->created_at->toIso8601String(),
        ]);
    }

    public function updateApplication(Request $request, JobApplication $application): JsonResponse
    {
        $data = $request->validate([
            'status' => ['sometimes', Rule::in(self::STATUSES)],
            'notes' => 'sometimes|nullable|string|max:5000',
        ]);
        $before = $application->only(array_keys($data));
        $application->update($data);
        AuditLog::record('job_application.updated', $application, $before, $application->only(array_keys($data)));

        return response()->json(['data' => ['id' => $application->id, 'status' => $application->status, 'notes' => $application->notes]]);
    }

    public function resume(JobApplication $application): StreamedResponse
    {
        abort_if($application->resume_path === null || ! Storage::disk('local')->exists($application->resume_path), 404);
        AuditLog::record('job_application.resume_downloaded', $application);

        return Storage::disk('local')->download($application->resume_path, $application->resume_name ?? 'resume');
    }

    /** @return array<string, mixed> */
    private function openingRules(Request $request, bool $partial = false): array
    {
        $req = $partial ? 'sometimes|required' : 'required';

        return $request->validate([
            'title' => "{$req}|string|max:160",
            'department' => 'nullable|string|max:120',
            'location' => 'nullable|string|max:120',
            'employment_type' => 'sometimes|string|max:60',
            'description' => "{$req}|string|max:10000",
            'status' => 'sometimes|in:open,closed',
            'sort' => 'sometimes|integer|min:0|max:65535',
        ]);
    }
}
