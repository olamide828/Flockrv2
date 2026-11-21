<?php

namespace App\Http\Controllers;

use App\Models\Video;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

/**
 * GET /api/videos/{video}/photos/{index}/download
 * Sends ONE photo from a photo post with the Flockr watermark burned in (logo + "flockr" + @username).
 * Marks sit well inside the picture (not on an edge), so cropping the border doesn't remove them.
 */
class PhotoDownloadController extends Controller
{
    private const MAX_SIDE = 2400;

    public function photo(Video $video, int $index): Response
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

        // Keep memory sane: scale very large photos down
        $w = imagesx($img); $h = imagesy($img);
        if (max($w, $h) > self::MAX_SIDE) {
            $r = self::MAX_SIDE / max($w, $h);
            $scaled = imagescale($img, (int) round($w * $r), (int) round($h * $r), IMG_BICUBIC);
            if ($scaled) { imagedestroy($img); $img = $scaled; $w = imagesx($img); $h = imagesy($img); }
        }
        // PNG/WebP with alpha: flatten on black so the JPEG isn't odd
        $flat = imagecreatetruecolor($w, $h);
        imagefill($flat, 0, 0, imagecolorallocate($flat, 0, 0, 0));
        imagecopy($flat, $img, 0, 0, 0, 0, $w, $h);
        imagedestroy($img);
        $img = $flat;
        imagealphablending($img, true);

        $user = '@' . preg_replace('/[^a-zA-Z0-9_\-.]/', '', $video->user?->username ?? 'flockr');
        $this->stamp($img, $w, $h, $user, (int) round($w * 0.06), (int) round($h * 0.70), 'left', 1.0);   // lower-middle left
        $this->stamp($img, $w, $h, $user, $w - (int) round($w * 0.06), (int) round($h * 0.12), 'right', 0.8); // upper right, inside the frame

        ob_start();
        imagejpeg($img, null, 90);
        $jpg = ob_get_clean();
        imagedestroy($img);

        $name = 'flockr-' . ($video->user?->username ?? 'photo') . '-' . ($index + 1) . '.jpg';
        return response($jpg, 200, [
            'Content-Type'        => 'image/jpeg',
            'Content-Disposition' => 'attachment; filename="' . $name . '"',
            'Cache-Control'       => 'private, max-age=0',
        ]);
    }

    /** Logo + "flockr" + @username stack. $x is the left edge ('left') or right edge ('right'). */
    private function stamp($img, int $w, int $h, string $user, int $x, int $y, string $align, float $strength): void
    {
        $font = null;
        foreach ([public_path('fonts/Poppins-Bold.ttf'), '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'] as $f) {
            if (is_file($f)) { $font = $f; break; }
        }
        $lw   = max(36, (int) round($w * 0.085));
        $gap  = max(6, (int) round($w * 0.012));
        $bs   = max(14, (int) round($w * 0.040));
        $us   = max(12, (int) round($w * 0.030));
        $alpha = (int) round(127 - 127 * 0.92 * $strength);          // GD alpha: 0 opaque … 127 clear
        $white  = imagecolorallocatealpha($img, 255, 255, 255, $alpha);
        $shadow = imagecolorallocatealpha($img, 0, 0, 0, min(127, $alpha + 55));

        // logo
        $logoFile = public_path('images/flockr_logo_white.png');
        $logoH = 0;
        if (is_file($logoFile) && ($logo = @imagecreatefrompng($logoFile))) {
            $logoH = $lw;
            $lx = $align === 'left' ? $x : $x - $lw;
            imagealphablending($img, true);
            imagecopyresampled($img, $logo, $lx, $y, 0, 0, $lw, $lw, imagesx($logo), imagesy($logo));
            imagedestroy($logo);
        }

        $line = function (string $text, int $size, int $top) use ($img, $font, $x, $align, $white, $shadow) {
            if (!$font) return;
            $box = imagettfbbox($size, 0, $font, $text);
            $tw  = abs($box[2] - $box[0]);
            $tx  = $align === 'left' ? $x : $x - $tw;
            $by  = $top + $size;   // baseline
            imagettftext($img, $size, 0, $tx + 2, $by + 2, $shadow, $font, $text);
            imagettftext($img, $size, 0, $tx, $by, $white, $font, $text);
        };
        $y1 = $y + ($logoH ? $logoH + $gap : 0);
        $line('flockr', $bs, $y1);
        $line($user, $us, $y1 + $bs + 8);
    }
}
