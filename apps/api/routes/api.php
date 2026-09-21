<?php

use App\Http\Controllers\Api\DestinationController;
use App\Http\Controllers\Api\LeadController;
use App\Http\Controllers\Api\TestimonialController;
use App\Http\Controllers\Api\TourController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::get('/health', fn () => response()->json([
        'status' => 'ok',
        'app' => config('app.name'),
    ]));

    Route::get('/destinations', [DestinationController::class, 'index'])->name('destinations.index');
    Route::get('/destinations/{slug}', [DestinationController::class, 'show'])->name('destinations.show');

    Route::get('/tours', [TourController::class, 'index'])->name('tours.index');
    Route::get('/tours/{slug}', [TourController::class, 'show'])->name('tours.show');
    Route::get('/tours/{slug}/batches', [TourController::class, 'batches'])->name('tours.batches');

    Route::get('/testimonials', [TestimonialController::class, 'index'])->name('testimonials.index');

    Route::middleware('throttle:10,1')->prefix('leads')->group(function () {
        Route::post('/callback', [LeadController::class, 'callback']);
        Route::post('/quote', [LeadController::class, 'quote']);
        Route::post('/contact', [LeadController::class, 'contact']);
    });
});
