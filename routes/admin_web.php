<?php

use Illuminate\Support\Facades\Route;

/*
 | Admin pages. `Route::inertia` has no closure, so `php artisan route:cache` works.
 | Detail pages (orders/{id}, users/{id}) read the id from the URL in React.
 | In web.php:  require __DIR__.'/admin_web.php';   (and delete the old /admin page routes)
 */
Route::middleware(['auth', 'role:admin'])->prefix('admin')->group(function () {
    Route::redirect('/', '/admin/dashboard');

    // Redesigned pages. (Music keeps its route in web.php until it is reskinned.)
    $pages = [
        'dashboard' => 'Dashboard', 'analytics' => 'Analytics',
        'orders' => 'Orders', 'orders/{id}' => 'OrderDetail', 'disputes' => 'Disputes', 'payouts' => 'Payouts',
        'events' => 'Events', 'ledger' => 'Ledger', 'coupons' => 'Coupons', 'subscriptions' => 'Subscriptions',
        'users' => 'Users', 'users/{id}' => 'UserDetail', 'flagged-sellers' => 'FlaggedSellers',
        'support' => 'Support', 'reports' => 'Reports', 'blocks' => 'Blocks',
        'videos' => 'Videos', 'products' => 'Products', 'rooms' => 'Rooms', 'chats' => 'Chats', 'deletions' => 'Deletions', 'badges' => 'Badges', 'feed' => 'Feed',
        'system' => 'System', 'audit' => 'Audit',
    ];
    foreach ($pages as $uri => $component) {
        // Named admin.<slug> (e.g. admin.dashboard) — AuthController redirects admins to route('admin.dashboard').
        Route::inertia('/' . $uri, 'Admin/' . $component)->name('admin.' . str_replace(['/{id}', '/'], ['.show', '.'], $uri));
    }
});
