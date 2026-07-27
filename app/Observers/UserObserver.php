<?php

namespace App\Observers;

use App\Models\User;
use App\Models\Video;
use App\Models\Product;

class UserObserver
{
    /**
     * When a user is soft-deleted, soft-delete all their content too.
     * This stops videos/products from appearing with seller = null (@undefined).
     */
    public function deleted(User $user): void
    {
        // Only act on soft deletes (trashed), not hard deletes
        // (hard deletes are handled by DB cascade)
        if (!$user->isForceDeleting()) {
            // Soft-delete all their videos
            Video::where('user_id', $user->id)
                ->whereNull('deleted_at')
                ->update(['deleted_at' => now()]);

            // Soft-delete all their products
            Product::where('seller_id', $user->id)
                ->whereNull('deleted_at')
                ->update(['deleted_at' => now()]);
        }
    }

    /**
     * If a user is restored, restore their content too.
     */
    public function restored(User $user): void
    {
        Video::withTrashed()
            ->where('user_id', $user->id)
            ->whereNotNull('deleted_at')
            ->update(['deleted_at' => null]);

        Product::withTrashed()
            ->where('seller_id', $user->id)
            ->whereNotNull('deleted_at')
            ->update(['deleted_at' => null]);
    }
}