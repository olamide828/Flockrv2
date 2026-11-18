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

    // ── Chirp (AI stylist / "ask about this") ─────────────────────────────────

    /** Ask Gemini. Returns ['description' => string, 'terms' => string[]] or null when the call failed (never cached). */
    private function chirpGemini(array $parts): ?array
    {
        $key = config('services.gemini.key') ?: env('GEMINI_API_KEY');
        if (!$key) {
            \Illuminate\Support\Facades\Log::warning('Chirp: GEMINI_API_KEY is not set, so no AI text can be written.');
            return null;
        }
        try {
            $r = \Illuminate\Support\Facades\Http::timeout(40)->post(
                'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=' . $key,
                ['contents' => [['parts' => $parts]]]
            );
            if (!$r->successful()) {
                \Illuminate\Support\Facades\Log::warning('Chirp: Gemini returned HTTP ' . $r->status() . ' ' . substr($r->body(), 0, 300));
                return null;
            }
            $raw    = (string) data_get($r->json(), 'candidates.0.content.parts.0.text', '');
            $parsed = json_decode(trim(preg_replace('/```json|```/', '', $raw)), true);
            if (is_array($parsed)) {
                $desc = trim((string) ($parsed['message'] ?? ''));
                if ($desc === '') return null;
                return ['description' => $desc, 'terms' => array_values(array_filter((array) ($parsed['search_terms'] ?? []), 'is_string'))];
            }
            // The model answered in plain text instead of JSON: still useful as the reply
            return trim($raw) !== '' ? ['description' => trim($raw), 'terms' => []] : null;
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Chirp: Gemini call failed: ' . $e->getMessage());
            return null;
        }
    }

    /** Read a stored file (relative path or full URL) as bytes, or null. */
    private function chirpRead(?string $path, int $maxBytes): ?string
    {
        if (!$path) return null;
        try {
            $disk = config('filesystems.default');
            $url  = (string) config("filesystems.disks.$disk.url");
            $key  = ltrim($url !== '' ? str_replace($url, '', $path) : $path, '/');
            $bytes = \Illuminate\Support\Facades\Storage::disk($disk)->get($key);
            return ($bytes && strlen($bytes) <= $maxBytes) ? $bytes : null;
        } catch (\Throwable $e) {
            return null;
        }
    }

    /** Words to search the catalogue with when the AI gave none (or failed). */
    private function chirpFallbackTerms(string $text): array
    {
        $stop = ['the','and','for','with','new','this','that','from','your','you','are','was','but'];
        return collect(preg_split('/[^\pL\pN]+/u', mb_strtolower($text)))
            ->filter(fn($w) => mb_strlen($w) > 2 && !in_array($w, $stop, true))->unique()->take(6)->values()->all();
    }

    /** Products shaped for <ProductCard>: it needs the seller, so without it the card renders nothing. */
    private function chirpFind(array $terms, array $excludeIds, int $limit = 8)
    {
        $words = collect($terms)->flatMap(fn($t) => preg_split('/\s+/', trim($t)))
            ->map(fn($w) => trim($w))->filter(fn($w) => mb_strlen($w) > 2)->unique()->take(12);
        if ($words->isEmpty()) return collect();

        $products = Product::where('status', 'active')
            ->whereNotIn('id', array_filter($excludeIds))
            ->where(function ($q) use ($words) {
                foreach ($words as $w) {
                    $q->orWhere('name', 'ilike', "%{$w}%")->orWhere('description', 'ilike', "%{$w}%");
                }
            })
            ->with(['seller' => fn($q) => $q->select('id', 'name', 'username', 'avatar', 'is_verified')->withActiveSubscriptionFlag()])
            ->limit($limit)->get()
            ->filter(fn($p) => $p->seller?->username)->values();

        $saved = Auth::id()
            ? DB::table('product_saves')->where('user_id', Auth::id())->whereIn('product_id', $products->pluck('id'))->pluck('product_id')->flip()->all()
            : [];
        $products->each(fn($p) => $p->is_saved = isset($saved[$p->id]));
        return $products;
    }

    private function chirpReply(array $result, $products, bool $isStyle, string $fallbackText): \Illuminate\Http\JsonResponse
    {
        $text = $result['description'] !== ''
            ? $result['description']
            : ($isStyle
                ? "I couldn't reach my styling brain just now, but here are pieces that could go with this."
                : "I couldn't take a proper look just now, but here is what's similar.");
        $tail = $products->isNotEmpty()
            ? ' ' . ($isStyle ? 'Matching pieces' : 'Similar products') . ' are below.'
            : " I couldn't find close matches on Flockr right now.";
        return response()->json(['message' => $text . $tail, 'products' => $products, 'ai' => $result['description'] !== '']);
    }

    /** /chirp/video-insight */
    public function hChirpVideoInsight6(Request $request)
    {
        $request->validate(['video_id' => 'required|exists:videos,id', 'mode' => 'required|in:ask,style']);
        $video   = \App\Models\Video::with('products')->findOrFail($request->video_id);
        $isStyle = $request->mode === 'style';
        $cacheKey = "chirp_insight:v2:{$video->id}:{$request->mode}";

        $result = Cache::get($cacheKey);
        if (!$result) {
            $what = ($video->media_type ?? 'video') === 'photos' ? 'photo post' : 'product video';
            $instruction = $isStyle
                ? "You are Chirp, acting as a real personal stylist. Look at this {$what} titled \"{$video->title}\" ({$video->description}). Give genuine, detailed styling advice: specific pairing suggestions (exact item types, colors, textures), occasions it suits, and one or two concrete outfit combinations, in 5-7 warm, conversational sentences. Be specific, not generic."
                : "You are Chirp. Look at this {$what} titled \"{$video->title}\" ({$video->description}) and answer as if you genuinely watched it, in 2-4 natural sentences.";
            $parts = [['text' => $instruction . ' Do NOT claim whether similar products were found on Flockr, that is reported separately. Respond with ONLY compact JSON, no markdown: {"message": "your reply", "search_terms": ["term1", "term2", "term3", "term4", "term5"]}. Give 5 search_terms: ' . ($isStyle ? 'complementary items that style well with this piece (never the item itself), mixing broad words like "shoes" with descriptive ones like "brown leather"' : 'items similar to this product, mixing broad and descriptive words') . '.']];

            if (($video->media_type ?? 'video') === 'photos') {
                $img = $this->chirpRead($video->photos[0] ?? null, 8 * 1024 * 1024);
                if ($img) $parts[] = ['inline_data' => ['mime_type' => 'image/jpeg', 'data' => base64_encode($img)]];
            } else {
                $bytes = $this->chirpRead($video->video_url, 15 * 1024 * 1024);
                if ($bytes) {
                    $parts[] = ['inline_data' => ['mime_type' => 'video/mp4', 'data' => base64_encode($bytes)]];
                } else {
                    // Too big to send? the thumbnail is still a good look at the item
                    $thumb = $this->chirpRead($video->thumbnail_url, 8 * 1024 * 1024);
                    if ($thumb) $parts[] = ['inline_data' => ['mime_type' => 'image/jpeg', 'data' => base64_encode($thumb)]];
                }
            }

            $result = $this->chirpGemini($parts);
            if ($result) Cache::put($cacheKey, $result, now()->addDays(7));   // failures are never cached
        }
        $result ??= ['description' => '', 'terms' => []];

        $terms = $result['terms'] ?: $this->chirpFallbackTerms(trim(($video->title ?? '') . ' ' . ($video->hashtags ?? '') . ' ' . $video->products->pluck('name')->implode(' ')));
        $products = $this->chirpFind($terms, [$video->products->first()?->id]);

        return $this->chirpReply($result, $products, $isStyle, '');
    }

    /** /chirp/product-insight */
    public function hChirpProductInsight7(\Illuminate\Http\Request $request)
    {
        $request->validate(['product_id' => 'required|exists:products,id', 'mode' => 'required|in:ask,style']);
        $product = \App\Models\Product::findOrFail($request->product_id);
        $isStyle = $request->mode === 'style';
        $cacheKey = "chirp_product_insight:v2:{$product->id}:{$request->mode}";

        $result = Cache::get($cacheKey);
        if (!$result) {
            $instruction = $isStyle
                ? "You are Chirp, acting as a real personal stylist. Look at this product photo: \"{$product->name}\" ({$product->description}). Give genuine, detailed styling advice: specific pairing suggestions, occasions it suits, one or two concrete outfit combinations, in 5-7 warm, conversational sentences. Be specific, not generic."
                : "You are Chirp. Look at this product photo: \"{$product->name}\" ({$product->description}) and tell the shopper what stands out about it (look, material, who it suits, how to wear or use it) in 2-4 natural sentences.";
            $parts = [['text' => $instruction . ' Do NOT claim whether similar products were found on Flockr, that is reported separately. Respond with ONLY compact JSON, no markdown: {"message": "your reply", "search_terms": ["term1", "term2", "term3", "term4", "term5"]}. Give 5 search_terms: mix broad category words (e.g. "shoes", "bag") AND specific descriptive words (e.g. "brown", "leather").']];

            $img = $this->chirpRead(($product->images[0] ?? null) ?: $product->primary_image, 8 * 1024 * 1024);
            if ($img) $parts[] = ['inline_data' => ['mime_type' => 'image/jpeg', 'data' => base64_encode($img)]];

            $result = $this->chirpGemini($parts);
            if ($result) Cache::put($cacheKey, $result, now()->addDays(7));
        }
        $result ??= ['description' => '', 'terms' => []];

        $terms = $result['terms'] ?: $this->chirpFallbackTerms(trim($product->name . ' ' . implode(' ', (array) $product->tags)));
        $products = $this->chirpFind($terms, [$product->id]);

        return $this->chirpReply($result, $products, $isStyle, '');
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
