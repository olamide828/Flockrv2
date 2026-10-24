<?php

namespace App\Console\Commands;

use App\Models\Sound;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Imports licensed tracks into the sound library.
 *
 *   php artisan sounds:import storage/app/music-drop --license="Pixabay Content License" --license-url=https://pixabay.com/service/license-summary/
 *
 * The folder holds .mp3 files. Add a catalog.json next to them to set titles / artists:
 *   [{"file":"summer-vibes.mp3","title":"Summer Vibes","artist":"Some Artist","license":"CC0"}]
 * Only import music you have the right to use in user videos. Keep the licence on record (--license).
 */
class ImportSounds extends Command
{
    protected $signature = 'sounds:import {dir : Folder with .mp3 files} {--license= : Licence name} {--license-url= : Link to the licence terms} {--artist=Unknown}';
    protected $description = 'Import licensed music into the sound library';

    public function handle(): int
    {
        $dir = rtrim($this->argument('dir'), '/\\');
        if (!is_dir($dir)) { $this->error("Folder not found: {$dir}"); return self::FAILURE; }

        $catalog = [];
        if (is_file("{$dir}/catalog.json")) {
            foreach (json_decode(file_get_contents("{$dir}/catalog.json"), true) ?: [] as $row) {
                if (!empty($row['file'])) $catalog[$row['file']] = $row;
            }
        }

        $disk = config('filesystems.default', 'public');
        $fp   = str_replace('\\', '/', config('flockr.ffprobe_path', '/var/www/bin/ffprobe'));
        $n = 0;

        foreach (glob("{$dir}/*.mp3") ?: [] as $file) {
            $name = basename($file);
            $meta = $catalog[$name] ?? [];
            $title = $meta['title'] ?? Str::title(str_replace(['-', '_'], ' ', pathinfo($name, PATHINFO_FILENAME)));

            if (Sound::where('source', 'library')->where('title', $title)->exists()) { $this->line("skip  {$title}"); continue; }

            $dur = trim((string) shell_exec("\"{$fp}\" -v error -show_entries format=duration -of csv=p=0 \"" . str_replace('\\', '/', $file) . "\" 2>&1"));
            $dest = 'sounds/library/' . Str::slug($title) . '-' . Str::lower(Str::random(6)) . '.mp3';
            Storage::disk($disk)->put($dest, fopen($file, 'rb'), 'public');

            Sound::create([
                'source'      => 'library',
                'title'       => $title,
                'artist'      => $meta['artist'] ?? $this->option('artist'),
                'file_path'   => $dest,
                'duration'    => is_numeric($dur) ? (int) round((float) $dur) : 0,
                'license'     => $meta['license'] ?? $this->option('license'),
                'license_url' => $meta['license_url'] ?? $this->option('license-url'),
                'attribution' => $meta['attribution'] ?? null,
                'is_active'   => true,
            ]);
            $this->info("added {$title}");
            $n++;
        }

        $this->info("Imported {$n} track(s).");
        return self::SUCCESS;
    }
}
