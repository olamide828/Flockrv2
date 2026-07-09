import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

/**
 * Bootstrap Laravel Echo for real-time features.
 * Supports both Laravel Reverb (self-hosted) and Pusher (managed).
 * Import this file once in app.jsx.
 */

window.Pusher = Pusher;

// ── Choose driver based on env ────────────────────────────────────────────
const broadcaster = import.meta.env.VITE_BROADCAST_CONNECTION ?? 'reverb';

if (broadcaster === 'reverb') {
    window.Echo = new Echo({
        broadcaster: 'reverb',
        key: import.meta.env.VITE_REVERB_APP_KEY,
        wsHost: import.meta.env.VITE_REVERB_HOST || '127.0.0.1',
        wsPort: Number(import.meta.env.VITE_REVERB_PORT || 8080),
        wssPort: Number(import.meta.env.VITE_REVERB_PORT || 8080),
        forceTLS: (import.meta.env.VITE_REVERB_SCHEME || 'http') === 'https',
        enabledTransports: ['ws', 'wss'],
        authEndpoint: '/broadcasting/auth',
        auth: { headers: { 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '' } },
    });
} else {
    window.Echo = new Echo({
        broadcaster: 'pusher',
        key: import.meta.env.VITE_PUSHER_APP_KEY,
        cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER ?? 'mt1',
        forceTLS: true,
    });
}

export default window.Echo;
