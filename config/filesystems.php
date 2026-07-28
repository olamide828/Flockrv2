<?php

return [

    'default' => env('FILESYSTEM_DISK', 'r2'),

    'disks' => [

        'local' => [
            'driver' => 'local',
            'root'   => storage_path('app/private'),
            'serve'  => true,
            'throw'  => false,
        ],

        'public' => [
            'driver'     => 'local',
            'root'       => storage_path('app/public'),
            'url'        => env('APP_URL') . '/storage',
            'visibility' => 'public',
            'throw'      => false,
        ],

        // ── Cloudflare R2 (primary — production) ─────────────────────────────
        'flockr' => [
            'driver'                  => 's3',
            'key'                     => env('AWS_ACCESS_KEY_ID'),
            'secret'                  => env('AWS_SECRET_ACCESS_KEY'),
            'region'                  => env('AWS_DEFAULT_REGION', 'auto'),
            'bucket'                  => env('AWS_BUCKET'),
            'url'                     => env('R2_PUBLIC_URL'),          // CDN URL e.g. https://media.flockr.ng
            'endpoint'                => env('AWS_ENDPOINT'),           // https://<account>.r2.cloudflarestorage.com
            'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', true),
            'throw'                   => true,
            'visibility'              => 'public',
        ],

        // ── AWS S3 (alternative) ──────────────────────────────────────────────
        's3' => [
            'driver'     => 's3',
            'key'        => env('AWS_ACCESS_KEY_ID'),
            'secret'     => env('AWS_SECRET_ACCESS_KEY'),
            'region'     => env('AWS_DEFAULT_REGION', 'us-east-1'),
            'bucket'     => env('AWS_BUCKET'),
            'url'        => env('AWS_URL'),
            'visibility' => 'public',
            'throw'      => true,
        ],
    ],

    'links' => [
        public_path('storage') => storage_path('app/public'),
    ],

];
