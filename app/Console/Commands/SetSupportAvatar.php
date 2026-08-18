<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class SetSupportAvatar extends Command
{
    protected $signature = 'flockr:set-support-avatar {path : Path to the image file}';
    protected $description = 'Uploads an image and sets it as the Flockr Support account avatar';

    public function handle(): int
    {
        $path = $this->argument('path');

        if (!file_exists($path)) {
            $this->error("File not found: {$path}");
            return self::FAILURE;
        }

        $support = User::where('is_flockr_support', true)->first();
        if (!$support) {
            $this->error('No Flockr Support account found.');
            return self::FAILURE;
        }

        $disk = config('filesystems.default', 'public');
        $extension = pathinfo($path, PATHINFO_EXTENSION) ?: 'png';
        $key = 'avatars/flockr-support-' . Str::random(8) . '.' . $extension;

        Storage::disk($disk)->put($key, file_get_contents($path));
        $support->update(['avatar' => $key]);

        $this->info("Avatar updated: {$key}");
        $this->info('URL: ' . $support->fresh()->avatar_url);

        return self::SUCCESS;
    }
}