<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class Message extends Model
{
    protected $fillable = ['conversation_id', 'sender_id', 'body', 'read_at', 'media_path', 'media_type', 'reply_to_id', 'is_deleted', 'client_id', 'suggested_product_ids'];

    protected $casts = ['read_at' => 'datetime', 'edited_at' => 'datetime', 'delivered_at' => 'datetime', 'is_deleted' => 'boolean', 'suggested_product_ids' => 'array'];

    // Chirp's product suggestions travel with the message everywhere it is serialised (API, realtime), already shaped for <ProductCard>
    protected $appends = ['suggested_products'];

    public function conversation(): BelongsTo { return $this->belongsTo(Conversation::class); }
    public function sender(): BelongsTo       { return $this->belongsTo(User::class, 'sender_id'); }
    public function replyTo(): BelongsTo      { return $this->belongsTo(Message::class, 'reply_to_id'); }

    public function getSuggestedProductsAttribute($value)
    {
        if ($value !== null) return $value;                      // already filled in by a controller (batched)
        $ids = $this->suggested_product_ids;
        if (empty($ids)) return [];
        return static::productsFor($ids);
    }

    /** Products with the seller attached (ProductCard renders nothing without the seller) and the viewer's saved flag. */
    public static function productsFor(array $ids)
    {
        $products = Product::whereIn('id', $ids)
            ->with(['seller' => fn ($q) => $q->select('id', 'name', 'username', 'avatar', 'is_verified')->withActiveSubscriptionFlag()])
            ->get()->filter(fn ($p) => $p->seller?->username)->values();
        $saved = Auth::id() && $products->isNotEmpty()
            ? DB::table('product_saves')->where('user_id', Auth::id())->whereIn('product_id', $products->pluck('id'))->pluck('product_id')->flip()->all()
            : [];
        $products->each(fn ($p) => $p->is_saved = isset($saved[$p->id]));
        return $products;
    }

    /** One query for a whole list of messages instead of one per message. */
    public static function fillProducts($messages): void
    {
        $ids = collect($messages)->flatMap(fn ($m) => (array) ($m->suggested_product_ids ?? []))->unique()->values()->all();
        if (!$ids) return;
        $byId = static::productsFor($ids)->keyBy('id');
        foreach ($messages as $m) {
            $mine = collect((array) ($m->suggested_product_ids ?? []))->map(fn ($id) => $byId->get($id))->filter()->values();
            $m->setAttribute('suggested_products', $mine);
        }
    }
}
