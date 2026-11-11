<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MediaController extends Controller
{
    /** Serves a photo uploaded through the admin (tour packages). */
    public function tour(string $file): StreamedResponse
    {
        abort_unless(Storage::disk('public')->exists("tours/{$file}"), 404);

        return Storage::disk('public')->response("tours/{$file}", null, ['Cache-Control' => 'public, max-age=31536000, immutable', 'X-Content-Type-Options' => 'nosniff']);
    }
}
