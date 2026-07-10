<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BuyerOnboardingController;
use App\Http\Controllers\CartController;
use App\Http\Controllers\CommunityController;
use App\Http\Controllers\ConversationController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\SearchController;
use App\Http\Controllers\SellerController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\VideoController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UserDashboardController;
use App\Http\Controllers\FollowController;
use App\Http\Controllers\NotificationController;

// ── Public pages ──────────────────────────────────────────────────────────────
Route::get('/', [VideoController::class, 'index'])->name('home');
Route::get('/explore', [SearchController::class, 'index'])->name('explore');
Route::get('/shop', [ProductController::class, 'shop'])->name('shop');
Route::get('/@{username}/video/{video:ulid}', [VideoController::class, 'show'])->name('videos.show');
Route::get('/@{username}/products/{product:slug}', [ProductController::class, 'show'])->name('products.show');
Route::get('/@{username}', [UserController::class, 'show'])->name('profile.show');
Route::get('/community', [CommunityController::class, 'index'])->name('community');

// ── Auth ──────────────────────────────────────────────────────────────────────
Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'loginForm'])->name('login');
    Route::post('/login', [AuthController::class, 'login']);
    Route::get('/register', [AuthController::class, 'registerForm'])->name('register');
    Route::post('/register', [AuthController::class, 'register']);
    Route::get('/forgot-password', [AuthController::class, 'forgotForm'])->name('password.request');
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->name('password.email');
    Route::get('/reset-password/{token}', [AuthController::class, 'resetForm'])->name('password.reset');
    Route::post('/reset-password', [AuthController::class, 'resetPassword'])->name('password.update');

});

Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth')->name('logout');
Route::get('/auth/{provider}', [AuthController::class, 'redirectToProvider']);
Route::get('/auth/{provider}/callback', [AuthController::class, 'handleProviderCallback']);

// ── Authenticated pages ───────────────────────────────────────────────────────
Route::middleware('auth')->group(function () {

    Route::get('/onboarding', [BuyerOnboardingController::class, 'show'])->name('buyer.onboarding');
    Route::post('/onboarding', [BuyerOnboardingController::class, 'store'])->name('buyer.onboarding.store');
    Route::post('/onboarding/skip', [BuyerOnboardingController::class, 'skip'])->name('buyer.onboarding.skip');


    Route::get('/dashboard', [UserDashboardController::class, 'index'])
    ->middleware('role:buyer');

    Route::get('/@{username}/followers', [FollowController::class, 'followers'])
        ->name('profile.followers');

    Route::get('/@{username}/following', [FollowController::class, 'following'])
        ->name('profile.following');

    Route::get('/profile', [UserController::class, 'edit'])->name('profile');
    Route::get('/inbox', [ConversationController::class, 'index'])->name('inbox');

    Route::get('/orders', [OrderController::class, 'index'])->name('orders.index');
    Route::get('/orders/success', [OrderController::class, 'success'])->name('orders.success');
    Route::get('/orders/callback', [OrderController::class, 'paystackCallback'])->name('orders.callback');
    Route::get('/orders/{order}', [OrderController::class, 'show'])->name('orders.show');

    Route::get('/settings/profile', [SettingsController::class, 'profile'])->name('settings.profile');
    Route::post('/settings/profile', [SettingsController::class, 'updateProfile']);
    Route::post('/settings/password', [SettingsController::class, 'updatePassword']);
    Route::post('/settings/bank', [SettingsController::class, 'updateBank']);
    Route::patch('/settings/notifications', [SettingsController::class, 'updateNotifications']);
    Route::get('/cart', [CartController::class, 'index'])->name('cart');
    Route::get('/notifications', [NotificationController::class, 'index'])->name('notifications');

    // Seller onboarding — no role middleware (user IS seller but not yet set up)
    Route::get('/seller/onboarding', [AuthController::class, 'sellerOnboarding'])->name('seller.onboarding');
    Route::post('/seller/onboarding', [AuthController::class, 'sellerOnboardingStore']);

    Route::middleware('role:seller')->prefix('seller')->name('seller.')->group(function () {
        Route::get('/dashboard', [SellerController::class, 'dashboard'])->name('dashboard');
        Route::get('/upload', [VideoController::class, 'create'])->name('upload');
        Route::get('/videos', [SellerController::class, 'videos'])->name('videos');
        Route::get('/products', [SellerController::class, 'products'])->name('products');
        Route::get('/products/create', [ProductController::class, 'create'])->name('products.create');
        Route::get('/products/{product}/edit', [ProductController::class, 'edit'])->name('products.edit');
        Route::get('/orders', [SellerController::class, 'orders'])->name('orders');
        Route::get('/payouts', [SellerController::class, 'payouts'])->name('payouts');
        Route::get('/settings', [SellerController::class, 'settings'])->name('settings');
    });

    Route::middleware('role:admin')->prefix('admin')->name('admin.')->group(function () {
        Route::get('/dashboard', [AdminController::class, 'dashboard'])->name('dashboard');
        Route::get('/users/{user}', [AdminController::class, 'showUser'])->name('users.show');
        Route::get('/orders/{order}', [AdminController::class, 'showOrder'])->name('orders.show');
    Route::get('/users',      [AdminController::class, 'users'])->name('admin.users');
    Route::get('/videos',     [AdminController::class, 'videos'])->name('admin.videos');
    Route::get('/orders',     [AdminController::class, 'orders'])->name('admin.orders');
    Route::get('/payouts',    [AdminController::class, 'payouts'])->name('admin.payouts');
    Route::get('/reports',    [AdminController::class, 'reports'])->name('admin.reports');
    Route::get('/analytics',  [AdminController::class, 'analyticsPage'])->name('admin.analytics');
    });
});

// composer dump-autoload
// php artisan optimize:clear
// php artisan route:list