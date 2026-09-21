<?php

use App\Http\Controllers\Api\Admin;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BookingController;
use App\Http\Controllers\Api\CreditNoteController;
use App\Http\Controllers\Api\DestinationController;
use App\Http\Controllers\Api\GoogleAuthController;
use App\Http\Controllers\Api\GrievanceController;
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
        Route::post('/me/password', [AuthController::class, 'changePassword'])->middleware('throttle:5,1');
        Route::get('/me/credit-notes', [CreditNoteController::class, 'index']);
        Route::get('/grievances', [GrievanceController::class, 'index']);
        Route::post('/grievances', [GrievanceController::class, 'store'])->middleware('throttle:5,1');
        Route::get('/grievances/{reference}', [GrievanceController::class, 'show']);

        Route::get('/bookings', [BookingController::class, 'index']);
        Route::post('/bookings', [BookingController::class, 'store'])->middleware('throttle:20,1');
        Route::get('/bookings/{reference}', [BookingController::class, 'show']);
        Route::get('/bookings/{reference}/invoice', [BookingController::class, 'invoice']);
        Route::get('/bookings/{reference}/cancellation', [BookingController::class, 'cancellationPreview']);
        Route::post('/bookings/{reference}/cancel', [BookingController::class, 'cancel'])->middleware('throttle:10,1');

        Route::post('/bookings/{reference}/milestones/{milestone}/order', [PaymentController::class, 'order'])->middleware('throttle:20,1');
        Route::post('/bookings/{reference}/milestones/{milestone}/verify', [PaymentController::class, 'verify'])->middleware('throttle:20,1');
        Route::post('/bookings/{reference}/milestones/{milestone}/simulate', [PaymentController::class, 'simulate']);
    });

    // Staff back office. Needs a staff account + a token with the `staff` ability, then a per-route permission.
    Route::prefix('admin')->middleware(['auth:sanctum', 'staff'])->group(function () {
        Route::get('/dashboard', Admin\DashboardController::class);
        Route::get('/destinations', [Admin\DestinationController::class, 'index'])->middleware('permission:destinations.view');
        Route::post('/destinations', [Admin\DestinationController::class, 'store'])->middleware('permission:destinations.manage');
        Route::put('/destinations/{destination}', [Admin\DestinationController::class, 'update'])->middleware('permission:destinations.manage');
        Route::delete('/destinations/{destination}', [Admin\DestinationController::class, 'destroy'])->middleware('permission:destinations.delete');
        Route::get('/tours', [Admin\TourController::class, 'index'])->middleware('permission:tours.view');
        Route::get('/tours/{tour}', [Admin\TourController::class, 'show'])->middleware('permission:tours.view');
        Route::post('/tours', [Admin\TourController::class, 'store'])->middleware('permission:tours.manage');
        Route::put('/tours/{tour}', [Admin\TourController::class, 'update'])->middleware('permission:tours.manage');
        Route::delete('/tours/{tour}', [Admin\TourController::class, 'destroy'])->middleware('permission:tours.delete');
        Route::post('/tours/{tour}/variants', [Admin\TourController::class, 'storeVariant'])->middleware('permission:tours.manage');
        Route::put('/variants/{variant}', [Admin\TourController::class, 'updateVariant'])->middleware('permission:tours.manage');
        Route::delete('/variants/{variant}', [Admin\TourController::class, 'destroyVariant'])->middleware('permission:tours.manage');
        Route::post('/tours/{tour}/batches', [Admin\TourController::class, 'storeBatch'])->middleware('permission:tours.manage');
        Route::put('/batches/{batch}', [Admin\TourController::class, 'updateBatch'])->middleware('permission:tours.manage');
        Route::delete('/batches/{batch}', [Admin\TourController::class, 'destroyBatch'])->middleware('permission:tours.manage');
        Route::get('/testimonials', [Admin\TestimonialController::class, 'index'])->middleware('permission:testimonials.view');
        Route::post('/testimonials', [Admin\TestimonialController::class, 'store'])->middleware('permission:testimonials.manage');
        Route::put('/testimonials/{testimonial}', [Admin\TestimonialController::class, 'update'])->middleware('permission:testimonials.manage');
        Route::delete('/testimonials/{testimonial}', [Admin\TestimonialController::class, 'destroy'])->middleware('permission:testimonials.delete');
        Route::get('/leads', [Admin\LeadController::class, 'index'])->middleware('permission:leads.view');
        Route::put('/leads/{lead}', [Admin\LeadController::class, 'update'])->middleware('permission:leads.manage');
        Route::delete('/leads/{lead}', [Admin\LeadController::class, 'destroy'])->middleware('permission:leads.delete');
        Route::get('/bookings', [Admin\BookingController::class, 'index'])->middleware('permission:bookings.view');
        Route::get('/bookings/{reference}', [Admin\BookingController::class, 'show'])->middleware('permission:bookings.view');
        Route::get('/payments', [Admin\BookingController::class, 'payments'])->middleware('permission:payments.view');
        Route::get('/refunds', [Admin\RefundController::class, 'index'])->middleware('permission:refunds.view');
        Route::post('/refunds/{refund}/process', [Admin\RefundController::class, 'process'])->middleware('permission:refunds.process');
        Route::post('/refunds/{refund}/reject', [Admin\RefundController::class, 'reject'])->middleware('permission:refunds.process');
        Route::get('/credit-notes', [Admin\CreditNoteController::class, 'index'])->middleware('permission:credit_notes.view');
        Route::post('/credit-notes', [Admin\CreditNoteController::class, 'store'])->middleware('permission:credit_notes.issue');
        Route::get('/grievances', [Admin\GrievanceController::class, 'index'])->middleware('permission:grievances.view');
        Route::get('/grievances/{grievance}', [Admin\GrievanceController::class, 'show'])->middleware('permission:grievances.view');
        Route::post('/grievances/{grievance}/acknowledge', [Admin\GrievanceController::class, 'acknowledge'])->middleware('permission:grievances.handle|grievances.escalate');
        Route::post('/grievances/{grievance}/escalate', [Admin\GrievanceController::class, 'escalate'])->middleware('permission:grievances.handle|grievances.escalate');
        Route::post('/grievances/{grievance}/resolve', [Admin\GrievanceController::class, 'resolve'])->middleware('permission:grievances.handle|grievances.escalate');
        Route::get('/customers', [Admin\MiscController::class, 'customers'])->middleware('permission:customers.view');
        Route::get('/users', [Admin\UserController::class, 'index'])->middleware('permission:users.manage');
        Route::post('/users', [Admin\UserController::class, 'store'])->middleware('permission:users.manage');
        Route::put('/users/{user}', [Admin\UserController::class, 'update'])->middleware('permission:users.manage');
        Route::get('/roles', [Admin\MiscController::class, 'roles'])->middleware('permission:users.manage');
        Route::get('/approvals', [Admin\MiscController::class, 'approvals']);
        Route::post('/approvals/{approval}/decide', [Admin\MiscController::class, 'decide'])->middleware('permission:approvals.decide');
        Route::get('/audit', [Admin\MiscController::class, 'audit'])->middleware('permission:audit.view');
        Route::get('/settings', [Admin\MiscController::class, 'settings'])->middleware('permission:settings.manage');
        Route::put('/settings', [Admin\MiscController::class, 'updateSettings'])->middleware('permission:settings.manage');
    });

    // Payment provider callbacks (signature-verified, no user session)
    Route::post('/webhooks/razorpay', RazorpayWebhookController::class);
});
