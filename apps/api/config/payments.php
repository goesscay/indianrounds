<?php

return [
    // razorpay | fake. "fake" is for local development and tests only and is refused in production.
    'driver' => env('PAYMENT_DRIVER', 'fake'),

    'razorpay' => [
        'key_id' => env('RAZORPAY_KEY_ID'),
        'key_secret' => env('RAZORPAY_KEY_SECRET'),
        'webhook_secret' => env('RAZORPAY_WEBHOOK_SECRET'),
    ],
];
