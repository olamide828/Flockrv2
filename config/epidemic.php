<?php

// Epidemic Sound Partner API (https://developers.epidemicsound.com).
// Get a key in their Developer Portal (Authentication settings -> API keys) and put it in .env:
//   EPIDEMIC_API_KEY=epidemic_live_xxxxxxxx
// The FREE key is for prototyping only: no commercial licence and a 50-download cap. To launch you need a
// partnership agreement with Epidemic Sound. Without a key the "Epidemic" tab simply doesn't appear.
return [
    'key'  => env('EPIDEMIC_API_KEY'),
    'base' => env('EPIDEMIC_API_BASE', 'https://api.epidemicsound.com'),
];
