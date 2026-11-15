<?php

/*
 | Terminal Africa charges a one-time NIN-verification fee (about ₦390) for each NEW sender
 | who ships with DHL / STN / Terminal-network carriers. That fee is taken from YOUR Terminal wallet.
 |
 |  absorb  (default) – show every carrier. Flockr pays the ₦390 per new seller from its Terminal wallet.
 |  hide              – hide those carriers for a seller until an admin marks that seller as "cleared".
 |                      Sellers still get the other carriers (no cost, no NIN).
 */
return [
    'mode'     => env('TERMINAL_NIN_MODE', 'absorb'),
    // lower-case fragments matched against Terminal's carrier_name
    'carriers' => array_filter(array_map('trim', explode(',', strtolower(env('TERMINAL_NIN_CARRIERS', 'dhl,stn,terminal'))))),
];
