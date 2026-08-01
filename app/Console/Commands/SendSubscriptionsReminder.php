<?php
namespace App\Console\Commands;

use App\Models\Subscription;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class SendSubscriptionReminders extends Command
{
    protected $signature = 'subscriptions:remind';
    protected $description = 'Email users whose subscription expires in 3 days';

    public function handle(): void
    { 
        Subscription::where('status', 'active')
            ->whereBetween('expires_at', [now()->addDays(2)->startOfDay(), now()->addDays(3)->endOfDay()])
            ->with('user')
            ->chunk(50, function ($subs) {
                foreach ($subs as $sub) {
                    try {
                        Mail::raw(
                            "Hi {$sub->user->name}, your Flockr Pro subscription expires on {$sub->expires_at->format('jS F Y')}. Renew from your profile to keep your verification badge and Pro perks active.",
                            fn ($m) => $m->to($sub->user->email)->subject('Your Flockr Pro subscription is expiring soon')
                        );
                    } catch (\Throwable) {}
                }
            });

        $this->info('Reminders sent.');
    }
}