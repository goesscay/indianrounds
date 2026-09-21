<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LeadController extends Controller
{
    public function callback(Request $request): JsonResponse
    {
        return $this->store($request, 'callback');
    }

    public function quote(Request $request): JsonResponse
    {
        return $this->store($request, 'quote');
    }

    public function contact(Request $request): JsonResponse
    {
        return $this->store($request, 'contact');
    }

    private function store(Request $request, string $source): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:120',
            'country_code' => 'nullable|string|max:8|regex:/^\+\d{1,4}(-\d{1,4})?$/',
            'phone' => 'required|string|regex:/^\d{6,15}$/',
            'email' => 'nullable|email|max:255',
            'destination' => 'nullable|string|max:120',
            'travellers' => 'nullable|integer|min:1|max:100',
            'travel_date' => 'nullable|date|after_or_equal:today',
            'message' => 'nullable|string|max:2000',
            'page' => 'nullable|string|max:255',
        ]);

        Lead::create($data + ['source' => $source, 'country_code' => $data['country_code'] ?? '+91']);

        return response()->json(['message' => 'Thank you! Our travel expert will contact you shortly.'], 201);
    }
}
