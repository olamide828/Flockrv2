<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\CommentController;
use App\Http\Controllers\ConversationController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\SearchController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\VideoController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes  — /api/...
|--------------------------------------------------------------------------
*/

// ── Public API ────────────────────────────────────────────────────────────────
Route::get('/feed',    [VideoController::class, 'feed']);
Route::get('/search',  [SearchController::class, 'search']);

Route::prefix('shop')->group(function () {
    Route::get('/products', [ProductController::class, 'apiIndex']);
});

Route::get('/videos/{video}/comments', [CommentController::class, 'index']);
Route::get('/users/{user}',            [UserController::class, 'apiShow']);

// ── Authenticated API ─────────────────────────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {

    // Videos
    Route::post('/videos/upload',                [VideoController::class, 'store']);
    Route::post('/videos/{video}/like',          [VideoController::class, 'like']);
    Route::post('/videos/{video}/save',          [VideoController::class, 'save']);
    Route::post('/videos/{video}/view',          [VideoController::class, 'recordView']);
    Route::post('/videos/{video}/tag-products',  [VideoController::class, 'tagProducts']);
    Route::delete('/videos/{video}',             [VideoController::class, 'destroy']);

    // Comments
    Route::post('/videos/{video}/comments',      [CommentController::class, 'store']);
    Route::delete('/comments/{comment}',         [CommentController::class, 'destroy']);

    // Products
    Route::post('/products',                     [ProductController::class, 'store']);
    Route::put('/products/{product}',            [ProductController::class, 'update']);
    Route::delete('/products/{product}',         [ProductController::class, 'destroy']);
    Route::post('/products/{product}/save',      [ProductController::class, 'save']);
    Route::post('/products/{product}/images',    [ProductController::class, 'uploadImages']);

    // Orders & checkout
    Route::post('/orders/checkout',              [OrderController::class, 'checkout']);
    Route::get('/orders/{order}',                [OrderController::class, 'apiShow']);
    Route::post('/orders/{order}/cancel',        [OrderController::class, 'cancel']);

    // Paystack webhook (no auth — verified by signature)
    Route::post('/webhooks/paystack',            [OrderController::class, 'paystackWebhook'])
         ->withoutMiddleware('auth:sanctum');

    // Users / follow
    Route::post('/users/{user}/follow',          [UserController::class, 'follow']);

    // Conversations / messages
    Route::get('/conversations',                              [ConversationController::class, 'index']);
    Route::post('/conversations',                             [ConversationController::class, 'store']);
    Route::get('/conversations/{conversation}/messages',      [ConversationController::class, 'messages']);
    Route::post('/conversations/{conversation}/messages',     [ConversationController::class, 'sendMessage']);

    // Seller endpoints
    Route::middleware('role:seller')->prefix('seller')->group(function () {
        Route::get('/stats',    [SellerController::class, 'stats']);
        Route::get('/payouts',  [SellerController::class, 'payoutsApi']);
    });

    // Admin endpoints
    Route::middleware('role:admin')->prefix('admin')->group(function () {
        Route::post('/users/{user}/verify',        [AdminController::class, 'verifyUser']);
        Route::post('/users/{user}/suspend',       [AdminController::class, 'suspendUser']);
        Route::post('/videos/{video}/approve',     [AdminController::class, 'approveVideo']);
        Route::post('/videos/{video}/reject',      [AdminController::class, 'rejectVideo']);
        Route::get('/stats',                       [AdminController::class, 'stats']);
    });
});
