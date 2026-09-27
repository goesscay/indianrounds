<?php

return [
    // Where `catalogue:import --images=` copies photos to, and the public URL prefix they are served from.
    // In production point this outside the deployed code (e.g. /srv/uploads/catalogue) and serve /uploads/ from nginx.
    'images_path' => env('CATALOGUE_IMAGES_PATH', base_path('../web/public/uploads/catalogue')),
    'images_url' => env('CATALOGUE_IMAGES_URL', '/uploads/catalogue'),
];
