<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class EventsKnowledgeSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('support_documents')->updateOrInsert(
            ['slug' => 'events-feature'],
            [
                'title'      => 'Seller Events',
                'category'   => 'events',
                'content'    => 'Flockr runs limited-time seller Events. Sellers can join an active event and pick a discount tier to apply during the event. Events may include a scavenger-hunt mechanic where sellers hitting a target earn a bonus coupon reward. Events can carry a special platform-fee rate overriding the normal rate while live, and may cap the number of participating sellers. Buyers benefit from the discounted prices sellers set during the event.',
                'is_active'  => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
    }
}