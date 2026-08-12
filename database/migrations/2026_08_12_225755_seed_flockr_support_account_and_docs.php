<?php
// database/migrations/xxxx_seed_flockr_support_account_and_docs.php
//
// Seeds the system support account and initial knowledge-base documents,
// written to match what the CODE actually does today — not the Terms/Privacy
// pages, which describe escrow, "TShip" branding on payment terms, and fixed
// payout SLAs that don't reflect the current implementation. Update these
// rows any time real behavior changes (real payouts go live, dispute flow
// changes, etc.) — the AI reads them fresh on every question, no redeploy.

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

return new class extends Migration
{
    public function up(): void
    {
        $supportId = DB::table('users')->insertGetId([
            'name'               => 'Flockr Support',
            'username'           => 'flockrsupport',
            'email'              => 'support-bot@flockr.internal',
            'password'           => Hash::make(bin2hex(random_bytes(32))), 
            'role'               => 'buyer',
            'is_flockr_support'  => true,
            'is_verified'        => true,
            'is_active'          => true,
            'email_verified_at'  => now(),
            'created_at'         => now(),
            'updated_at'         => now(),
        ]);

        $docs = [
            [
                'slug' => 'platform-fee',
                'title' => 'Platform Fee',
                'category' => 'fees',
                'content' => 'Flockr charges sellers a platform fee on completed sales: 5% for regular sellers, 3% for Pro subscribers. The fee is calculated on the buyer-facing listed price and deducted before the seller receives payment. There is no separate "checkout fee" beyond this.',
            ],
            [
                'slug' => 'wallet-and-payment-timing',
                'title' => 'When Sellers Get Paid',
                'category' => 'payouts',
                'content' => 'When a buyer completes payment via Paystack, the seller\'s Flockr wallet is credited IMMEDIATELY — there is no holding period or escrow delay. The credited amount is the order total minus the platform fee. Sellers can then request a withdrawal from their wallet to their bank account, subject to a minimum withdrawal of ₦1,000. Payouts are currently processed manually by the Flockr team while the payment provider account is being upgraded to support automatic transfers — there is not yet a fixed payout turnaround time; sellers should expect this to take a few business days and can contact support if a payout is delayed.',
            ],
            [
                'slug' => 'refunds-and-cancellations',
                'title' => 'Refunds & Cancellations',
                'category' => 'orders',
                'content' => 'A buyer can cancel an order themselves while it is in pending, paid, or confirmed status, before it ships. If an order is cancelled after the seller was already paid, Flockr reverses that credit from the seller\'s wallet automatically. Once shipped, an order cannot be self-cancelled by the buyer — instead the buyer should open a dispute if there is a problem with the order.',
            ],
            [
                'slug' => 'disputes',
                'title' => 'Opening a Dispute',
                'category' => 'disputes',
                'content' => 'Buyers can open a dispute on any order that is paid, confirmed, processing, shipped, or delivered — for example if an item never arrived, arrived damaged, or is significantly different from what was listed. Opening a dispute requires a reason and marks the order as disputed, notifies the seller, and creates a report for the Flockr team to review, typically within 24–48 hours.',
            ],
            [
                'slug' => 'shipping-logistics',
                'title' => 'Shipping & Delivery',
                'category' => 'logistics',
                'content' => 'Flockr partners with TShip (Terminal Africa) to handle delivery logistics and courier coordination. Sellers select a courier and rate at checkout time per order; buyers can track their shipment status (confirmed, processing, shipped, delivered) from their order page. Flockr does not operate its own delivery fleet.',
            ],
            [
                'slug' => 'flockr-pro-subscription',
                'title' => 'Flockr Pro Subscription',
                'category' => 'subscriptions',
                'content' => 'Flockr Pro is an optional seller subscription. Pricing: ₦3,000/month or ₦30,600/year, with a 5% discount automatically applied for a seller\'s very first subscription purchase. Pro sellers pay a reduced 3% platform fee (vs 5% standard) and unlock Seller Analytics (revenue trends, video retention, follower growth, best time to sell, and more). Subscriptions do not auto-renew — sellers are expected to resubscribe manually when their current plan expires.',
            ],
            [
                'slug' => 'off-platform-payment-safety',
                'title' => 'Why Flockr Warns About Paying Outside the App',
                'category' => 'safety',
                'content' => 'Flockr shows a safety warning if a chat conversation suggests arranging payment outside the app (e.g. direct bank transfer, WhatsApp). Paying outside Flockr checkout means Flockr cannot help recover funds or mediate a dispute if something goes wrong, since there is no record of the transaction on the platform. We always recommend completing payment through Flockr checkout.',
            ],
            [
                'slug' => 'becoming-a-seller',
                'title' => 'Becoming a Seller',
                'category' => 'account',
                'content' => 'Any registered Flockr user can apply to become a seller through the seller onboarding flow, which requires basic identity and bank account details for payouts. Once approved, sellers can upload product videos, list products, and manage orders from their Seller Dashboard.',
            ],
        ];

        foreach ($docs as $doc) {
            DB::table('support_documents')->insert(array_merge($doc, [
                'is_active'  => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]));
        }
    }

    public function down(): void
    {
        DB::table('users')->where('is_flockr_support', true)->delete();
        DB::table('support_documents')->truncate();
    }
};