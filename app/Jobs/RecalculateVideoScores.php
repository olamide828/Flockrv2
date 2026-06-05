<?php

namespace App\Jobs;

use App\Models\Video;
use App\Models\VideoScore;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * RecalculateVideoScores
 *
 * Runs every hour via scheduler.
 * Pre-computes quality_score and commerce_score for all active videos.
 * This avoids computing expensive aggregates on every feed request.
 *
 * Schedule in app/Console/Kernel.php:
 *   $schedule->job(new RecalculateVideoScores)->hourly();
 *
 * Or via artisan:
 *   php artisan queue:work --queue=feed-scoring
 */
class RecalculateVideoScores implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 300;
    public int $tries   = 2;

    public function handle(): void
    {
        Log::info('RecalculateVideoScores: starting');

        // Process in chunks of 500 to avoid memory issues
        Video::active()
            ->select('id', 'user_id', 'views_count', 'likes_count', 'saves_count', 'shares_count', 'published_at', 'is_for_sale')
            ->chunk(500, function ($videos) {
                $videoIds = $videos->pluck('id')->toArray();

                // ── Batch aggregate stats from video_views ────────────────
                $viewStats = DB::table('video_views')
                    ->whereIn('video_id', $videoIds)
                    ->select(
                        'video_id',
                        DB::raw('AVG(watch_percent) as avg_completion'),
                        DB::raw('COUNT(*) as total_views'),
                        DB::raw('COUNT(CASE WHEN watch_percent >= 80 THEN 1 END) as completions'),
                    )
                    ->groupBy('video_id')
                    ->get()
                    ->keyBy('video_id');

                // ── Batch velocity (interactions in last 24h) ─────────────
                $velocity = DB::table('feed_events')
                    ->whereIn('video_id', $videoIds)
                    ->where('occurred_at', '>=', now()->subDay())
                    ->whereIn('event', ['product_purchase', 'product_cart', 'product_click', 'seller_follow', 'video_complete', 'video_share'])
                    ->select('video_id', DB::raw('COUNT(*) as count'))
                    ->groupBy('video_id')
                    ->get()
                    ->keyBy('video_id');

                // ── Batch commerce events ─────────────────────────────────
                $commerce = DB::table('feed_events')
                    ->whereIn('video_id', $videoIds)
                    ->whereIn('event', ['product_purchase', 'product_cart', 'product_click', 'product_wishlist'])
                    ->select('video_id', 'event', DB::raw('COUNT(*) as count'))
                    ->groupBy('video_id', 'event')
                    ->get()
                    ->groupBy('video_id');

                // ── Creator quality (rolling average across all their videos) ──
                $creatorScores = DB::table('video_scores')
                    ->join('videos', 'video_scores.video_id', '=', 'videos.id')
                    ->whereIn('videos.user_id', $videos->pluck('user_id')->unique()->toArray())
                    ->select('videos.user_id', DB::raw('AVG(video_scores.quality_score) as avg_quality'))
                    ->groupBy('videos.user_id')
                    ->get()
                    ->keyBy('user_id');

                foreach ($videos as $video) {
                    $this->scoreVideo($video, $viewStats, $velocity, $commerce, $creatorScores);
                }
            });

        Log::info('RecalculateVideoScores: complete');
    }

    private function scoreVideo($video, $viewStats, $velocity, $commerce, $creatorScores): void
    {
        try {
            $stats      = $viewStats[$video->id] ?? null;
            $vel        = $velocity[$video->id]->count ?? 0;
            $comEvents  = $commerce[$video->id] ?? collect();
            $views      = max(1, $video->views_count);

            // ── Watch-through rate (0–100) ──────────────────────────────────
            $watchThroughRate = $stats ? min(100, (float) $stats->avg_completion) : 0;

            // ── Engagement rate (interactions / views) ──────────────────────
            $totalEngagement  = $video->likes_count + ($video->saves_count * 2) + ($video->shares_count * 2);
            $engagementRate   = min(1.0, $totalEngagement / $views);

            // ── Commerce rates ───────────────────────────────────────────────
            $purchaseCount    = $comEvents->where('event', 'product_purchase')->sum('count');
            $cartCount        = $comEvents->where('event', 'product_cart')->sum('count');
            $clickCount       = $comEvents->where('event', 'product_click')->sum('count');
            $wishlistCount    = $comEvents->where('event', 'product_wishlist')->sum('count');

            $purchaseRate     = min(1.0, $purchaseCount / $views);
            $cartRate         = min(1.0, $cartCount / $views);
            $clickRate        = min(1.0, $clickCount / $views);
            $saveRate         = min(1.0, $video->saves_count / $views);
            $shareRate        = min(1.0, $video->shares_count / $views);

            // ── Quality score (0–100) ────────────────────────────────────────
            // Weighted composite:
            //   watch-through 35% + engagement 25% + save_rate 15% + share_rate 15% + velocity 10%
            $velNorm     = min(1.0, $vel / 100); // normalise velocity (100 events/day = 1.0)
            $qualityScore = (
                ($watchThroughRate / 100 * 0.35)
                + ($engagementRate        * 0.25)
                + ($saveRate              * 0.15)
                + ($shareRate             * 0.15)
                + ($velNorm               * 0.10)
            ) * 100;

            // ── Commerce score (0–100) ───────────────────────────────────────
            // Weighted:
            //   purchase_rate 40% + cart_rate 25% + click_rate 20% + wishlist 15%
            // Commerce score is 0 if video has no products tagged
            $wishlistRate = min(1.0, $wishlistCount / $views);
            $commerceScore = $video->is_for_sale ? (
                ($purchaseRate  * 0.40)
                + ($cartRate    * 0.25)
                + ($clickRate   * 0.20)
                + ($wishlistRate * 0.15)
            ) * 100 : 0;

            // ── Creator score (inherited) ────────────────────────────────────
            $creatorScore = $creatorScores[$video->user_id]->avg_quality ?? 50;

            VideoScore::updateOrCreate(
                ['video_id' => $video->id],
                [
                    'watch_through_rate' => round($watchThroughRate, 2),
                    'engagement_rate'    => round($engagementRate, 4),
                    'save_rate'          => round($saveRate, 4),
                    'share_rate'         => round($shareRate, 4),
                    'purchase_rate'      => round($purchaseRate, 4),
                    'cart_rate'          => round($cartRate, 4),
                    'velocity_24h'       => $vel,
                    'quality_score'      => round($qualityScore, 2),
                    'commerce_score'     => round($commerceScore, 2),
                    'creator_score'      => round($creatorScore, 2),
                    'scored_at'          => now(),
                ]
            );
        } catch (\Throwable $e) {
            Log::warning("RecalculateVideoScores: failed video {$video->id}: " . $e->getMessage());
        }
    }
}