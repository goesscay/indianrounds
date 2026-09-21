<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LeadController extends Controller
{
    public const EVENT_TYPES = ['offsite', 'team_outing', 'conference', 'dealer_meet', 'rewards_recognition', 'other'];

    public const TRAVELLER_TYPES = ['family', 'couple', 'friends', 'solo', 'group'];

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

    /** Corporate / MICE quote request. */
    public function corporate(Request $request): JsonResponse
    {
        return $this->store($request, 'corporate', [
            'company' => 'required|string|max:160',
            'email' => 'required|email|max:255',
            'details.team_size' => 'required|integer|min:5|max:5000',
            'details.event_type' => 'required|in:'.implode(',', self::EVENT_TYPES),
            'details.budget' => 'nullable|string|max:60',
            'details.international' => 'nullable|boolean',
        ]);
    }

    /** Fully customised trip request, handled by the personalised-experiences team. */
    public function custom(Request $request): JsonResponse
    {
        return $this->store($request, 'custom', [
            'email' => 'required|email|max:255',
            'details.traveller_type' => 'required|in:'.implode(',', self::TRAVELLER_TYPES),
            'details.budget' => 'nullable|string|max:60',
            'details.flexible_dates' => 'nullable|boolean',
            'details.interests' => 'nullable|string|max:500',
        ]);
    }

    /**
     * @param  array<string, mixed>  $extraRules
     */
    private function store(Request $request, string $source, array $extraRules = []): JsonResponse
    {
        $data = $request->validate(array_merge([
            'name' => 'required|string|max:120',
            'country_code' => 'nullable|string|max:8|regex:/^\+\d{1,4}(-\d{1,4})?$/',
            'phone' => 'required|string|regex:/^\d{6,15}$/',
            'email' => 'nullable|email|max:255',
            'destination' => 'nullable|string|max:120',
            'travellers' => 'nullable|integer|min:1|max:5000',
            'travel_date' => 'nullable|date|after_or_equal:today',
            'message' => 'nullable|string|max:2000',
            'page' => 'nullable|string|max:255',
        ], $extraRules));

        Lead::create($data + ['source' => $source, 'country_code' => $data['country_code'] ?? '+91']);

        return response()->json(['message' => 'Thank you! Our travel expert will contact you shortly.'], 201);
    }
}
