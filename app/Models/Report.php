<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Report extends Model
{
    protected $fillable = [
        'reporter_id',
        'reported_id',
        'conversation_id',
        'order_id',
        'reason',
        'status',
        'report_count',
    ];

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reporter_id');
    }

    public function reported(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_id');
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * Smart upsert for reports.
     *
     * Same reporter + same reported + same context (conversation/order/video prefix)
     * = update existing record, increment report_count, touch updated_at
     *
     * Different context = new record
     *
     * This prevents spam (5 identical reports become 1 with count=5)
     * while allowing legitimate reports across different contexts.
     */
    public static function upsertReport(
        int    $reporterId,
        int    $reportedId,
        string $reason,
        array  $context = [], // ['conversation_id' => X] or ['order_id' => X] or []
    ): self {
        // Build the lookup key based on context
        $lookup = [
            'reporter_id' => $reporterId,
            'reported_id' => $reportedId,
        ];

        if (!empty($context['conversation_id'])) {
            $lookup['conversation_id'] = $context['conversation_id'];
        } elseif (!empty($context['order_id'])) {
            $lookup['order_id'] = $context['order_id'];
        } else {
            // For video/user reports: match on the video ULID prefix in the reason
            // Extract [Video: ULID] if present so same video = same report
            preg_match('/\[Video: ([A-Z0-9]+)\]/', $reason, $matches);
            if (!empty($matches[1])) {
                // Use a temporary column to scope by video — we do this in-memory
                // by finding existing report with same video ULID in reason
                $existing = self::where('reporter_id', $reporterId)
                    ->where('reported_id', $reportedId)
                    ->whereNull('conversation_id')
                    ->whereNull('order_id')
                    ->where('reason', 'like', "[Video: {$matches[1]}]%")
                    ->first();

                if ($existing) {
                    $existing->update([
                        'reason'       => $reason,
                        'report_count' => $existing->report_count + 1,
                        'status'       => 'pending', // re-open if dismissed
                    
                    ]);
                    $existing->touch();
                    return $existing;
                }

                return self::create(array_merge($lookup, [
                    'reason'       => $reason,
                    'report_count' => 1,
                    'status'       => 'pending',
                ]));
            }

            // Plain user report — scope to no conversation/order
            $lookup['conversation_id'] = null;
            $lookup['order_id']        = null;
        }

        $existing = self::where($lookup)->first();

        if ($existing) {
            $existing->update([
                'reason'       => $reason,
                'report_count' => $existing->report_count + 1,
                'status'       => 'pending',
                
            ]);
            $existing->touch();
            return $existing;
        }

        return self::create(array_merge($lookup, array_merge($context, [
            'reason'       => $reason,
            'report_count' => 1,
            'status'       => 'pending',
        ])));
    }
}