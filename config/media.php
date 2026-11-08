<?php

// Video encoding knobs. Defaults are safe for a small shared machine; raise them if your app has room to spare.
return [
    // ffmpeg threads for the download (watermark) encode. 0 = let ffmpeg use every core (fastest).
    'ffmpeg_threads' => (int) env('FLOCKR_FFMPEG_THREADS', 0),
    // `nice` level (1-19) so encoding yields to web requests on the same machine. 0 = don't use nice.
    'ffmpeg_nice'    => (int) env('FLOCKR_FFMPEG_NICE', 10),
    // Download outro: how much of the last frame stays visible behind the logo (0.10 = 90% dark) and the tagline.
    'outro_keep'    => (float) env('FLOCKR_OUTRO_KEEP', 0.12),
    'outro_tagline' => env('FLOCKR_OUTRO_TAGLINE', 'Shop What You Watch'),
];
