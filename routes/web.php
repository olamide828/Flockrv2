<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ConversationController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\SearchController;
use App\Http\Controllers\SellerController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\VideoController;
use Illuminate\Support\Facades\Route;

// ── Public pages ──────────────────────────────────────────────────────────────
Route::get('/',         [VideoController::class, 'index'])->name('home');
Route::get('/explore',  [SearchController::class, 'index'])->name('explore');
Route::get('/shop',     [ProductController::class, 'shop'])->name('shop');
Route::get('/video/{video}',           [VideoController::class, 'show'])->name('videos.show');
Route::get('/products/{product:slug}', [ProductController::class, 'show'])->name('products.show');
Route::get('/@{username}',             [UserController::class, 'show'])->name('profile.show');

// ── Auth ──────────────────────────────────────────────────────────────────────
Route::middleware('guest')->group(function () {
    Route::get('/login',    [AuthController::class, 'loginForm'])->name('login');
    Route::post('/login',   [AuthController::class, 'login']);
    Route::get('/register', [AuthController::class, 'registerForm'])->name('register');
    Route::post('/register',[AuthController::class, 'register']);
    Route::get('/forgot-password',         [AuthController::class, 'forgotForm'])->name('password.request');
    Route::post('/forgot-password',        [AuthController::class, 'forgotPassword'])->name('password.email');
    Route::get('/reset-password/{token}',  [AuthController::class, 'resetForm'])->name('password.reset');
    Route::post('/reset-password',         [AuthController::class, 'resetPassword'])->name('password.update');
});

Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth')->name('logout');
Route::get('/auth/{provider}',          [AuthController::class, 'redirectToProvider']);
Route::get('/auth/{provider}/callback', [AuthController::class, 'handleProviderCallback']);

// ── Authenticated pages ───────────────────────────────────────────────────────
Route::middleware('auth')->group(function () {

    Route::get('/profile',           [UserController::class, 'edit'])->name('profile');
    Route::get('/inbox',             [ConversationController::class, 'index'])->name('inbox');

    // Orders — NOTE: /orders/success must come BEFORE /orders/{order}
    // Otherwise Laravel matches "success" as an {order} parameter
    Route::get('/orders',            [OrderController::class, 'index'])->name('orders.index');
    Route::get('/orders/success',    [OrderController::class, 'success'])->name('orders.success');
    Route::get('/orders/callback',   [OrderController::class, 'paystackCallback'])->name('orders.callback');
    Route::get('/orders/{order}',    [OrderController::class, 'show'])->name('orders.show');

    // Settings
    Route::get('/settings/profile',          [SettingsController::class, 'profile'])->name('settings.profile');
    Route::post('/settings/profile',         [SettingsController::class, 'updateProfile']);
    Route::post('/settings/password',        [SettingsController::class, 'updatePassword']);
    Route::post('/settings/bank',            [SettingsController::class, 'updateBank']);
    Route::patch('/settings/notifications',  [SettingsController::class, 'updateNotifications']);

    // Seller pages
    Route::middleware('role:seller')->prefix('seller')->name('seller.')->group(function () {
        Route::get('/dashboard',               [SellerController::class, 'dashboard'])->name('dashboard');
        Route::get('/upload',                  [VideoController::class, 'create'])->name('upload');
        Route::get('/videos',                  [SellerController::class, 'videos'])->name('videos');
        Route::get('/products',                [SellerController::class, 'products'])->name('products');
        Route::get('/products/create',         [ProductController::class, 'create'])->name('products.create');
        Route::get('/products/{product}/edit', [ProductController::class, 'edit'])->name('products.edit');
        Route::get('/orders',                  [SellerController::class, 'orders'])->name('orders');
        Route::get('/payouts',                 [SellerController::class, 'payouts'])->name('payouts');
        Route::get('/settings',                [SellerController::class, 'settings'])->name('settings');
    });

    // Admin pages
    Route::middleware('role:admin')->prefix('admin')->name('admin.')->group(function () {
        Route::get('/dashboard',       [AdminController::class, 'dashboard'])->name('dashboard');
        Route::get('/users',           [AdminController::class, 'users'])->name('users');
        Route::get('/users/{user}',    [AdminController::class, 'showUser'])->name('users.show');
        Route::get('/orders',          [AdminController::class, 'orders'])->name('orders');
        Route::get('/orders/{order}',  [AdminController::class, 'showOrder'])->name('orders.show');
    });
});