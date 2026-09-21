<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Testimonial;

class TestimonialController extends Controller
{
    public function index(): array
    {
        return [
            'data' => Testimonial::query()
                ->where('featured', true)
                ->orderBy('sort')
                ->get(['id', 'name', 'location', 'rating', 'quote', 'avatar_url']),
        ];
    }
}
