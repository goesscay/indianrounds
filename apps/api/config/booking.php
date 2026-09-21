<?php

return [
    'gst_rate' => 0.05,

    // State the company is registered in: same-state customers get CGST+SGST, others IGST.
    'company_state' => env('COMPANY_GST_STATE', 'Tamil Nadu'),

    'reservation_minutes' => 15,
    'max_travellers' => 10,

    // Payment schedules (see docs: development plan section 6). Percent = cumulative share of the total.
    'schedules' => [
        'short' => [
            ['percent' => 25, 'days_before' => null],
            ['percent' => 50, 'days_before' => 45],
            ['percent' => 75, 'days_before' => 30],
            ['percent' => 100, 'days_before' => 20],
        ],
        'long' => [
            ['flat_per_person' => 40000, 'days_before' => null],
            ['percent' => 50, 'days_before' => 60],
            ['percent' => 75, 'days_before' => 45],
            ['percent' => 100, 'days_before' => 30],
        ],
    ],

    'cancellation' => [
        // credit_note: the recoverable amount is issued as a credit note (valid 12 months).
        // refund: a refund request is recorded for staff to process.
        'mode' => env('CANCELLATION_MODE', 'credit_note'),
        'credit_validity_months' => 12,
        // Nothing beyond the booking advance is deducted until the first tier's window opens.
        // Tiers apply when days-before-departure is at or below `days`; tightest match wins.
        'tiers' => [
            'short' => [['days' => 20, 'percent' => 100], ['days' => 30, 'percent' => 75], ['days' => 45, 'percent' => 50]],
            'long' => [['days' => 30, 'percent' => 100], ['days' => 45, 'percent' => 75], ['days' => 60, 'percent' => 50]],
        ],
    ],

    'grievance' => [
        'acknowledge_hours' => 48,
        'resolve_days' => 15,
        'statutory_days' => 30,
    ],

    'states' => [
        'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh',
        'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana',
        'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep',
        'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry',
        'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand',
        'West Bengal',
    ],
];
