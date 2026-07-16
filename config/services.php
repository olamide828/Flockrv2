<?php

return [

    // ── OpenAI ────────────────────────────────────────────────────────────────
    'openai' => [
        'api_key' => env('OPENAI_API_KEY'),
    ],

    // ── Jina AI ───────────────────────────────────────────────────────────────
    'jina' => [
        'api_key' => env('JINA_API_KEY'),
    ],

    // ── Paystack ──────────────────────────────────────────────────────────────
    'paystack' => [
        'public_key'  => env('PAYSTACK_PUBLIC_KEY'),
        'secret_key'  => env('PAYSTACK_SECRET_KEY'),
        'payment_url' => env('PAYSTACK_PAYMENT_URL', 'https://api.paystack.co'),
    ],

    // ── Flutterwave (alternative — uncomment if switching from Paystack) ───────
    // 'flutterwave' => [
    //     'public_key'  => env('FLW_PUBLIC_KEY'),
    //     'secret_key'  => env('FLW_SECRET_KEY'),
    //     'encryption_key' => env('FLW_ENCRYPTION_KEY'),
    // ],

    // ── Social OAuth ──────────────────────────────────────────────────────────
    'google' => [
        'client_id'     => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect'      => env('GOOGLE_REDIRECT_URI', '/auth/google/callback'),
    ],

    'facebook' => [
        'client_id'     => env('FACEBOOK_APP_ID'),
        'client_secret' => env('FACEBOOK_APP_SECRET'),
        'redirect'      => env('FACEBOOK_REDIRECT_URI', '/auth/facebook/callback'),
    ],

    // ── Mailgun (transactional email) ─────────────────────────────────────────
    'mailgun' => [
        'domain'   => env('MAILGUN_DOMAIN'),
        'secret'   => env('MAILGUN_SECRET'),
        'endpoint' => env('MAILGUN_ENDPOINT', 'api.mailgun.net'),
        'scheme'   => 'https',
    ],

    // ── Termii (Nigerian SMS OTP) ─────────────────────────────────────────────
    'termii' => [
        'api_key'  => env('TERMII_API_KEY'),
        'sender_id'=> env('TERMII_SENDER_ID', 'Flockr'),
    ],

     'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'remove_bg' => [
    'api_key' => env('REMOVE_BG_API_KEY'),
    ],

  

    'terminal' => [
    'secret_key'      => env('TERMINAL_SECRET_KEY'),
    'base_url'        => env('TERMINAL_BASE_URL', 'https://sandbox.terminal.africa/v1'),
    'public_base_url' => env('TERMINAL_PUBLIC_BASE_URL', 'https://api.terminal.africa/v1'),
    'webhook_secret'  => env('TERMINAL_WEBHOOK_SECRET'),
],

];
