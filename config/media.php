<?php

// Video encoding knobs. Defaults are safe for a small shared machine; raise them if your app has room to spare.
return [
    // ffmpeg threads for the download (watermark) encode. 0 = let ffmpeg use every core (fastest).
    'ffmpeg_threads' => (int) env('FLOCKR_FFMPEG_THREADS', 0),
    // `nice` level (1-19) so encoding yields to web requests on the same machine. 0 = don't use nice.
    'ffmpeg_nice'    => (int) env('FLOCKR_FFMPEG_NICE', 10),
];
