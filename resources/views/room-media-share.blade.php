<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{{ $message->user->name }} shared media in {{ $room->name }} · Flockr</title>

    <meta property="og:title" content="{{ $message->user->name }} shared media in {{ $room->name }}">
    <meta property="og:description" content="View this on Flockr — {{ $room->name }}">
    <meta property="og:url" content="{{ $shareUrl }}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Flockr">
    @if ($message->media_type === 'video')
        <meta property="og:video" content="{{ $message->media_url }}">
        <meta property="og:image" content="{{ $room->avatar_url }}">
    @else
        <meta property="og:image" content="{{ $message->media_url }}">
    @endif

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{{ $message->user->name }} shared media in {{ $room->name }}">
    <meta name="twitter:image" content="{{ $message->media_type === 'video' ? $room->avatar_url : $message->media_url }}">

    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #050505; color: #fff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; }
        .media-wrap { max-width: 480px; width: 100%; border-radius: 20px; overflow: hidden; background: #000; border: 1px solid rgba(255,255,255,0.1); }
        .media-wrap img, .media-wrap video { width: 100%; display: block; max-height: 640px; object-fit: contain; background: #000; }
        .meta { display: flex; align-items: center; gap: 10px; padding: 14px 16px; }
        .meta img { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; }
        .meta-name { font-weight: 700; font-size: 14px; }
        .meta-room { color: rgba(255,255,255,0.45); font-size: 12px; margin-top: 1px; }
        .cta { margin-top: 20px; padding: 13px 28px; background: #FF6B35; border-radius: 999px; color: #fff; font-weight: 700; font-size: 14px; text-decoration: none; }
    </style>
</head>
<body>
    <div class="media-wrap">
        <div class="meta">
            <img src="{{ $message->user->avatar_url ?? $room->avatar_url }}" alt="">
            <div>
                <div class="meta-name">{{ $message->user->name }}</div>
                <div class="meta-room">{{ $room->name }}</div>
            </div>
        </div>
        @if ($message->media_type === 'video')
            <video src="{{ $message->media_url }}" controls playsinline poster="{{ $room->avatar_url }}"></video>
        @else
            <img src="{{ $message->media_url }}" alt="">
        @endif
    </div>
    <a class="cta" href="{{ $appUrl }}">Open in Flockr</a>
</body>
</html>