<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CaseStudy;
use Illuminate\Http\JsonResponse;

class CaseStudyController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => CaseStudy::query()->where('published', true)->orderBy('sort')->orderByDesc('id')
            ->get(['id', 'client_name', 'destination', 'headcount', 'blurb', 'quote', 'quote_name', 'quote_title'])]);
    }
}
