<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BookingController;
use App\Http\Controllers\Api\DestinationController;
use App\Http\Controllers\Api\GoogleAuthController;
use App\Http\Controllers\Api\LeadController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\RazorpayWebhookController;
use App\Http\Controllers\Api\TestimonialController;
use App\Http\Controllers\Api\TourController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::get('/health', fn () => response()->json([
        'status' => 'ok',
        'app' => config('app.name'),
    ]));

    Route::get('/meta/states', fn () => response()->json(['data' => config('booking.states')]));

    // Catalogue
    Route::get('/destinations', [DestinationController::class, 'index'])->name('destinations.index');
    Route::get('/destinations/{slug}', [DestinationController::class, 'show'])->name('destinations.show');
    Route::get('/tours', [TourController::class, 'index'])->name('tours.index');
    Route::get('/tours/{slug}', [TourController::class, 'show'])->name('tours.show');
    Route::get('/tours/{slug}/batches', [TourController::class, 'batches'])->name('tours.batches');
    Route::get('/testimonials', [TestimonialController::class, 'index'])->name('testimonials.index');

    // Leads
    Route::middleware('throttle:10,1')->prefix('leads')->group(function () {
        Route::post('/callback', [LeadController::class, 'callback']);
        Route::post('/quote', [LeadController::class, 'quote']);
        Route::post('/contact', [LeadController::class, 'contact']);
    });

    // Auth
    Route::prefix('auth')->group(function () {
        Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:10,1');
        Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
        Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:5,1');
        Route::post('/reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:5,1');
        Route::get('/google/redirect', [GoogleAuthController::class, 'redirect']);
        Route::get('/google/callback', [GoogleAuthController::class, 'callback']);
        Route::post('/google/exchange', [GoogleAuthController::class, 'exchange'])->middleware('throttle:20,1');

        Route::middleware('auth:sanctum')->group(function () {
            Route::post('/logout', [AuthController::class, 'logout']);
        });
    });

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::patch('/me', [AuthController::class, 'updateProfile']);

        Route::get('/bookings', [BookingController::class, 'index']);
        Route::post('/bookings', [BookingController::class, 'store'])->middleware('throttle:20,1');
        Route::get('/bookings/{reference}', [BookingController::class, 'show']);
        Route::get('/bookings/{reference}/invoice', [BookingController::class, 'invoice']);

        Route::post('/bookings/{reference}/milestones/{milestone}/order', [PaymentController::class, 'order'])->middleware('throttle:20,1');
        Route::post('/bookings/{reference}/milestones/{milestone}/verify', [PaymentController::class, 'verify'])->middleware('throttle:20,1');
        Route::post('/bookings/{reference}/milestones/{milestone}/simulate', [PaymentController::class, 'simulate']);
    });

    // Payment provider callbacks (signature-verified, no user session)
    Route::post('/webhooks/razorpay', RazorpayWebhookController::class);
});
