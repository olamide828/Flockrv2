<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\CommentController;
use App\Http\Controllers\ConversationController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\SearchController;
use App\Http\Controllers\SellerController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\VideoController;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes  — /api/...
|--------------------------------------------------------------------------
*/

// ── Public API ────────────────────────────────────────────────────────────────
Route::get('/feed', [VideoController::class, 'feed']);
Route::get('/search', [SearchController::class, 'search']);

Route::prefix('shop')->group(function () {
    Route::get('/products', [ProductController::class, 'apiIndex']);
});

Route::post('/debug-upload', function (\Illuminate\Http\Request $request) {
    return response()->json([
        'has_file' => $request->hasFile('video'),
        'file_valid' => $request->file('video')?->isValid(),
        'error_code' => $request->file('video')?->getError(),
        'error_msg' => $request->file('video')?->getErrorMessage(),
        'size' => $request->file('video')?->getSize(),
        'mime' => $request->file('video')?->getMimeType(),
        'post_max' => ini_get('post_max_size'),
        'upload_max' => ini_get('upload_max_filesize'),
    ]);
});

Route::get('/debug-ini', function () {
    return response()->json([
        'post_max' => ini_get('post_max_size'),
        'upload_max' => ini_get('upload_max_filesize'),
        'ini_file' => php_ini_loaded_file(),
    ]);
});

Route::get('/videos/{video}/comments', [CommentController::class, 'index']);
Route::get('/users/{user}', [UserController::class, 'apiShow']);
Route::middleware('auth:sanctum')->post('/feed/reset', function () {
    app(\App\Services\FeedService::class)->resetSeenVideos(Auth::id());
    return response()->json(['ok' => true]);
});

// ── Authenticated API ─────────────────────────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {
    // Videos
    Route::post('/videos/upload', [VideoController::class, 'store']);
    Route::post('/videos/{video}/like', [VideoController::class, 'like']);
    Route::post('/videos/{video}/save', [VideoController::class, 'save']);
    Route::post('/videos/{video}/view', [VideoController::class, 'recordView']);
    Route::post('/videos/{video}/tag-products', [VideoController::class, 'tagProducts']);
    Route::delete('/videos/{video}', [VideoController::class, 'destroy']);
    Route::post('/videos/{video:ulid}/summary', [VideoController::class, 'generateSummary']);
    Route::post('/products/summary', [ProductController::class, 'generateSummary']);

    // Comments
    Route::post('/videos/{video}/comments', [CommentController::class, 'store']);
    Route::delete('/comments/{comment}', [CommentController::class, 'destroy']);

    // Products
    Route::post('/products', [ProductController::class, 'store']);
    Route::put('/products/{product}', [ProductController::class, 'update']);
    Route::delete('/products/{product}', [ProductController::class, 'destroy']);
    Route::post('/products/{product}/save', [ProductController::class, 'save']);
    Route::post('/products/{product}/images', [ProductController::class, 'uploadImages']);

    // Orders & checkout
    Route::post('/orders/checkout', [OrderController::class, 'checkout']);
    Route::get('/orders/{order}', [OrderController::class, 'apiShow']);
    Route::post('/orders/{order}/cancel', [OrderController::class, 'cancel']);


    // Paystack webhook (no auth — verified by signature)
    Route::post('/webhooks/paystack', [OrderController::class, 'paystackWebhook'])
        ->withoutMiddleware('auth:sanctum');

    // Users / follow
    Route::post('/users/{user}/follow', [UserController::class, 'follow']);

    // Conversations / messages
    Route::get('/conversations', [ConversationController::class, 'index']);
    Route::post('/conversations', [ConversationController::class, 'store']);
    Route::get('/conversations/{conversation}/messages', [ConversationController::class, 'messages']);
    Route::post('/conversations/{conversation}/messages', [ConversationController::class, 'sendMessage']);
    Route::patch('/orders/{order}/status', [OrderController::class, 'updateStatus']);

    // Seller endpoints
    Route::middleware('role:seller')->prefix('seller')->group(function () {
        Route::get('/stats', [SellerController::class, 'stats']);
        Route::get('/payouts', [SellerController::class, 'payoutsApi']);
        Route::delete('/settings/bank', [SettingsController::class, 'removeBank']);
        Route::post('/payouts', [SellerController::class, 'requestPayout']);

    });

    // Admin endpoints
    Route::middleware('role:admin')->prefix('admin')->name('admin.')->group(function () {

        // Users
        Route::post('/users/{user}/verify', [AdminController::class, 'verifyUser']);
        Route::post('/users/{user}/suspend', [AdminController::class, 'suspendUser']);
        Route::post('/users/{user}/role', [AdminController::class, 'changeRole']);
        Route::delete('/users/{user}', [AdminController::class, 'deleteUser']);

        // Videos — bind by ulid (matches Video::getRouteKeyName())
        Route::post('/videos/{video}/approve', [AdminController::class, 'approveVideo']);
        Route::post('/videos/{video}/reject', [AdminController::class, 'rejectVideo']);
        Route::post('/videos/{video}/feature', [AdminController::class, 'featureVideo']);

        // Orders
        Route::post('/orders/{order}/refund', [AdminController::class, 'refundOrder']);
        Route::post('/orders/{order}/resolve', [AdminController::class, 'resolveOrder']);

        // Stats & analytics
        Route::get('/stats', [AdminController::class, 'stats']);
        Route::get('/analytics', [AdminController::class, 'analytics']);
    });

    Route::get('/users/search', function (\Illuminate\Http\Request $request) {
        $q = $request->input('q', '');
        if (strlen($q) < 2)
            return response()->json([]);

        return \App\Models\User::where('id', '!=', \Illuminate\Support\Facades\Auth::id())
            ->where(function ($query) use ($q) {
                $query->where('name', 'ilike', "%{$q}%")
                    ->orWhere('username', 'ilike', "%{$q}%");
            })
            ->where('is_active', true)
            ->select('id', 'name', 'username', 'avatar', 'role')
            ->limit(8)
            ->get();
    })->middleware('auth:sanctum');
});
