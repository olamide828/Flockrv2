<?php

/*
 | Account-deletion retention. Both numbers are in days and can be set in .env.
 |  - deletion_retention_days : grace period after a user deletes their account before personal data is hard-deleted
 |  - legal_retention_days    : how long records we must keep (orders, payouts, wallet, disputes, reports) are kept, anonymised.
 |                              NOTHING deletes these automatically; this value is for your policy text and a future clean-up.
 */
return [
    'deletion_retention_days' => (int) env('FLOCKR_DELETION_RETENTION_DAYS', 30),
    'legal_retention_days'    => (int) env('FLOCKR_LEGAL_RETENTION_DAYS', 2190),
];
