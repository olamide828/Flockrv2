<?php

return [
    // Where copyright claims are emailed, shown on the /copyright page and used as reply-to on our emails.
    'email' => env('LEGAL_EMAIL'),

    // A seller is suspended automatically after this many separate takedown claims. 0 = never suspend automatically.
    'auto_suspend_at' => (int) env('LEGAL_AUTO_SUSPEND_AT', 3),
];
