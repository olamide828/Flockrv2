<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\CartController;
use App\Http\Controllers\CommentController;
use App\Http\Controllers\ConversationController;
use App\Http\Controllers\EventController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\SearchController;
use App\Http\Controllers\SellerController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\VideoController;
use App\Http\Controllers\SoundController;
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
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\SafetyController;
use App\Http\Controllers\SellerTrustController;
use App\Http\Controllers\ChatWallpaperController;
use App\Http\Controllers\DisputeController;
use Illuminate\Http\Request;

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
Route::post('/videos/{video:ulid}/summary', [VideoController::class, 'generateSummary'])->middleware('throttle:20,1');
Route::post('/products/summary', [ProductController::class, 'generateSummary'])->middleware('throttle:20,1');
Route::get('/users/{username}/preview', [\App\Http\Controllers\UserPreviewController::class, 'show']);

// Community feed is readable by guests too (algorithmic discovery mode
// doesn't require a session) — this is the ONLY /community/feed route.
Route::get('/community/feed', [CommunityController::class, 'feed']);
Route::get("/community/users/{user}/posts", [CommunityController::class, "userPosts"]);
Route::get('/community/trending', [CommunityController::class, 'trending']);
Route::get('/community/rooms/discover', [CommunityController::class, 'discoverRooms']);

Route::prefix('shop')->group(function () {
    Route::get('/products', [ProductController::class, 'apiIndex']);
});
Route::get('/videos/{video}/photos/download', [\App\Http\Controllers\PhotoDownloadController::class, 'zip'])->middleware('throttle:20,1');
Route::get('/videos/{video}/photos/{index}/download', [\App\Http\Controllers\PhotoDownloadController::class, 'photo'])->whereNumber('index')->middleware('throttle:60,1');
Route::post('/videos/{video}/download/prepare', [VideoDownloadController::class, 'prepare']);
Route::get('/videos/download/status', [VideoDownloadController::class, 'status']);
Route::delete('/videos/download/cleanup', [VideoDownloadController::class, 'cleanup']);

Route::get('/products/{product:slug}/reviews', [\App\Http\Controllers\MiscApiController::class, 'hProductsProductSlugReviews1']);

Route::get('/search/suggest', [\App\Http\Controllers\MiscApiController::class, 'hSearchSuggest2']);

// GET /api/search/discover — rotating placeholder suggestions, no query needed
Route::get('/search/discover', [\App\Http\Controllers\MiscApiController::class, 'hSearchDiscover3']);

// Terminal location data — public endpoints
Route::get('/locations/states', [\App\Http\Controllers\MiscApiController::class, 'hLocationsStates4']);

Route::get('/locations/cities', [\App\Http\Controllers\MiscApiController::class, 'hLocationsCities5']);


Route::post('/chirp/video-insight', [\App\Http\Controllers\MiscApiController::class, 'hChirpVideoInsight6'])->middleware('throttle:30,1');

Route::post('/chirp/product-insight', [\App\Http\Controllers\MiscApiController::class, 'hChirpProductInsight7'])->middleware('throttle:30,1');

Route::get('/videos/{video}/comments', [CommentController::class, 'index']);
Route::post('/copyright-claim', [\App\Http\Controllers\CopyrightController::class, 'submit'])->middleware('throttle:6,60');
Route::get('/sounds/from-video/{ulid}/sheet', [SoundController::class, 'sheetFromVideo']);
Route::get('/sounds/u/{ulid}/sheet', [SoundController::class, 'sheetByUlid']);
Route::get('/sounds/{id}/sheet', [SoundController::class, 'sheet'])->whereNumber('id');
Route::get('/sounds/{sound}/videos', [SoundController::class, 'videos']);   // public: "Load more" on the sound page
Route::get('/users/{user}', [UserController::class, 'apiShow'])->whereNumber('user');
Route::middleware('auth')->post('/feed/reset', [\App\Http\Controllers\MiscApiController::class, 'hAuth8']);

// Username availability check — public, used during registration
Route::get('/auth/check-username', [\App\Http\Controllers\MiscApiController::class, 'hAuthCheckUsername9'])->middleware('throttle:60,1');

// ── Authenticated API ─────────────────────────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {

    //Badges 
    Route::get('/badges/new', [BadgeController::class, 'newBadges']);
    Route::get('/badges/roadmap', [BadgeController::class, 'roadmap']);

    // Videos
    // Route::middleware('verified')->post('/videos/upload', [VideoController::class, 'store']);
    Route::post('/videos/upload-url', [VideoController::class, 'uploadUrl']);   // direct-to-storage upload link
    Route::post('/videos/upload', [VideoController::class, 'store']);
    Route::post('/videos/photos/stage', [VideoController::class, 'stagePhotos'])->middleware('throttle:60,1');   // photos in batches of 10
    Route::post('/videos/photos', [VideoController::class, 'storePhotos'])->middleware('throttle:20,1');   // photo post, up to 30 pictures
    Route::get('/sounds', [SoundController::class, 'index']);   // uploader music picker
    Route::post('/sounds', [SoundController::class, 'store']);   // seller records / uploads a sound
    Route::get('/artist/submissions', [\App\Http\Controllers\ArtistSubmissionController::class, 'mine']);
    Route::post('/artist/submissions', [\App\Http\Controllers\ArtistSubmissionController::class, 'store']);
    Route::delete('/artist/submissions/{sound}', [\App\Http\Controllers\ArtistSubmissionController::class, 'withdraw']);
    Route::delete('/sounds/{sound}', [SoundController::class, 'destroy']);
    Route::get('/sounds/epidemic/{trackId}/preview', [SoundController::class, 'epidemicPreview']);
    Route::post('/sounds/epidemic/{trackId}/import', [SoundController::class, 'epidemicImport']);
    Route::post('/sounds/free/{id}/import', [SoundController::class, 'freeImport']);
    Route::post('/sounds/{sound}/save', [SoundController::class, 'toggleSave']);
    Route::get('/sounds/{sound}', [SoundController::class, 'show']);


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
    Route::post('/community/posts/{post}/save', [CommunityController::class, 'savePost']);
    Route::get('/community/saved', [CommunityController::class, 'savedPosts']);
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
    Route::patch('/community/rooms/{room}/messages/{message}', [CommunityController::class, 'editRoomMessage']);
    Route::post('/community/rooms/{room}/messages/{message}/react', [CommunityController::class, 'reactRoomMessage']);
    Route::post('/community/rooms/{room}/messages/{message}/like', [CommunityController::class, 'likeRoomMessage']);

    Route::post('/community/polls/{poll}/vote', [CommunityController::class, 'votePoll'])->middleware('throttle:40,1');
    Route::post('/community/comments/{comment}/report', [CommunityController::class, 'reportPostComment'])->middleware('throttle:20,1');
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
    Route::post('/comments/{comment}/report', [CommentController::class, 'report'])->middleware('throttle:20,1');
    Route::get('/mentions/search', [\App\Http\Controllers\MentionController::class, 'search'])->middleware('throttle:60,1');
    Route::post('/comments/{comment}/pin',  [CommentController::class, 'pin']);

    // Products
    Route::post('/products', [ProductController::class, 'store']);
    Route::put('/products/{product}', [ProductController::class, 'update']);
    Route::delete('/products/{product}', [ProductController::class, 'destroy']);
    Route::post('/products/{product}/save', [ProductController::class, 'save']);
    Route::post('/products/{product}/restock', [\App\Http\Controllers\RestockController::class, 'restock'])->middleware('throttle:30,1');
    Route::get('/products/{product}/restock-audience', [\App\Http\Controllers\RestockController::class, 'audience']);
    Route::get('/restock-alerts', [\App\Http\Controllers\RestockController::class, 'alerts']);
    Route::get('/hashtags/suggest', [\App\Http\Controllers\HashtagController::class, 'suggest'])->middleware('throttle:90,1');
    Route::post('/restock-alerts/dismiss', [\App\Http\Controllers\RestockController::class, 'dismiss']);
    Route::post('/products/{product}/images', [ProductController::class, 'uploadImages']);
    Route::get('/products/{product}/images', [ProductController::class, 'getImages']);
    Route::put('/products/{product}/images', [ProductController::class, 'syncImages']);
    Route::get('/seller/products/{product}/edit', [ProductController::class, 'edit'])->name('api.seller.products.edit');
    Route::post('/products/{product}/report', [ProductController::class, 'report']);
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
    Route::post('/orders/{order}/confirm-receipt', [OrderController::class, 'confirmReceipt']);
    Route::get('/coupons/available', [\App\Http\Controllers\MiscApiController::class, 'hCouponsAvailable10']);

    // Cart
    Route::get('/cart/count', [CartController::class, 'count']);
    Route::post('/cart', [CartController::class, 'add']);
    Route::patch('/cart/{item}', [CartController::class, 'update']);
    Route::delete('/cart/{item}', [CartController::class, 'remove']);
    Route::delete('/cart', [CartController::class, 'clear']);

    //Event
    Route::get('/events', [EventController::class, 'index']);
Route::get('/events/hunts', [EventController::class, 'activeHunts']);
Route::get('/events/my-ended', [EventController::class, 'myEnded']);
    Route::get('/events/{event}', [EventController::class, 'show']);
    Route::get('/events/{event}/my-results', [EventController::class, 'myResults']);
    Route::get('/events/{event}/hunt-progress', [EventController::class, 'huntProgress']);
Route::post('/events/{event}/join', [EventController::class, 'join']);
Route::delete('/events/{event}/join', [EventController::class, 'leave']);

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
Route::get('/settings/devices', [\App\Http\Controllers\MiscApiController::class, 'hSettingsDevices11']);


Route::delete('/settings/devices/{loginHistory}', [\App\Http\Controllers\MiscApiController::class, 'hSettingsDevicesLoginhistory12']);
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
    Route::post('/conversations/{conversation}/mark-read', [ConversationController::class, 'markRead']);
    Route::post('/conversations/{conversation}/dismiss-request', [ConversationController::class, 'dismissRequest']);
    Route::delete('/conversations/{conversation}/messages/{message}', [ConversationController::class, 'deleteMessage']);
    Route::patch('/conversations/{conversation}/messages/{message}', [ConversationController::class, 'editMessage']);
    Route::post('/conversations/{conversation}/messages/{message}/react', [ConversationController::class, 'reactMessage']);
    Route::patch('/orders/{order}/status', [OrderController::class, 'updateStatus']);
    Route::post('/orders/{order}/disputes', [DisputeController::class, 'store']);
Route::get('/disputes/{dispute}', [DisputeController::class, 'show']);
Route::post('/disputes/{dispute}/messages', [DisputeController::class, 'reply']);
    Route::post('/conversations/{conversation}/report', [ConversationController::class, 'reportConversation']);
    Route::post('/safety/off-platform-warning', [SafetyController::class, 'recordWarning']);
Route::get('/safety/conversations/{conversation}/status', [SafetyController::class, 'conversationStatus']);
Route::get('/safety/seller-info/{seller}', [SafetyController::class, 'sellerInfo']);
Route::post('/safety/classify-message', [SafetyController::class, 'classifyMessage'])->middleware('throttle:30,1');
Route::get('/sellers/{seller}/trust', [SellerTrustController::class, 'show']);
Route::get('/users/suggested', [\App\Http\Controllers\MiscApiController::class, 'hUsersSuggested13']);

Route::get('/users/{user}/relationship', [\App\Http\Controllers\MiscApiController::class, 'hUsersUserRelationship14']);


Route::get('/users/{user}/mutual-follows', [\App\Http\Controllers\MiscApiController::class, 'hUsersUserMutualFollows15']);

Route::get('/users/me/liked-videos', [\App\Http\Controllers\MiscApiController::class, 'hUsersMeLikedVideos16']);
Route::get('/users/me/viewed-videos', [\App\Http\Controllers\MiscApiController::class, 'hUsersMeViewedVideos17']);
Route::get('/users/me/saved-videos-list', [\App\Http\Controllers\MiscApiController::class, 'hUsersMeSavedVideosList18']);

Route::get('/users/me/saved-sounds', [SoundController::class, 'saved']);
Route::get('/users/me/wishlist-products', [\App\Http\Controllers\MiscApiController::class, 'hUsersMeWishlistProducts19']);


Route::get('/subscriptions/me', [\App\Http\Controllers\MiscApiController::class, 'hSubscriptionsMe20']);

Route::post('/support-tickets', [\App\Http\Controllers\MiscApiController::class, 'hSupportTickets21']);


Route::get('/verification-eligibility', [\App\Http\Controllers\MiscApiController::class, 'hVerificationEligibility22']);

Route::patch('/conversations/{conversation}/theme', [\App\Http\Controllers\MiscApiController::class, 'hConversationsConversationTheme23']);

Route::get('/chat-wallpapers', [ChatWallpaperController::class, 'index']);
Route::post('/chat-wallpapers', [ChatWallpaperController::class, 'store']);
Route::delete('/chat-wallpapers/{wallpaper}', [ChatWallpaperController::class, 'destroy']);

Route::patch('/conversations/{conversation}/wallpaper', [\App\Http\Controllers\MiscApiController::class, 'hConversationsConversationWallpaper24']);

Route::get('/users/{user}/suggested-follows', [\App\Http\Controllers\MiscApiController::class, 'hUsersUserSuggestedFollows25']);
    // Seller endpoints
    Route::middleware('role:seller')->prefix('seller')->group(function () {
        Route::get('/stats', [SellerController::class, 'stats']);
        Route::get('/payouts', [SellerController::class, 'payoutsApi']);
        Route::delete('/settings/bank', [SettingsController::class, 'removeBank']);
        // Route::middleware('verified')->post('/payouts', [SellerController::class, 'requestPayout']);
        Route::post('/payouts', [SellerController::class, 'requestPayout']);
        Route::post('/pickup-address', [\App\Http\Controllers\MiscApiController::class, 'hPickupAddress26'])->middleware('auth:sanctum');
    });

    // Admin endpoints
    Route::middleware('role:admin')->prefix('admin')->name('admin.')->group(function () {
        // Admin v2 endpoints — one file per area in routes/admin/ (cache-safe)
        foreach (glob(base_path('routes/admin/*.php')) as $__adminRoutes) { require $__adminRoutes; }

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
        Route::get('/disputes', [DisputeController::class, 'adminIndex']);
    Route::post('/disputes/{dispute}/resolve', [DisputeController::class, 'resolve']);

    Route::post('/tickets/{ticket}/resolve', [AdminController::class, 'resolveTicket']);

        // Sounds, copyright claims, video processing
        Route::prefix('music')->group(function () {
            Route::get('/claims', [\App\Http\Controllers\AdminMusicController::class, 'claims']);
            Route::post('/claims/{claim}/takedown', [\App\Http\Controllers\AdminMusicController::class, 'takedown']);
            Route::post('/claims/{claim}/reject', [\App\Http\Controllers\AdminMusicController::class, 'reject']);
            Route::post('/claims/{claim}/restore', [\App\Http\Controllers\AdminMusicController::class, 'restoreClaim']);
            Route::get('/strikes', [\App\Http\Controllers\AdminMusicController::class, 'strikes']);
            Route::get('/submissions', [\App\Http\Controllers\AdminMusicController::class, 'submissions']);
            Route::post('/submissions/{sound}/approve', [\App\Http\Controllers\AdminMusicController::class, 'approveSubmission']);
            Route::post('/submissions/{sound}/reject', [\App\Http\Controllers\AdminMusicController::class, 'rejectSubmission']);
            Route::get('/sounds', [\App\Http\Controllers\AdminMusicController::class, 'sounds']);
            Route::get('/settings', [\App\Http\Controllers\AdminMusicController::class, 'settings']);
            Route::post('/settings', [\App\Http\Controllers\AdminMusicController::class, 'saveSettings']);
            Route::get('/removed-videos', [\App\Http\Controllers\AdminMusicController::class, 'removedVideos']);
            Route::get('/failed-jobs', [\App\Http\Controllers\AdminMusicController::class, 'failedJobs']);
            Route::post('/failed-jobs/{uuid}/retry', [\App\Http\Controllers\AdminMusicController::class, 'retryFailed']);
            Route::delete('/failed-jobs/{uuid}', [\App\Http\Controllers\AdminMusicController::class, 'forgetFailed']);
            Route::patch('/sounds/{sound}', [\App\Http\Controllers\AdminMusicController::class, 'updateSound']);
            Route::post('/sounds/{sound}/toggle', [\App\Http\Controllers\AdminMusicController::class, 'toggleSound']);
            Route::post('/sounds/{sound}/takedown', [\App\Http\Controllers\AdminMusicController::class, 'takedownSoundAction']);
            Route::delete('/sounds/{sound}', [\App\Http\Controllers\AdminMusicController::class, 'deleteSound']);
            Route::get('/sounds/{sound}/videos', [\App\Http\Controllers\AdminMusicController::class, 'soundVideos']);
            Route::post('/videos/{id}/hide', [\App\Http\Controllers\AdminMusicController::class, 'hideVideo']);
            Route::post('/videos/{id}/restore', [\App\Http\Controllers\AdminMusicController::class, 'restoreVideo']);
            Route::post('/videos/{video}/reprocess', [\App\Http\Controllers\AdminMusicController::class, 'reprocess']);
            Route::get('/stuck', [\App\Http\Controllers\AdminMusicController::class, 'stuck']);
            Route::post('/heal', [\App\Http\Controllers\AdminMusicController::class, 'heal']);
            Route::get('/diag', [\App\Http\Controllers\AdminMusicController::class, 'diag']);
        });

        Route::get('/stats', [AdminController::class, 'stats']);
        Route::get('/analytics', [AdminController::class, 'analytics']);

        Route::post('/payouts/{payout}/approve', [AdminController::class, 'approvePayout']);
        Route::post('/users/{user}/clear-flag', [AdminController::class, 'clearFlag']);

        Route::post('/reports/{report}/actioned',  [AdminController::class, 'actionReport']);
        Route::post('/reports/{report}/dismissed', [AdminController::class, 'dismissReport']);
        Route::get('/conversations/{conversation}/messages', [AdminController::class, 'conversationMessages']);

        // Direct-message oversight and chat restrictions
        Route::get('/chats', [\App\Http\Controllers\Admin\ChatAdminController::class, 'index']);
        Route::get('/chats/restrictions', [\App\Http\Controllers\Admin\ChatAdminController::class, 'restrictions']);
        Route::post('/chats/restrict', [\App\Http\Controllers\Admin\ChatAdminController::class, 'restrict']);
        Route::post('/chats/restrictions/{id}/lift', [\App\Http\Controllers\Admin\ChatAdminController::class, 'lift'])->whereNumber('id');
        Route::get('/chats/{id}/messages', [\App\Http\Controllers\Admin\ChatAdminController::class, 'messages'])->whereNumber('id');
        Route::delete('/chats/{id}/messages/{message}', [\App\Http\Controllers\Admin\ChatAdminController::class, 'deleteMessage'])->whereNumber(['id', 'message']);

        // Account deletions: pending purges, legal hold, restore
        Route::get('/deletions', [\App\Http\Controllers\Admin\DeletionAdminController::class, 'index']);
        Route::post('/deletions/{id}/hold', [\App\Http\Controllers\Admin\DeletionAdminController::class, 'hold'])->whereNumber('id');
        Route::post('/deletions/{id}/release', [\App\Http\Controllers\Admin\DeletionAdminController::class, 'release'])->whereNumber('id');
        Route::post('/deletions/{id}/restore', [\App\Http\Controllers\Admin\DeletionAdminController::class, 'restore'])->whereNumber('id');
        Route::post('/deletions/{id}/purge', [\App\Http\Controllers\Admin\DeletionAdminController::class, 'purge'])->whereNumber('id');

        Route::get('/events', [EventController::class, 'adminIndex']);
Route::post('/events', [EventController::class, 'adminStore']);
Route::put('/events/{event}', [EventController::class, 'adminUpdate']);
Route::post('/events/{event}/publish', [EventController::class, 'adminPublish']);
Route::post('/events/{event}/end', [EventController::class, 'adminEnd']);
Route::post('/events/upload-banner', [EventController::class, 'adminUploadBanner']);

    Route::get('/users/{user}/details', [\App\Http\Controllers\MiscApiController::class, 'hUsersUserDetails27']);

        });

    Route::get('/users/search', [\App\Http\Controllers\MiscApiController::class, 'hUsersSearch28']);
});