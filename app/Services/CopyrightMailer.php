<?php

namespace App\Services;

use App\Models\CopyrightClaim;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Plain-text emails for the copyright flow. They are queued (so the admin button stays instant) and use whatever
 * mailer the app already sends with, so there is nothing extra to configure.
 */
class CopyrightMailer
{
    /** Tell the person who reported what we decided. $outcome: received | actioned | rejected | restored */
    public static function claimant(CopyrightClaim $c, string $outcome, ?string $note = null): void
    {
        $ref = "#{$c->id}";
        [$subject, $body] = match ($outcome) {
            'received' => ["We received your report {$ref}", "Hello {$c->claimant_name},\n\nThank you for your report {$ref}. We have received it and will review it as quickly as we can. We will email you again with our decision."],
            'actioned' => ["Your report {$ref}: content removed", "Hello {$c->claimant_name},\n\nWe reviewed your report {$ref} and removed the content. The seller has been told, and repeated infringement can lead to their account being suspended.\n\nThank you for helping us keep Flockr fair for creators."],
            'rejected' => ["Your report {$ref}: no removal", "Hello {$c->claimant_name},\n\nWe reviewed your report {$ref} and did not remove the content." . ($note ? "\n\nReason: {$note}" : '') . "\n\nIf you believe we got this wrong, reply to this email with more detail (for example proof that you own the work) and we will look again."],
            'restored' => ["Your report {$ref}: content restored", "Hello {$c->claimant_name},\n\nAfter a further review of report {$ref} we restored the content." . ($note ? "\n\nReason: {$note}" : '') . "\n\nIf you disagree, reply to this email with more detail and we will look again."],
        };
        self::send($c->claimant_email, $subject, $body . "\n\nFlockr");
    }

    /** Tell a seller their video was removed (and how to respond). */
    public static function seller(string $email, string $name, string $title, ?string $claimRef = null): void
    {
        $contact = config('legal.email');
        $body = "Hello {$name},\n\nYour video \"{$title}\" was removed from Flockr after a copyright report" . ($claimRef ? " ({$claimRef})" : '') . ".\n\n"
            . "Only post videos, and use music, that you own or have permission to use. If you believe this was a mistake, " . ($contact ? "reply to this email or write to {$contact}" : 'reply to this email') . " and explain why you have the rights. If we agree, we will restore it.\n\n"
            . "Please note that repeated copyright takedowns can lead to your account being suspended.\n\nFlockr";
        self::send($email, 'Your video was removed', $body);
    }

    public static function suspended(string $email, string $name): void
    {
        self::send($email, 'Your Flockr account has been suspended', "Hello {$name},\n\nYour account was suspended because of repeated copyright takedowns. You can appeal from the suspension screen when you sign in.\n\nFlockr");
    }


    /** Artist submission emails. $stage: received | approved | rejected */
    public static function submission(?string $email, string $name, string $title, string $stage, ?string $note = null, ?string $url = null): void
    {
        [$subject, $body] = match ($stage) {
            'received' => ["We received \"{$title}\"", "Hello {$name},\n\nThanks for submitting \"{$title}\" to Flockr. Our team will listen to it and check your details. We will email you when we have decided. Until then the track stays private."],
            'approved' => ["\"{$title}\" is live on Flockr", "Hello {$name},\n\nGood news: \"{$title}\" was approved and is now in the Flockr sound library. Creators can use it in their videos, and your name links back to your profile." . ($url ? "\n\nYour sound page: {$url}" : '') . "\n\nYou can ask us to remove it at any time by replying to this email."],
            'rejected' => ["About your submission \"{$title}\"", "Hello {$name},\n\nWe could not approve \"{$title}\" this time." . ($note ? "\n\nReason: {$note}" : '') . "\n\nYou are welcome to submit again once this is sorted out (for example, a link that shows you are the artist). Reply to this email if you have questions."],
        };
        self::send($email, $subject, $body . "\n\nFlockr");
    }

    private static function send(?string $to, string $subject, string $body): void
    {
        if (!$to) return;
        $reply = config('legal.email');
        try {
            dispatch(function () use ($to, $subject, $body, $reply) {
                Mail::raw($body, function ($m) use ($to, $subject, $reply) {
                    $m->to($to)->subject($subject);
                    if ($reply) $m->replyTo($reply);
                });
            });
        } catch (\Throwable $e) {
            Log::warning('Copyright email not queued', ['to' => $to, 'error' => $e->getMessage()]);
        }
    }
}
