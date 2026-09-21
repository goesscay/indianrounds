<?php

/*
 * Role / permission matrix.
 *
 * Roles are `super_admin` plus one role per department and tier: `<department>.admin`
 * and `<department>.staff`. An admin holds the department's staff permissions plus its
 * `admin` extras. Change this file, then run `php artisan db:seed --class=RbacSeeder`.
 */
return [
    'permissions' => [
        'destinations.view', 'destinations.manage', 'destinations.delete',
        'tours.view', 'tours.manage', 'tours.publish', 'tours.delete',
        'testimonials.view', 'testimonials.manage', 'testimonials.delete',
        'leads.view', 'leads.manage', 'leads.delete',
        'bookings.view', 'customers.view', 'payments.view',
        'refunds.view', 'refunds.process',
        'credit_notes.view', 'credit_notes.issue',
        'grievances.view', 'grievances.handle', 'grievances.escalate',
        'posts.view', 'posts.manage', 'posts.publish', 'posts.delete',
        'case_studies.manage', 'case_studies.delete',
        'careers.view', 'careers.manage', 'careers.delete',
        'approvals.decide', 'users.manage', 'audit.view', 'settings.manage',
    ],

    'departments' => [
        'sales' => [
            'label' => 'Sales & Bookings',
            'staff' => ['leads.view', 'leads.manage', 'bookings.view', 'customers.view'],
            'admin' => ['leads.delete', 'payments.view', 'approvals.decide', 'users.manage'],
        ],
        'operations' => [
            'label' => 'Trip Operations',
            'staff' => ['tours.view', 'tours.manage', 'destinations.view', 'bookings.view'],
            'admin' => ['tours.publish', 'tours.delete', 'destinations.manage', 'payments.view', 'approvals.decide', 'users.manage'],
        ],
        'personalised' => [
            'label' => 'Personalised Experiences',
            'staff' => ['leads.view', 'leads.manage', 'tours.view', 'customers.view'],
            'admin' => ['leads.delete', 'approvals.decide', 'users.manage'],
        ],
        'corporate' => [
            'label' => 'Corporate Tours / MICE',
            'staff' => ['leads.view', 'leads.manage', 'testimonials.view', 'testimonials.manage', 'case_studies.manage'],
            'admin' => ['leads.delete', 'testimonials.delete', 'case_studies.delete', 'approvals.decide', 'users.manage'],
        ],
        'finance' => [
            'label' => 'Finance & Payments',
            'staff' => ['bookings.view', 'customers.view', 'payments.view', 'refunds.view', 'refunds.process', 'credit_notes.view', 'credit_notes.issue'],
            'admin' => ['approvals.decide', 'users.manage', 'audit.view'],
        ],
        'content' => [
            'label' => 'Content & Marketing',
            'staff' => ['destinations.view', 'destinations.manage', 'testimonials.view', 'testimonials.manage', 'tours.view', 'posts.view', 'posts.manage', 'case_studies.manage'],
            'admin' => ['destinations.delete', 'testimonials.delete', 'posts.publish', 'posts.delete', 'case_studies.delete', 'approvals.decide', 'users.manage'],
        ],
        'customer_success' => [
            'label' => 'Customer Success & Grievance',
            'staff' => ['grievances.view', 'grievances.handle', 'bookings.view', 'customers.view'],
            'admin' => ['grievances.escalate', 'refunds.view', 'approvals.decide', 'users.manage'],
        ],
        'hr' => [
            'label' => 'HR / Careers',
            'staff' => ['careers.view', 'careers.manage'],
            'admin' => ['careers.delete', 'users.manage'],
        ],
    ],

    // Defaults for the approval thresholds (editable by Super Admin in Settings).
    'settings' => [
        'refund_staff_limit' => 10000,
        'credit_note_staff_limit' => 5000,
    ],
];
