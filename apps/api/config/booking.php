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

    'states' => [
        'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh',
        'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana',
        'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep',
        'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry',
        'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand',
        'West Bengal',
    ],
];
