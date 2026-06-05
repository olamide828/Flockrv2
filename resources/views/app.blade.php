<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="dark">
<head>
    <meta charset="utf-8" />
    <title inertia>Flockr — Shop What You Watch</title>
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="csrf-token" content="{{ csrf_token() }}" />
    <meta name="r2-url" content="{{ config('filesystems.disks.r2.url') }}" />

    {{-- Open Graph / Social --}}
    <meta property="og:site_name" content="Flockr" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />

    {{-- PWA / Mobile --}}
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="theme-color" content="#0a0a0a" />

    {{-- Favicon --}}
    <link rel="icon" type="image/png" href="/flockr_logo_white.png" />

    {{-- Preconnect for performance --}}
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

    @inertiaHead
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/app.jsx'])
</head>
<body class="bg-flockr-black text-flockr-text antialiased overflow-x-hidden">
    
    @inertia
</body>
</html>
