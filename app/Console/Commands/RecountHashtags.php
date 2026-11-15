<?php

namespace App\Console\Commands;

use App\Services\HashtagService;
use Illuminate\Console\Command;

class RecountHashtags extends Command
{
    protected $signature   = 'hashtags:recount';
    protected $description = 'Rebuild hashtag post counts from videos and products';

    public function handle(HashtagService $svc): int
    {
        $this->info('Counted ' . $svc->recount() . ' hashtags.');
        return self::SUCCESS;
    }
}
