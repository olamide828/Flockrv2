<?php

// Read from the environment here (not inside controllers) so it still works when config is cached on Laravel Cloud.
return [
    // Secret that sits in the webhook URL you give Terminal / Shipbubble: https://your-domain/api/webhooks/terminal?token=THIS
    'webhook_token' => env('TERMINAL_WEBHOOK_TOKEN'),
];
