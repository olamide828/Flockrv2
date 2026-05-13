<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class StorageService
{
    private string $disk;

    public function __construct()
    {
        $this->disk = config('filesystems.default', 'r2');
    }

    /**
     * Upload a raw video file to R2/S3.
     * Returns the storage key (relative path), NOT the full URL.
     */
    public function uploadVideo(UploadedFile $file): string
    {
        $extension = $file->getClientOriginalExtension() ?: 'mp4';
        $key = 'videos/raw/' . now()->format('Y/m/d') . '/' . Str::uuid() . '.' . $extension;

        Storage::disk($this->disk)->put($key, file_get_contents($file->getRealPath()));

        return $key;
    }

    /**
     * Upload a processed HLS playlist or thumbnail.
     */
    public function uploadProcessed(string $localPath, string $prefix = 'videos/hls'): string
    {
        $filename = basename($localPath);
        $key      = $prefix . '/' . now()->format('Y/m/d') . '/' . Str::uuid() . '_' . $filename;

        Storage::disk($this->disk)->put($key, file_get_contents($localPath));

        return $key;
    }

    /**
     * Upload a product image.
     */
    public function uploadImage(UploadedFile $file, string $folder = 'products'): string
    {
        $extension = $file->getClientOriginalExtension() ?: 'jpg';
        $key = "{$folder}/" . now()->format('Y/m') . '/' . Str::uuid() . '.' . $extension;

        Storage::disk($this->disk)->put($key, file_get_contents($file->getRealPath()));

        return $key;
    }

    /**
     * Upload a user avatar.
     */
    public function uploadAvatar(UploadedFile $file): string
    {
        return $this->uploadImage($file, 'avatars');
    }

    /**
     * Delete a file from storage.
     */
    public function delete(string $key): bool
    {
        return Storage::disk($this->disk)->delete($key);
    }

    /**
     * Get the full public CDN URL for a storage key.
     */
    public function url(string $key): string
    {
        return config('filesystems.disks.' . $this->disk . '.url') . '/' . ltrim($key, '/');
    }

    /**
     * Generate a short-lived signed URL (for private buckets).
     */
    public function temporaryUrl(string $key, int $minutes = 60): string
    {
        return Storage::disk($this->disk)->temporaryUrl($key, now()->addMinutes($minutes));
    }
}
