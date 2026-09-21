<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JobApplication;
use App\Models\JobOpening;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CareersController extends Controller
{
    public function openings(): JsonResponse
    {
        return response()->json(['data' => JobOpening::query()->where('status', 'open')->orderBy('sort')->orderByDesc('id')
            ->get(['id', 'title', 'department', 'location', 'employment_type', 'description'])]);
    }

    public function apply(Request $request): JsonResponse
    {
        $data = $request->validate([
            'job_opening_id' => 'nullable|integer|exists:job_openings,id',
            'name' => 'required|string|max:120',
            'email' => 'required|email|max:255',
            'phone' => 'required|string|regex:/^\d{10,15}$/',
            'gender' => 'nullable|in:male,female,other',
            'age' => 'nullable|integer|min:16|max:80',
            'profile_url' => 'nullable|url|max:255',
            'experience' => 'required|string|max:5000',
            'message' => 'nullable|string|max:5000',
            'resume' => 'nullable|file|mimes:pdf,doc,docx|max:5120',
        ]);

        $resumePath = null;
        $resumeName = null;
        if ($request->hasFile('resume')) {
            $file = $request->file('resume');
            // Private disk: served only through the authorised admin download endpoint.
            $resumePath = $file->store('resumes', 'local');
            $resumeName = mb_substr($file->getClientOriginalName(), 0, 200);
        }

        JobApplication::create(collect($data)->except('resume')->all() + ['resume_path' => $resumePath, 'resume_name' => $resumeName]);

        return response()->json(['message' => 'Thank you! Your application has been received.'], 201);
    }
}
