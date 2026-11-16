<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;

/**
 * Former closure routes from routes/api.php, moved here so `php artisan route:cache` works.
 * Behaviour is unchanged.
 */
class MiscApiController extends Controller
{
    /** /products/{product:slug}/reviews */
    public function hProductsProductSlugReviews1(Product $product, Request $request)
    {
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
}

    /** /search/suggest */
    public function hSearchSuggest2(Request $request)
    {
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

        $products = Product::where('status', 'active')
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
}

    /** /search/discover */
    public function hSearchDiscover3()
    {
    return Cache::remember('search_discover', 600, function () {
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
}

    /** /locations/states */
    public function hLocationsStates4()
    {
    try {
        $cached = Cache::get('terminal_ng_states');
        if (!empty($cached)) return response()->json(['states' => $cached]);
        Cache::forget('terminal_ng_states');

        $states = app(\App\Services\TerminalService::class)->getStates();
        return response()->json(['states' => $states]);
    } catch (\Throwable $e) {
        return response()->json(['states' => [], 'error' => $e->getMessage()], 200);
    }
}

    /** /locations/cities */
    public function hLocationsCities5(Request $request)
    {
    $request->validate(['state_code' => 'required|string']);
    try {
        $stateCode = $request->state_code;
        $cacheKey  = 'terminal_cities_' . $stateCode;
        $cached    = Cache::get($cacheKey);
        if (empty($cached)) Cache::forget($cacheKey);

        $cities = app(\App\Services\TerminalService::class)->getCities($stateCode);
        return response()->json(['cities' => $cities]);
    } catch (\Throwable $e) {
        \Log::error('getCities route failed', ['error' => $e->getMessage()]);
        return response()->json(['cities' => [], 'error' => $e->getMessage()], 200);
    }
}

    /** /chirp/video-insight */
    public function hChirpVideoInsight6(Request $request)
    {
    $request->validate(['video_id' => 'required|exists:videos,id', 'mode' => 'required|in:ask,style']);
    $video = \App\Models\Video::with('products')->findOrFail($request->video_id);
    $isStyle = $request->mode === 'style';


    $cacheKey = "chirp_insight:{$video->id}:{$request->mode}";

    $result = Cache::remember($cacheKey, now()->addDays(7), function () use ($video, $isStyle) {
        $instruction = $isStyle
            ? "You are Chirp, acting as a real personal stylist. Watch this product video titled \"{$video->title}\" ({$video->description}). Give genuine, detailed styling advice — specific pairing suggestions (exact item types, colors, textures), occasions it suits, and one or two concrete outfit combinations — in 5-7 warm, conversational sentences. Be specific, not generic."
            : "You are Chirp. Watch this product video titled \"{$video->title}\" ({$video->description}) and answer as if you genuinely watched it, in 2-4 natural sentences.";

        $parts = [['text' => $instruction . ' Do NOT claim whether similar products were found on Flockr — that is reported separately. Respond with ONLY compact JSON, no markdown: {"message": "your reply", "search_terms": ["term1", "term2", "term3"]}. search_terms should be ' . ($isStyle ? 'complementary items that style well with this piece (never the item itself)' : 'items similar to this product') . '.']];

        try {
            $key = ltrim(str_replace(config('filesystems.disks.' . config('filesystems.default') . '.url'), '', $video->video_url ?? ''), '/');
            $bytes = \Illuminate\Support\Facades\Storage::disk(config('filesystems.default'))->get($key);
            if ($bytes && strlen($bytes) < 15 * 1024 * 1024) {
                $parts[] = ['inline_data' => ['mime_type' => 'video/mp4', 'data' => base64_encode($bytes)]];
            }
        } catch (\Throwable $e) {}

        $response = \Illuminate\Support\Facades\Http::timeout(30)->post(
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=' . config('services.gemini.key'),
            ['contents' => [['parts' => $parts]]]
        );

        $raw = data_get($response->json(), 'candidates.0.content.parts.0.text', '');
        $clean = trim(preg_replace('/```json|```/', '', $raw));
        $parsed = json_decode($clean, true);

        return [
            'description' => is_array($parsed) ? ($parsed['message'] ?? '') : '',
            'terms' => is_array($parsed) ? ($parsed['search_terms'] ?? []) : [],
        ];
    });

    // Product search runs fresh EVERY request, never cached — so if new matching
    // products get listed after the analysis was cached, buyers still see them.
    $products = collect($result['terms'])->flatMap(fn($term) =>
        Product::where('status', 'active')
            ->where(fn($q) => $q->where('name', 'ilike', "%{$term}%")->orWhere('description', 'ilike', "%{$term}%"))
            ->where('id', '!=', $video->products->first()?->id)
            ->limit(4)->get()
    )->unique('id')->take(8)->values();

    $description = $result['description'] ?: ($isStyle ? "Here's how I'd style this." : "Here's what I found.");
    $message = $products->isNotEmpty()
        ? "{$description} I found {$products->count()} " . ($isStyle ? 'matching pieces' : 'similar products') . " for you below!"
        : "{$description} I couldn't find close matches on Flockr right now.";

    return response()->json(['message' => $message, 'products' => $products]);
}

    /** /chirp/product-insight */
    public function hChirpProductInsight7(\Illuminate\Http\Request $request)
    {
    $request->validate(['product_id' => 'required|exists:products,id', 'mode' => 'required|in:ask,style']);
    $product = \App\Models\Product::findOrFail($request->product_id);
    $isStyle = $request->mode === 'style';
    $cacheKey = "chirp_product_insight:{$product->id}:{$request->mode}";

    $result = \Illuminate\Support\Facades\Cache::remember($cacheKey, now()->addDays(7), function () use ($product, $isStyle) {
        $instruction = $isStyle
            ? "You are Chirp, acting as a real personal stylist. Look at this product photo: \"{$product->name}\" ({$product->description}). Give genuine, detailed styling advice — specific pairing suggestions, occasions it suits, one or two concrete outfit combinations — in 5-7 warm, conversational sentences. Be specific, not generic."
            : "You are Chirp. Look at this product photo: \"{$product->name}\" ({$product->description}) and answer naturally in 2-4 sentences.";

        $parts = [['text' => $instruction . ' Do NOT claim whether similar products were found on Flockr — that is reported separately. Respond with ONLY compact JSON, no markdown: {"message": "your reply", "search_terms": ["term1", "term2", "term3", "term4", "term5"]}. Give 5 search_terms: mix broad category words (e.g. "shoes", "bag") AND specific descriptive words (e.g. "brown", "leather") so matching has the best chance of finding something real.']];

        try {
            $key = ltrim(str_replace(
                config('filesystems.disks.' . config('filesystems.default') . '.url'), '',
                $product->primary_image ?? ''
            ), '/');
            $bytes = \Illuminate\Support\Facades\Storage::disk(config('filesystems.default'))->get($key);
            if ($bytes) {
                $parts[] = ['inline_data' => ['mime_type' => 'image/jpeg', 'data' => base64_encode($bytes)]];
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning("Chirp product-insight: couldn't read image for product {$product->id}: " . $e->getMessage());
        }

        $response = \Illuminate\Support\Facades\Http::timeout(25)->post(
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=' . config('services.gemini.key'),
            ['contents' => [['parts' => $parts]]]
        );

        $raw = data_get($response->json(), 'candidates.0.content.parts.0.text', '');
        \Illuminate\Support\Facades\Log::info("Chirp product-insight raw response for product {$product->id}: " . $raw);

        $clean = trim(preg_replace('/```json|```/', '', $raw));
        $parsed = json_decode($clean, true);

        return ['description' => is_array($parsed) ? ($parsed['message'] ?? '') : '', 'terms' => is_array($parsed) ? ($parsed['search_terms'] ?? []) : []];
    });


    $words = collect($result['terms'])->flatMap(fn($t) => explode(' ', $t))->map(fn($w) => trim($w))->filter(fn($w) => strlen($w) > 2)->unique();

    \Illuminate\Support\Facades\Log::info("Chirp product-insight search words for product {$product->id}: " . $words->implode(', '));

    $products = \App\Models\Product::where('status', 'active')
        ->where('id', '!=', $product->id)
        ->where(function ($q) use ($words) {
            foreach ($words as $w) {
                $q->orWhere('name', 'ilike', "%{$w}%")->orWhere('description', 'ilike', "%{$w}%");
            }
        })
        ->limit(8)->get();

    \Illuminate\Support\Facades\Log::info("Chirp product-insight matched " . $products->count() . " products for product {$product->id}");

    $description = $result['description'] ?: ($isStyle ? "Here's how I'd style this." : "Here's what I see.");
    $message = $products->isNotEmpty()
        ? "{$description} I found {$products->count()} " . ($isStyle ? 'matching pieces' : 'similar products') . " for you below!"
        : "{$description} I couldn't find close matches on Flockr right now.";

    return response()->json(['message' => $message, 'products' => $products]);
}

    /** auth */
    public function hAuth8()
    {
    app(\App\Services\FeedService::class)->resetSeenVideos(Auth::id());
    return response()->json(['ok' => true]);
}

    /** /auth/check-username */
    public function hAuthCheckUsername9(Request $request)
    {
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
}

    /** /coupons/available */
    public function hCouponsAvailable10(Request $request)
    {
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
    }

    /** /settings/devices */
    public function hSettingsDevices11(Request $request)
    {
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
}

    /** /settings/devices/{loginHistory} */
    public function hSettingsDevicesLoginhistory12(Request $request, \App\Models\LoginHistory $loginHistory)
    {
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
}

    /** /users/suggested */
    public function hUsersSuggested13()
    {
    $userId = Auth::id();

    $recentPartnerIds = \App\Models\Conversation::whereHas('participants', fn($q) => $q->where('user_id', $userId))
        ->with(['participants' => fn($q) => $q->where('user_id', '!=', $userId)])
        ->latest('updated_at')
        ->limit(15)
        ->get()
        ->pluck('participants')
        ->flatten()
        ->pluck('id')
        ->unique()
        ->reject(fn($id) => \App\Models\User::where('id', $id)->value('is_flockr_support'))
        ->values();

    $users = \App\Models\User::whereIn('id', $recentPartnerIds)
        ->where('is_active', true)
        ->select('id', 'name', 'username', 'avatar', 'role', 'is_verified')
        ->get();

    return response()->json($users->sortBy(fn($u) => $recentPartnerIds->search($u->id))->values());
}

    /** /users/{user}/relationship */
    public function hUsersUserRelationship14(\App\Models\User $user)
    {
    $me = Auth::id();
    return response()->json([
        'i_follow_them' => DB::table('follows')->where('follower_id', $me)->where('following_id', $user->id)->exists(),
        'they_follow_me' => DB::table('follows')->where('follower_id', $user->id)->where('following_id', $me)->exists(),
        'followers_count' => $user->followers_count ?? 0,
        'following_count' => $user->following_count ?? 0,
    ]);
}

    /** /users/{user}/mutual-follows */
    public function hUsersUserMutualFollows15(\App\Models\User $user)
    {
    $me = Auth::id();
    if (!$me || $me === $user->id) return response()->json(['count' => 0, 'users' => []]);

    $mutualIds = DB::table('follows as f1')
        ->join('follows as f2', 'f1.following_id', '=', 'f2.follower_id')
        ->where('f1.follower_id', $me)
        ->where('f2.following_id', $user->id)
        ->pluck('f2.follower_id');

    $users = \App\Models\User::whereIn('id', $mutualIds)
        ->select('id', 'name', 'username', 'avatar', 'is_verified')
        ->limit(30)
        ->get();

    return response()->json(['count' => $users->count(), 'users' => $users]);
}

    /** /users/me/liked-videos */
    public function hUsersMeLikedVideos16()
    {
    return Auth::user()->likedVideos()->with('user:id,name,username,avatar')->latest('video_likes.created_at')->get();
}

    /** /users/me/viewed-videos */
    public function hUsersMeViewedVideos17()
    {
    $videoIds = \App\Models\VideoView::where('user_id', Auth::id())->latest()->pluck('video_id')->unique()->take(60);
    return \App\Models\Video::whereIn('id', $videoIds)->with('user:id,name,username,avatar')->get();
}

    /** /users/me/saved-videos-list */
    public function hUsersMeSavedVideosList18()
    {
    return Auth::user()->savedVideos()->with('user:id,name,username,avatar')->latest('video_saves.created_at')->get();
}

    /** /users/me/wishlist-products */
    public function hUsersMeWishlistProducts19()
    {
    return Auth::user()->savedProducts()
        ->with('seller:id,name,username,avatar,is_verified')
        ->latest('product_saves.created_at')
        ->get();
}

    /** /subscriptions/me */
    public function hSubscriptionsMe20()
    {
    $sub = \App\Models\Subscription::where('user_id', Auth::id())->latest('expires_at')->first();
    $user = Auth::user();
    return response()->json([
        'has_active' => $user->hasActiveSubscription(),
        'plan' => $sub?->plan,
        'status' => $sub?->status,
        'amount_paid' => $sub?->amount_paid,
        'starts_at' => $sub?->starts_at,
        'expires_at' => $sub?->expires_at,
        'fee_percent' => $user->hasActiveSubscription() ? config('flockr.pro_platform_fee_percent') : config('flockr.platform_fee_percent'),
    ]);
}

    /** /support-tickets */
    public function hSupportTickets21(Request $request)
    {
    $request->validate(['type' => 'required|in:bug,verification_request', 'message' => 'required|string|max:1000']);
    \App\Models\SupportTicket::create([
        'user_id' => Auth::id(),
        'type' => $request->type,
        'message' => $request->message,
    ]);
    return response()->json(['ok' => true]);
}

    /** /verification-eligibility */
    public function hVerificationEligibility22()
    {
    $user = Auth::user();

    $totalOrders = \App\Models\Order::where('seller_id', $user->id)
        ->whereNotNull('paid_at')->where('status', '!=', 'refunded')->count();
    $disputedOrders = \App\Models\Order::where('seller_id', $user->id)->where('status', 'disputed')->count();
    $disputeRate = $totalOrders > 0 ? round(($disputedOrders / $totalOrders) * 100, 1) : 0;

    $hasPost = \App\Models\Video::where('user_id', $user->id)->where('status', 'active')->exists();

    $criteria = [
        ['key' => 'avatar',      'label' => 'Profile picture added',      'met' => !empty($user->avatar)],
        ['key' => 'username',    'label' => 'Username set',               'met' => !empty($user->username)],
        ['key' => 'name',        'label' => 'Full name set',              'met' => !empty($user->name)],
        ['key' => 'onboarding',  'label' => 'Seller onboarding completed', 'met' => !empty($user->bank_name)],
        ['key' => 'orders',      'label' => 'At least 5 orders completed', 'met' => $totalOrders >= 5, 'value' => "{$totalOrders} completed"],
        ['key' => 'disputes',    'label' => 'Dispute rate under 2%',      'met' => $disputeRate < 2, 'value' => "{$disputeRate}%"],
        ['key' => 'rating',      'label' => 'Rating 4.2 or higher',       'met' => (float) ($user->avg_rating ?? 0) >= 4.2, 'value' => number_format($user->avg_rating ?? 0, 1)],
        ['key' => 'post', 'label' => 'At least one video posted', 'met' => $hasPost],
    ];

    return response()->json([
        'criteria' => $criteria,
        'all_met' => collect($criteria)->every(fn($c) => $c['met']),
    ]);
}

    /** /conversations/{conversation}/theme */
    public function hConversationsConversationTheme23(\App\Models\Conversation $conversation, Request $request)
    {
    if (!$conversation->participants()->where('user_id', Auth::id())->exists()) {
        return response()->json(['message' => 'Unauthorized.'], 403);
    }

    $request->validate(['theme' => 'required|string']);
    $freeThemes = ['off', 'bubbles', 'drift'];
    $user = Auth::user();

    if (!in_array($request->theme, $freeThemes) && !($user->role === 'seller' && $user->hasActiveSubscription())) {
        return response()->json(['message' => 'This background is a Flockr Pro feature for sellers.'], 403);
    }

    DB::table('conversation_user')
        ->where('conversation_id', $conversation->id)
        ->where('user_id', $user->id)
        ->update(['chat_theme' => $request->theme, 'chat_wallpaper_id' => null]);

    return response()->json(['theme' => $request->theme]);
}

    /** /conversations/{conversation}/wallpaper */
    public function hConversationsConversationWallpaper24(\App\Models\Conversation $conversation, \Illuminate\Http\Request $request)
    {
    if (!$conversation->participants()->where('user_id', Auth::id())->exists()) {
        return response()->json(['message' => 'Unauthorized.'], 403);
    }
    $request->validate(['wallpaper_id' => 'nullable|integer|exists:chat_wallpapers,id']);
    $user = Auth::user();

    if ($request->wallpaper_id) {
        \App\Models\ChatWallpaper::where('id', $request->wallpaper_id)->where('user_id', $user->id)->firstOrFail();
        if (!($user->role === 'seller' && $user->hasActiveSubscription())) {
            return response()->json(['message' => 'Custom wallpapers are a Flockr Pro feature for sellers.'], 403);
        }
    }

    // A conversation shows either an animated theme OR a static wallpaper —
    // never both — so setting one clears the other.
    DB::table('conversation_user')
        ->where('conversation_id', $conversation->id)
        ->where('user_id', $user->id)
        ->update(['chat_wallpaper_id' => $request->wallpaper_id, 'chat_theme' => 'off']);

    return response()->json(['ok' => true]);
}

    /** /users/{user}/suggested-follows */
    public function hUsersUserSuggestedFollows25(\App\Models\User $user)
    {
    $me = Auth::id();
    $alreadyFollowingIds = DB::table('follows')->where('follower_id', $me)->pluck('following_id')->toArray();

    // "People who follow the account you just followed, also follow..." —
    // a lightweight collaborative-filtering pattern, no ML needed.
    $suggested = DB::table('follows as f1')
        ->join('follows as f2', 'f1.follower_id', '=', 'f2.follower_id')
        ->where('f1.following_id', $user->id)
        ->where('f2.following_id', '!=', $user->id)
        ->whereNotIn('f2.following_id', array_merge($alreadyFollowingIds, [$me]))
        ->select('f2.following_id', DB::raw('count(*) as overlap'))
        ->groupBy('f2.following_id')
        ->orderByDesc('overlap')
        ->limit(10)
        ->pluck('f2.following_id');

    $users = \App\Models\User::whereIn('id', $suggested)
        ->where('is_active', true)
        ->select('id', 'name', 'username', 'avatar', 'role')
        ->get()
        ->sortBy(fn($u) => array_search($u->id, $suggested->toArray()))
        ->values();

    return response()->json($users);
}

    /** /pickup-address */
    public function hPickupAddress26(Request $request)
    {
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
}

    /** /users/{user}/details */
    public function hUsersUserDetails27(\App\Models\User $user)
    {
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
}

    /** /users/search */
    public function hUsersSearch28(Request $request)
    {
        $q = $request->input('q', '');
        if (strlen($q) < 1)
            return response()->json([]);

        return \App\Models\User::where('id', '!=', Auth::id())
            ->where(function ($query) use ($q) {
                $query->where('name', 'ilike', "%{$q}%")
                    ->orWhere('username', 'ilike', "%{$q}%");
            })
            ->where('is_active', true)
            ->select('id', 'name', 'username', 'avatar', 'role', 'is_verified')
            ->limit(8)
            ->get();
    }

}
