<?php

namespace App\Http\Controllers;

use App\Models\Video;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

/**
 * GET /api/videos/{video}/photos/{index}/download
 * Sends ONE photo from a photo post with the Flockr watermark burned in (logo + "flockr" + @username).
 * Marks sit well inside the picture (not on an edge), so cropping the border doesn't remove them.
 */
class PhotoDownloadController extends Controller
{
    private const MAX_SIDE = 2048;

    /** One photo as a JPEG download. */
    public function photo(Video $video, int $index): Response
    {
        [$jpg] = $this->render($video, $index);
        $name = 'flockr-' . ($video->user?->username ?? 'photo') . '-' . ($index + 1) . '.jpg';
        return response($jpg, 200, [
            'Content-Type'        => 'image/jpeg',
            'Content-Disposition' => 'attachment; filename="' . $name . '"',
            'Cache-Control'       => 'private, max-age=0',
        ]);
    }

    /**
     * GET /api/videos/{video}/photos/download?i=0,2,5
     * Several photos in ONE zip. Browsers block (Chrome asks, Safari silently drops) pages that start several downloads at once,
     * so a selection of 2+ photos is a single file.
     */
    public function zip(Video $video, Request $request): Response
    {
        abort_unless($video->media_type === 'photos', 404);
        abort_unless(class_exists(\ZipArchive::class), 500, 'Zip support (ext-zip) is not installed.');

        $idx = collect(explode(',', (string) $request->query('i', '')))
            ->filter(fn ($v) => ctype_digit(trim($v)))->map(fn ($v) => (int) $v)->unique()->values()->take(30);
        abort_if($idx->isEmpty(), 422, 'Pick at least one photo.');

        $tmp = tempnam(sys_get_temp_dir(), 'flk');
        $zip = new \ZipArchive();
        abort_unless($zip->open($tmp, \ZipArchive::OVERWRITE) === true, 500, 'Could not build the zip.');
        $user = $video->user?->username ?? 'photo';
        foreach ($idx as $i) {
            [$jpg] = $this->render($video, $i);
            $zip->addFromString("flockr-{$user}-" . ($i + 1) . '.jpg', $jpg);
        }
        $zip->close();

        return response()->download($tmp, "flockr-{$user}-photos.zip", ['Content-Type' => 'application/zip'])->deleteFileAfterSend(true);
    }

    /** @return array{0:string} watermarked JPEG bytes */
    private function render(Video $video, int $index): array
    {
        abort_unless($video->media_type === 'photos', 404);
        $paths = array_values($video->photos ?? []);
        abort_unless(isset($paths[$index]), 404);

        if (!function_exists('imagecreatefromstring')) {
            abort(500, 'Image library (GD) is not installed.');
        }

        $raw = Storage::disk(config('filesystems.default', 'public'))->get($paths[$index]);
        $img = @imagecreatefromstring($raw);
        abort_unless($img, 422, 'Could not read that photo.');

        $w = imagesx($img); $h = imagesy($img);
        if (max($w, $h) > self::MAX_SIDE) {
            $r = self::MAX_SIDE / max($w, $h);
            $scaled = imagescale($img, (int) round($w * $r), (int) round($h * $r), IMG_BICUBIC);
            if ($scaled) { imagedestroy($img); $img = $scaled; $w = imagesx($img); $h = imagesy($img); }
        }
        $flat = imagecreatetruecolor($w, $h);
        imagefill($flat, 0, 0, imagecolorallocate($flat, 0, 0, 0));
        imagecopy($flat, $img, 0, 0, 0, 0, $w, $h);
        imagedestroy($img);
        $img = $flat;
        imagealphablending($img, true);

        $user = '@' . preg_replace('/[^a-zA-Z0-9_\-.]/', '', $video->user?->username ?? 'flockr');
        // Two small, quiet marks well inside the picture (not on an edge), so a crop of the border can't remove both
        $this->stamp($img, $w, $h, $user, (int) round($w * 0.06), (int) round($h * 0.70), 'left', 0.85);
        $this->stamp($img, $w, $h, $user, $w - (int) round($w * 0.06), (int) round($h * 0.14), 'right', 0.6);

        ob_start();
        imagejpeg($img, null, 88);
        $jpg = ob_get_clean();
        imagedestroy($img);
        return [$jpg];
    }

    /**
     * One-line lockup: [bird] flockr  @username. Small, soft shadow, no heavy stacking.
     * $x is the left edge ('left') or the right edge ('right').
     */
    private function stamp($img, int $w, int $h, string $user, int $x, int $y, string $align, float $strength): void
    {
        $font = null;
        foreach ([public_path('fonts/Poppins-Bold.ttf'), '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'] as $f) {
            if (is_file($f)) { $font = $f; break; }
        }
        if (!$font) return;

        $base  = max(11, (int) round(min($w, $h * 0.75) * 0.030));    // text size follows the picture, never huge
        $small = max(9, (int) round($base * 0.74));
        $logoH = (int) round($base * 1.9);
        $gap   = (int) round($base * 0.45);

        $a1 = (int) round(127 - 127 * 0.95 * $strength);               // GD alpha: 0 opaque ... 127 clear
        $a2 = (int) round(127 - 127 * 0.70 * $strength);
        $white  = imagecolorallocatealpha($img, 255, 255, 255, $a1);
        $soft   = imagecolorallocatealpha($img, 255, 255, 255, $a2);
        $shadow = imagecolorallocatealpha($img, 0, 0, 0, min(127, $a1 + 50));

        $t1 = 'flockr';
        $b1 = imagettfbbox($base, 0, $font, $t1);  $w1 = abs($b1[2] - $b1[0]);
        $b2 = imagettfbbox($small, 0, $font, $user); $w2 = abs($b2[2] - $b2[0]);

        $logo = null;
        $logoFile = public_path('images/flockr_logo_white.png');
        if (is_file($logoFile)) $logo = @imagecreatefrompng($logoFile);
        $lw = $logo ? (int) round($logoH * imagesx($logo) / max(1, imagesy($logo))) : 0;

        $total = ($logo ? $lw + $gap : 0) + $w1 + $gap + $w2;
        $left  = $align === 'left' ? $x : $x - $total;
        $mid   = $y + (int) round($logoH / 2);                          // vertical centre of the row
        $cx    = $left;

        if ($logo) {
            imagealphablending($img, true);
            imagecopyresampled($img, $logo, $cx, $y, 0, 0, $lw, $logoH, imagesx($logo), imagesy($logo));
            imagedestroy($logo);
            $cx += $lw + $gap;
        }
        $by1 = $mid + (int) round($base * 0.36);
        imagettftext($img, $base, 0, $cx + 1, $by1 + 1, $shadow, $font, $t1);
        imagettftext($img, $base, 0, $cx, $by1, $white, $font, $t1);
        $cx += $w1 + $gap;
        $by2 = $mid + (int) round($small * 0.36);
        imagettftext($img, $small, 0, $cx + 1, $by2 + 1, $shadow, $font, $user);
        imagettftext($img, $small, 0, $cx, $by2, $soft, $font, $user);
    }
}
