<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\CartController;
use App\Http\Controllers\CommentController;
use App\Http\Controllers\ConversationController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\SearchController;
use App\Http\Controllers\SellerController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\VideoController;
use App\Http\Controllers\VideoDownloadController;
use App\Models\Product;
use App\Http\Controllers\AddressController;
use App\Http\Controllers\BadgeController;
use App\Http\Controllers\CommunityController;
use App\Http\Controllers\MediaUploadController;
use App\Http\Controllers\TerminalWebhookController;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\SafetyController;
Broadcast::routes(['middleware' => ['auth:sanctum']]);

/*
|--------------------------------------------------------------------------
| API Routes  — /api/...
|--------------------------------------------------------------------------
*/

// ── Public API ────────────────────────────────────────────────────────────────
Route::get('/feed', [VideoController::class, 'feed']);
Route::get('/search', [SearchController::class, 'search']);
Route::post('/videos/{video}/view', [VideoController::class, 'recordView']);
Route::post('/videos/{video:ulid}/summary', [VideoController::class, 'generateSummary']);
Route::post('/products/summary', [ProductController::class, 'generateSummary']);

// Community feed is readable by guests too (algorithmic discovery mode
// doesn't require a session) — this is the ONLY /community/feed route.
Route::get('/community/feed', [CommunityController::class, 'feed']);
Route::get("/community/users/{user}/posts", [CommunityController::class, "userPosts"]);
Route::get('/community/trending', [CommunityController::class, 'trending']);
Route::get('/community/rooms/discover', [CommunityController::class, 'discoverRooms']);

Route::prefix('shop')->group(function () {
    Route::get('/products', [ProductController::class, 'apiIndex']);
});
Route::post('/videos/{video}/download/prepare', [VideoDownloadController::class, 'prepare']);
Route::get('/videos/download/status', [VideoDownloadController::class, 'status']);
Route::delete('/videos/download/cleanup', [VideoDownloadController::class, 'cleanup']);

Route::get('/products/{product:slug}/reviews', function (Product $product, \Illuminate\Http\Request $request) {
    $page    = max(1, (int) $request->input('page', 1));
    $perPage = min((int) $request->input('per_page', 10), 50);

    $reviews = \App\Models\Review::where(function($q) use ($product) {
            $q->where('product_id', $product->id)
              ->orWhere(function($q2) use ($product) {
                  $q2->whereNull('product_id')
                     ->where('seller_id', $product->seller_id);
              });
        })
        ->with('buyer:id,name,avatar')
        ->latest()
        ->paginate($perPage, ['*'], 'page', $page);

    return response()->json([
        'reviews'  => collect($reviews->items())->map(fn($r) => array_merge($r->toArray(), [
            'photo_urls' => $r->photo_urls,
            'buyer'      => $r->buyer ? array_merge($r->buyer->toArray(), [
                'avatar_url' => $r->buyer->avatar_url,
            ]) : null,
        ])),
        'total'    => $reviews->total(),
        'has_more' => $reviews->hasMorePages(),
    ]);
});

Route::get('/search/suggest', function (\Illuminate\Http\Request $request) {
    $q = trim($request->input('q', ''));
    if (strlen($q) < 1)
        return response()->json([]);

    try {
        $users = \App\Models\User::where(function ($query) use ($q) {
            $query->where('name', 'ilike', "%{$q}%")
                ->orWhere('username', 'ilike', "%{$q}%");
        })
            ->where('role', '!=', 'admin')
            ->where('is_active', true)
            ->select(['id', 'name', 'username', 'avatar', 'role', 'is_verified'])
            ->limit(3)
            ->get()
            ->map(fn($u) => [
                'label' => $u->name,
                'sub' => '@' . $u->username,
                'href' => '/@' . $u->username,
                'verified' => $u->is_verified,
                'type' => $u->role,
            ]);

        $products = \App\Models\Product::where('status', 'active')
            ->where('name', 'ilike', "%{$q}%")
            ->select(['id', 'name', 'slug', 'seller_id'])
            ->with('seller:id,username')
            ->limit(2)
            ->get()
            ->map(fn($p) => [
                'label' => $p->name,
                'sub' => 'Product',
                'href' => '/@' . ($p->seller?->username) . '/products/' . $p->slug,
                'type' => 'product',
            ]);

        return response()->json($users->concat($products)->values());

    } catch (\Throwable $e) {
        \Log::error('Suggest error: ' . $e->getMessage());
        return response()->json([]);
    }
});

// GET /api/search/discover — rotating placeholder suggestions, no query needed
Route::get('/search/discover', function () {
    return \Illuminate\Support\Facades\Cache::remember('search_discover', 600, function () {
        $hints = collect();

        // Top products by views (pick 4 random from top 20)
        $products = \DB::table('products')
            ->where('status', 'active')
            ->whereNotNull('name')
            ->orderByDesc('views_count')
            ->limit(20)
            ->pluck('name')
            ->shuffle()
            ->take(4)
            ->map(fn($name) => "Search '{$name}'...");

        // Active sellers (pick 3 random)
        $sellers = \DB::table('users')
            ->where('role', 'seller')
            ->where('is_active', true)
            ->whereNotNull('username')
            ->inRandomOrder()
            ->limit(3)
            ->pluck('username')
            ->map(fn($u) => "Find '@{$u}'...");

        // Hashtags from videos (pick 3 random)
        $tags = \DB::table('videos')
            ->where('status', 'active')
            ->whereNotNull('hashtags')
            ->whereRaw("hashtags::text != '[]'")
            ->whereRaw("hashtags::text != 'null'")
            ->inRandomOrder()
            ->limit(15)
            ->pluck('hashtags')
            ->flatMap(fn($h) => is_array($h) ? $h : json_decode($h, true) ?? [])
            ->filter()
            ->unique()
            ->shuffle()
            ->take(3)
            ->map(fn($tag) => "Discover '" . (str_starts_with($tag, '#') ? $tag : "#{$tag}") . "'...");

        return $hints
            ->concat($products)
            ->concat($sellers)
            ->concat($tags)
            ->shuffle()
            ->take(8)
            ->values()
            ->toArray();
    });
});

// Terminal location data — public endpoints
Route::get('/locations/states', function () {
    try {
        $cached = Cache::get('terminal_ng_states');
        if (!empty($cached)) return response()->json(['states' => $cached]);
        Cache::forget('terminal_ng_states');

        $states = app(App\Services\TerminalService::class)->getStates();
        return response()->json(['states' => $states]);
    } catch (\Throwable $e) {
        return response()->json(['states' => [], 'error' => $e->getMessage()], 200);
    }
});

Route::get('/locations/cities', function (\Illuminate\Http\Request $request) {
    $request->validate(['state_code' => 'required|string']);
    try {
        $stateCode = $request->state_code;
        $cacheKey  = 'terminal_cities_' . $stateCode;
        $cached    = Cache::get($cacheKey);
        if (empty($cached)) Cache::forget($cacheKey);

        $cities = app(App\Services\TerminalService::class)->getCities($stateCode);
        return response()->json(['cities' => $cities]);
    } catch (\Throwable $e) {
        \Log::error('getCities route failed', ['error' => $e->getMessage()]);
        return response()->json(['cities' => [], 'error' => $e->getMessage()], 200);
    }
});

Route::get('/videos/{video}/comments', [CommentController::class, 'index']);
Route::get('/users/{user}', [UserController::class, 'apiShow']);
Route::middleware('auth:sanctum')->post('/feed/reset', function () {
    app(\App\Services\FeedService::class)->resetSeenVideos(Auth::id());
    return response()->json(['ok' => true]);
});

// Username availability check — public, used during registration
Route::get('/auth/check-username', function (\Illuminate\Http\Request $request) {
    $username = strtolower(trim($request->input('username', '')));

    if (strlen($username) < 3) {
        return response()->json(['available' => null, 'suggestions' => []]);
    }

    $exists = \App\Models\User::where('username', $username)->exists();
    if (!$exists) {
        return response()->json(['available' => true, 'suggestions' => []]);
    }

    $suggestions = [];
    $attempts = 0;
    while (count($suggestions) < 3 && $attempts < 20) {
        $attempts++;
        $candidate = $username . rand(1, 999);
        if (!in_array($candidate, $suggestions) && !\App\Models\User::where('username', $candidate)->exists()) {
            $suggestions[] = $candidate;
        }
    }

    return response()->json(['available' => false, 'suggestions' => $suggestions]);
});

// ── Authenticated API ─────────────────────────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {

    //Badges 
    Route::get('/badges/new', [BadgeController::class, 'newBadges']);

    // Videos
    // Route::middleware('verified')->post('/videos/upload', [VideoController::class, 'store']);
    Route::post('/videos/upload', [VideoController::class, 'store']);

    Route::post('/videos/{video}/like', [VideoController::class, 'like']);
    Route::post('/videos/{video}/save', [VideoController::class, 'save']);
    Route::post('/videos/{video:ulid}/report', [VideoController::class, 'report']);

    Route::post('/videos/{video}/tag-products', [VideoController::class, 'tagProducts']);
    Route::delete('/videos/{video}', [VideoController::class, 'destroy']);

    Route::post('/users/{user}/block', [UserController::class, 'block']);
    Route::post('/users/{user}/report', [UserController::class, 'report']);
    Route::delete('/users/me', [UserController::class, 'deleteAccount']);

    // ── Community ────────────────────────────────────────────────────────
    // NOTE: no Route::prefix('community') wrapper here — every path below
    // already spells out /community/... in full. Wrapping this block in
    // prefix('community') AGAIN was the bug: it silently doubled every path
    // to /api/community/community/..., which is why the frontend's real
    // requests to /api/community/... were 404ing or hitting the wrong method.

    Route::post('/upload/media', [MediaUploadController::class, 'store']);

    Route::post('/community/posts', [CommunityController::class, 'storePost']);
    Route::get('/community/posts/{post}', [CommunityController::class, 'showPost']);
    Route::post('/community/posts/{post}/view', [CommunityController::class, 'recordPostView']);
    Route::post('/community/posts/{post}/like', [CommunityController::class, 'likePost']);
    Route::post('/community/posts/{post}/dismiss', [CommunityController::class, 'dismissPost']);
    Route::delete('/community/posts/{post}', [CommunityController::class, 'destroyPost']);
    


    Route::get('/community/posts/{post}/comments', [CommunityController::class, 'postComments']);
    Route::post('/community/posts/{post}/comments', [CommunityController::class, 'storePostComment']);

    
    Route::get('/community/rooms/joined', [CommunityController::class, 'joinedRooms']);
    Route::post('/community/rooms', [CommunityController::class, 'storeRoom']);
    Route::put('/community/rooms/{room}', [CommunityController::class, 'updateRoom']);
    Route::post('/community/rooms/{room}/join', [CommunityController::class, 'joinRoom']);
    Route::post('/community/rooms/{room}/request-join', [CommunityController::class, 'requestJoinRoom']);
    Route::post('/community/rooms/join-by-invite', [CommunityController::class, 'joinByInvite']);
    Route::put('/community/rooms/{room}/rules', [CommunityController::class, 'updateRules']);
    Route::delete('/community/rooms/{room}/kick', [CommunityController::class, 'kickUser']);
    Route::get('/community/rooms/{room}/members', [CommunityController::class, 'roomMembers']);
    Route::get('/community/rooms/{room}/requests', [CommunityController::class, 'pendingRequests']);
    Route::post('/community/rooms/{room}/requests/{requestId}', [CommunityController::class, 'resolveRequest']);

    Route::get('/community/rooms/{room}/messages', [CommunityController::class, 'roomMessages']);
    Route::post('/community/rooms/{room}/messages', [CommunityController::class, 'sendRoomMessage']);
    Route::delete('/community/rooms/{room}/messages/{message}', [CommunityController::class, 'deleteRoomMessage']);
    Route::post('/community/rooms/{room}/messages/{message}/like', [CommunityController::class, 'likeRoomMessage']);

    Route::post('/community/comments/{comment}/like', [CommunityController::class, 'likePostComment']);
Route::post('/community/comments/{comment}/pin', [CommunityController::class, 'pinPostComment']);
 
// Post viewers (owner-only "who saw this")
Route::get('/community/posts/{post}/viewers', [CommunityController::class, 'postViewers']);
 
// Invite-code preview (no join/request side effect — just looks the room up)
Route::get('/community/rooms/lookup-invite', [CommunityController::class, 'lookupInviteCode']);


    // Comments
    Route::post('/videos/{video}/comments', [CommentController::class, 'store']);
    Route::delete('/comments/{comment}', [CommentController::class, 'destroy']);

    Route::post('/comments/{comment}/like', [CommentController::class, 'like']);
    Route::post('/comments/{comment}/pin',  [CommentController::class, 'pin']);

    // Products
    Route::post('/products', [ProductController::class, 'store']);
    Route::put('/products/{product}', [ProductController::class, 'update']);
    Route::delete('/products/{product}', [ProductController::class, 'destroy']);
    Route::post('/products/{product}/save', [ProductController::class, 'save']);
    Route::post('/products/{product}/images', [ProductController::class, 'uploadImages']);
    Route::get('/products/{product}/images', [ProductController::class, 'getImages']);
    Route::get('/seller/products/{product}/edit', [ProductController::class, 'edit'])->name('api.seller.products.edit');

    // Orders & checkout
    // Route::middleware('verified')->group(function () {
    //     Route::post('/orders/checkout', [OrderController::class, 'checkout']);
    //     Route::post('/cart/checkout', [CartController::class, 'checkout']);
    // });
     Route::post('/orders/checkout', [OrderController::class, 'checkout']);
    Route::post('/cart/checkout', [CartController::class, 'checkout']);
    Route::post('/orders/{order}/reschedule-pickup', [OrderController::class, 'reschedulePickup']);
    Route::get('/orders/{order}', [OrderController::class, 'apiShow']);
    Route::post('/orders/{order}/cancel', [OrderController::class, 'cancel']);
    Route::post('/orders/resume-payment', [OrderController::class, 'resumePayment']);
    Route::get('/orders/{order}/review',  [ReviewController::class, 'show']);
    Route::post('/orders/{order}/review', [ReviewController::class, 'store']);
    Route::get('/orders/{order}/status',   [OrderController::class, 'getStatus']);
    Route::get('/orders/{order}/tracking', [OrderController::class, 'getTrackingEvents']);
    Route::get('/coupons/available', function (\Illuminate\Http\Request $request) {
        $total  = (float) $request->input('total', 0);
        $userId = Auth::id();

        $coupon = \App\Models\Coupon::where('buyer_id', $userId)
            ->whereNull('used_at')
            ->where(function ($q) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->where('min_order', '<=', $total)
            ->orderByDesc('amount')
            ->first();

        return response()->json([
            'coupon' => $coupon ? [
                'code'      => $coupon->code,
                'amount'    => $coupon->amount,
                'min_order' => $coupon->min_order,
                'expires_at'=> $coupon->expires_at?->toDateString(),
            ] : null,
        ]);
    });

    // Cart
    Route::get('/cart/count', [CartController::class, 'count']);
    Route::post('/cart', [CartController::class, 'add']);
    Route::patch('/cart/{item}', [CartController::class, 'update']);
    Route::delete('/cart/{item}', [CartController::class, 'remove']);
    Route::delete('/cart', [CartController::class, 'clear']);

    Route::get('/notifications', [NotificationController::class, 'apiIndex']);
    Route::get('/notifications/count', [NotificationController::class, 'count']);
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markRead']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead']);

    // Delivery addresses
    Route::get('/addresses', [AddressController::class, 'index']);
    Route::post('/addresses', [AddressController::class, 'store']);
    Route::put('/addresses/{address}', [AddressController::class, 'update']);
    Route::delete('/addresses/{address}', [AddressController::class, 'destroy']);
    Route::post('/addresses/{address}/set-default', [AddressController::class, 'setDefault']);

    // Shipping rates (called by checkout modal)
    Route::post('/shipping/rates', [AddressController::class, 'getRates']);

    // Coupon validation
    Route::post('/cart/validate-coupon', [CartController::class, 'validateCoupon']);

    // Logged-in devices (settings page)
Route::get('/settings/devices', function (\Illuminate\Http\Request $request) {
    $currentSessionId = $request->session()->getId();

    // One row per distinct device (browser+platform+type) — the latest
    // login from each — instead of a row for every single login event.
    $latestIds = \App\Models\LoginHistory::where('user_id', Auth::id())
        ->whereNull('revoked_at')
        ->selectRaw('MAX(id) as id')
        ->groupBy('browser', 'platform', 'device_type')
        ->pluck('id');

    return \App\Models\LoginHistory::whereIn('id', $latestIds)
        ->orderByDesc('created_at')
        ->get()
        ->map(fn ($h) => [
            'id'          => $h->id,
            'device_type' => $h->device_type,
            'browser'     => $h->browser,
            'platform'    => $h->platform,
            'city'        => $h->city,
            'region'      => $h->region,
            'country'     => $h->country,
            'created_at'  => $h->created_at,
            'is_current'  => $h->session_id === $currentSessionId,
            'is_primary'  => $h->is_primary,
        ]);
});


Route::delete('/settings/devices/{loginHistory}', function (\Illuminate\Http\Request $request, \App\Models\LoginHistory $loginHistory) {
    if ($loginHistory->user_id !== Auth::id()) {
        return response()->json(['message' => 'Unauthorized.'], 403);
    }

    if ($loginHistory->is_primary) {
        return response()->json(['message' => 'This is the original device used to create your account and cannot be signed out.'], 422);
    }

    if ($loginHistory->session_id === $request->session()->getId()) {
        return response()->json(['message' => 'Use Log Out to end your current session.'], 422);
    }

    $request->validate(['password' => 'required|string']);

    if (!\Illuminate\Support\Facades\Hash::check($request->password, Auth::user()->password)) {
        return response()->json(['message' => 'Incorrect password.'], 422);
    }

    if ($loginHistory->session_id) {
        \DB::table('sessions')->where('id', $loginHistory->session_id)->delete();
    }

    $loginHistory->update(['revoked_at' => now()]);

    return response()->json(['message' => 'Device signed out.']);
});
    // Paystack webhook (no auth — verified by signature)
    Route::post('/webhooks/paystack', [OrderController::class, 'paystackWebhook'])
        ->withoutMiddleware('auth:sanctum');

    Route::post('/webhooks/terminal', [TerminalWebhookController::class, 'handle'])
        ->withoutMiddleware('auth:sanctum');

    // Users / follow
    Route::post('/users/{user}/follow', [UserController::class, 'follow']);

    // Conversations / messages
    Route::get('/conversations', [ConversationController::class, 'index']);
    Route::post('/conversations', [ConversationController::class, 'store']);
    Route::get('/conversations/{conversation}/messages', [ConversationController::class, 'messages']);
    Route::post('/conversations/{conversation}/messages', [ConversationController::class, 'sendMessage']);
    Route::patch('/orders/{order}/status', [OrderController::class, 'updateStatus']);
    Route::post('/orders/{order}/dispute', [OrderController::class, 'openDispute']);
    Route::post('/conversations/{conversation}/report', [ConversationController::class, 'reportConversation']);
    Route::post('/safety/off-platform-warning', [SafetyController::class, 'recordWarning']);
Route::get('/safety/conversations/{conversation}/status', [SafetyController::class, 'conversationStatus']);
Route::get('/safety/seller-info/{seller}', [SafetyController::class, 'sellerInfo']);
Route::post('/safety/classify-message', [SafetyController::class, 'classifyMessage'])->middleware('throttle:30,1');


    // Seller endpoints
    Route::middleware('role:seller')->prefix('seller')->group(function () {
        Route::get('/stats', [SellerController::class, 'stats']);
        Route::get('/payouts', [SellerController::class, 'payoutsApi']);
        Route::delete('/settings/bank', [SettingsController::class, 'removeBank']);
        // Route::middleware('verified')->post('/payouts', [SellerController::class, 'requestPayout']);
        Route::post('/payouts', [SellerController::class, 'requestPayout']);
        Route::post('/pickup-address', function (\Illuminate\Http\Request $request) {
    $request->validate([
        'pickup_street'      => 'required|string|max:200',
        'pickup_city'        => 'required|string|max:100',
        'pickup_state'       => 'required|string|max:100',
        'pickup_state_code'  => 'nullable|string|max:10',
        'pickup_postal_code' => 'nullable|string|max:20',
    ]);

    Auth::user()->update([
        'pickup_street'      => $request->pickup_street,
        'pickup_city'        => $request->pickup_city,
        'pickup_state'       => $request->pickup_state,
        'pickup_state_code'  => $request->pickup_state_code,
        'pickup_postal_code' => $request->pickup_postal_code,
    ]);

    return response()->json(['message' => 'Pickup address saved.']);
})->middleware('auth:sanctum');
    });

    // Admin endpoints
    Route::middleware('role:admin')->prefix('admin')->name('admin.')->group(function () {
        Route::post('/users/{user}/verify', [AdminController::class, 'verifyUser']);
        Route::post('/users/{user}/suspend', [AdminController::class, 'suspendUser']);
        Route::post('/users/{user}/role', [AdminController::class, 'changeRole']);
        Route::delete('/users/{user}', [AdminController::class, 'deleteUser']);

        Route::get('/videos/{video}/edit', [VideoController::class, 'edit'])->name('admin.videos.edit');
        Route::post('/videos/{video}/approve', [AdminController::class, 'approveVideo']);
        Route::post('/videos/{video}/reject', [AdminController::class, 'rejectVideo']);
        Route::post('/videos/{video}/feature', [AdminController::class, 'featureVideo']);

        Route::post('/orders/{order}/refund', [AdminController::class, 'refundOrder']);
        Route::post('/orders/{order}/resolve', [AdminController::class, 'resolveOrder']);
        Route::patch('/orders/{order}/status', [AdminController::class, 'updateOrderStatus']);

        Route::get('/stats', [AdminController::class, 'stats']);
        Route::get('/analytics', [AdminController::class, 'analytics']);

        Route::post('/payouts/{payout}/approve', [AdminController::class, 'approvePayout']);

        Route::post('/reports/{report}/actioned',  [AdminController::class, 'actionReport']);
        Route::post('/reports/{report}/dismissed', [AdminController::class, 'dismissReport']);
        Route::get('/conversations/{conversation}/messages', [AdminController::class, 'conversationMessages']);

    Route::get('/users/{user}/details', function (\App\Models\User $user) {
        return response()->json([
        'user' => [
            'id'                 => $user->id,
            'name'               => $user->name,
            'username'           => $user->username,
            'email'              => $user->email,
            'phone'              => $user->phone,
            'role'               => $user->role,
            'bio'                => $user->bio,
            'location'           => $user->location,
            'avatar_url'         => $user->avatar_url,
            'is_verified'        => $user->is_verified,
            'is_active'          => $user->is_active,
            'email_verified_at'  => $user->email_verified_at,
            'followers_count'    => $user->followers_count ?? 0,
            'following_count'    => $user->following_count ?? 0,
            'total_sales'        => $user->total_sales ?? 0,
            'wallet_balance'     => $user->wallet_balance,
            'bank_name'          => $user->bank_name,
            'account_name'       => $user->account_name,
            'account_last4'      => $user->account_last4,
            'created_at'         => $user->created_at,
            'last_seen_at'       => $user->last_seen_at,
        ],
        'login_history' => \App\Models\LoginHistory::where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->limit(20)
            ->get(),
    ]);
});

        });

    Route::get('/users/search', function (\Illuminate\Http\Request $request) {
        $q = $request->input('q', '');
        if (strlen($q) < 2)
            return response()->json([]);

        return \App\Models\User::where('id', '!=', Auth::id())
            ->where(function ($query) use ($q) {
                $query->where('name', 'ilike', "%{$q}%")
                    ->orWhere('username', 'ilike', "%{$q}%");
            })
            ->where('is_active', true)
            ->select('id', 'name', 'username', 'avatar', 'role')
            ->limit(8)
            ->get();
    });
});