<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Platform Fee
    |--------------------------------------------------------------------------
    | Percentage Flockr takes from every sale. Passed to Paystack split.
    */
    'platform_fee_percent' => env('FLOCKR_PLATFORM_FEE_PERCENT', 5),

    /*
    |--------------------------------------------------------------------------
    | Video Limits
    |--------------------------------------------------------------------------
    */
    'max_video_size_mb'        => env('FLOCKR_MAX_VIDEO_SIZE_MB', 500),
    'max_video_duration_seconds' => env('FLOCKR_MAX_VIDEO_DURATION_SECONDS', 180),

    /*
    |--------------------------------------------------------------------------
    | Feed
    |--------------------------------------------------------------------------
    */
    'feed_page_size'       => 10,
    'taste_vector_videos'  => 20,   // how many liked/watched videos to average
    'seen_video_days'      => 7,    // don't re-show videos watched in last N days

    /*
    |--------------------------------------------------------------------------
    | AI Budget Guard
    |--------------------------------------------------------------------------
    | Soft limits to avoid runaway AI costs at scale.
    */
    'ai' => [
        'max_descriptions_per_day' => 500,
        'max_embeddings_per_day'   => 5000,
        'max_whisper_minutes_per_day' => 300,
    ],

    'ffmpeg_path'  => env('FFMPEG_PATH',  'ffmpeg'),
    'ffprobe_path' => env('FFPROBE_PATH', 'ffprobe'),

];
