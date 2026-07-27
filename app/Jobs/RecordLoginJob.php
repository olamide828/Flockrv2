<?php

namespace App\Jobs;

use App\Models\User;
use App\Services\LoginTrackingService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class RecordLoginJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public int $userId,
        public ?string $ip,
        public ?string $userAgent,
        public ?string $sessionId,
    ) {}

    public function handle(LoginTrackingService $service): void
    {
        $user = User::find($this->userId);
        if ($user) {
            $service->record($user, $this->ip ?? '', $this->userAgent, $this->sessionId);
        }
    }
}