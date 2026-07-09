<?php

namespace App\Jobs;

use App\Models\Product;
use App\Services\StorageService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver as GdDriver;

/**
 * ProcessProductImage
 *
 * Dispatched after a seller uploads a product image.
 * Does the heavy lifting async so the upload response is instant.
 *
 * Pipeline:
 *   1. Download the originally uploaded image from storage
 *   2. Send to remove.bg API → get back transparent PNG
 *   3. Intervention Image v3:
 *      a. Resize to fit 800×800 (max 80% of canvas = 640px)
 *      b. Center on 1000×1000 pure white (#FFFFFF) canvas
 *      c. Add soft drop shadow under product
 *   4. Save processed JPG back to storage (same folder, different key)
 *   5. Update product.images array: replace original key with processed key
 *
 * On any failure, the original image is kept as-is (graceful degradation).
 */
class ProcessProductImage implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int    $tries   = 2;
    public int    $timeout = 120;

    public function __construct(
        public readonly int    $productId,
        public readonly string $imageKey,   // storage key of the original image
        public readonly int    $imageIndex, // position in product.images array
    ) {}

    public function handle(StorageService $storage): void
    {
        Log::info('ProcessProductImage: handle started', [
        'productId'  => $this->productId,
        'imageKey'   => $this->imageKey,
        'imageIndex' => $this->imageIndex,
    ]);
        $product = Product::find($this->productId);
        if (!$product) return;

        $removeBgKey = config('services.remove_bg.api_key');
        if (!$removeBgKey) {
            Log::warning('ProcessProductImage: REMOVE_BG_API_KEY not set — skipping processing');
            return;
        }

        try {
            // ── Step 1: Get original image bytes ─────────────────────────────
            $disk = config('filesystems.default', 'public');
            $originalBytes = Storage::disk($disk)->get($this->imageKey);
            if (!$originalBytes) {
                Log::warning("ProcessProductImage: original image not found: {$this->imageKey}");
                return;
            }

            // ── Step 2: Call remove.bg ────────────────────────────────────────
            $response = Http::withHeaders(['X-Api-Key' => $removeBgKey])
                ->timeout(60)
                ->attach('image_file', $originalBytes, 'product.jpg')
                ->post('https://api.remove.bg/v1.0/removebg', [
                    'size'          => 'regular',
                    'type'          => 'product',
                    'crop'          => 'true',
                    'crop_margin'   => '10px',
                    'format'        => 'png',
                ]);

            if ($response->failed()) {
                Log::warning('ProcessProductImage: remove.bg failed', [
                    'status'  => $response->status(),
                    'body'    => $response->body(),
                    'product' => $this->productId,
                ]);
                return; // Keep original image — graceful degradation
            }

            $transparentPng = $response->body(); // PNG with transparent background

            // ── Step 3: Intervention Image v3 processing ──────────────────────
            $manager = new ImageManager(new GdDriver());

            // Load the transparent PNG
            $product_img = $manager->read($transparentPng);

            // Get product dimensions after background removal
            $pw = $product_img->width();
            $ph = $product_img->height();

            // Canvas is 1000×1000. Product max size = 80% = 800px
            $canvasSize   = 1000;
            $maxProductPx = (int) ($canvasSize * 0.80); // 800px

            // Scale product to fit within 800×800 while preserving aspect ratio
            $scale  = min($maxProductPx / $pw, $maxProductPx / $ph, 1.0);
            $newW   = (int) round($pw * $scale);
            $newH   = (int) round($ph * $scale);

            $product_img->resize($newW, $newH);

            // Create white canvas 1000×1000
            $canvas = $manager->create($canvasSize, $canvasSize, 'ffffff');

            // Center position
            $offsetX = (int) (($canvasSize - $newW) / 2);
            $offsetY = (int) (($canvasSize - $newH) / 2);

            // Add subtle drop shadow by drawing a slightly offset, blurred grey version
            // We do this by placing a grey semi-transparent copy slightly offset
            // then placing the real product on top
            $shadowImg = clone $product_img;
            $shadowOffsetX = $offsetX + 8;
            $shadowOffsetY = $offsetY + 12;

            // Place shadow (grey-tinted version slightly below/right)
            // Intervention v3: place product image on canvas
            $canvas->place($shadowImg, 'top-left', $shadowOffsetX, $shadowOffsetY);

            // Slightly grey-ify the shadow by overlaying a semi-transparent rectangle
            // This is the simplest shadow approach that works without complex GD operations
           $canvas->drawRectangle($shadowOffsetX, $shadowOffsetY, function ($draw) use ($newW, $newH) {
    $draw->size($newW, $newH);
    $draw->background('rgba(0, 0, 0, 0.18)');
    $draw->border(0, 'rgba(0,0,0,0)');
});

            // Place actual product centered on top of shadow
            $canvas->place($product_img, 'top-left', $offsetX, $offsetY);

            // ── Step 4: Save processed image ──────────────────────────────────
            // Generate a new storage key for the processed version
            $folder       = dirname($this->imageKey); // same folder as original
            $processedKey = $folder . '/' . Str::uuid() . '_processed.jpg';

            // Encode to JPG at 85% quality
            $jpgData = $canvas->toJpeg(85)->toString();

            Storage::disk($disk)->put($processedKey, $jpgData);

            // ── Step 5: Update product.images array ───────────────────────────
            $product->refresh();
            $images = $product->images ?? [];

            

            if (isset($images[$this->imageIndex]) && $images[$this->imageIndex] === $this->imageKey) {
    $images[$this->imageIndex] = $processedKey;

    Log::info('ProcessProductImage: about to update', [
        'new_key' => $processedKey,
        'images'  => $images,
    ]);

    $product->update(['images' => $images]);

    Log::info('ProcessProductImage: update done');

                // Clean up original image to save storage space
                try {
                    Storage::disk($disk)->delete($this->imageKey);
                } catch (\Throwable) {}

                Log::info("ProcessProductImage: processed image {$this->imageIndex} for product {$this->productId}");
            }

        } catch (\Throwable $e) {
            Log::error('ProcessProductImage failed', [
                'product'  => $this->productId,
                'imageKey' => $this->imageKey,
                'error'    => $e->getMessage(),
                'trace'    => $e->getTraceAsString(),
            ]);
            // Don't re-throw — original image stays, seller sees their upload unchanged
        }
    }

    /**
     * Handle job failure gracefully — log and move on.
     * Original image stays untouched.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('ProcessProductImage job failed permanently', [
            'product'  => $this->productId,
            'imageKey' => $this->imageKey,
            'error'    => $exception->getMessage(),
        ]);
    }
}