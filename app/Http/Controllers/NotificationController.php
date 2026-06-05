<?php
namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class NotificationController extends Controller
{
    public function index(): Response
    {
        $notifications = Auth::user()
            ->notifications()
            ->latest()
            ->limit(100)
            ->get()
            ->map(fn($n) => array_merge($n->data, [
                'id'         => $n->id,
                'read_at'    => $n->read_at,
                'created_at' => $n->created_at,
            ]));

        return Inertia::render('Notifications/Index', [
            'notifications' => $notifications,
        ]);
    }

    public function apiIndex(): JsonResponse
    {
        $notifications = Auth::user()
            ->notifications()
            ->latest()
            ->limit(20)
            ->get()
            ->map(fn($n) => array_merge($n->data, [
                'id'         => $n->id,
                'read_at'    => $n->read_at,
                'created_at' => $n->created_at,
            ]));

        return response()->json([
            'notifications' => $notifications,
            'unread_count'  => Auth::user()->unreadNotifications()->count(),
        ]);
    }

    public function markRead(string $id): JsonResponse
    {
        Auth::user()->notifications()->where('id', $id)->first()?->markAsRead();
        return response()->json(['ok' => true]);
    }

    public function markAllRead(): JsonResponse
    {
        Auth::user()->unreadNotifications->markAsRead();
        return response()->json(['ok' => true]);
    }

    public function count(): JsonResponse
    {
        return response()->json([
            'count' => Auth::user()->unreadNotifications()->count(),
        ]);
    }
}