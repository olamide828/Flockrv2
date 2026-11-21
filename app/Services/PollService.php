<?php

namespace App\Services;

use App\Models\Post;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Polls attached to community posts. The post's own text is the question.
 *
 * Rules (the usual ones):
 *  - 2–6 options, each up to 80 characters, no duplicates
 *  - lasts 1h / 6h / 1d / 3d / 7d (default 1 day); after that it is closed and can't be voted on
 *  - one vote per person; "allow multiple" lets them tick several options, once
 *  - votes can't be changed
 *  - nobody sees the numbers until they vote (or the poll closes, or it is their own poll)
 */
class PollService
{
    public const DURATIONS = [1, 6, 24, 72, 168];

    /** @param array{options: array<string>, duration_hours?: int, allow_multiple?: bool} $poll */
    public function create(Post $post, array $poll): void
    {
        $options = collect($poll['options'] ?? [])->map(fn ($o) => trim((string) $o))->filter()->values();

        if ($options->count() < 2 || $options->count() > 6) {
            throw ValidationException::withMessages(['poll' => 'A poll needs 2 to 6 options.']);
        }
        if ($options->map(fn ($o) => mb_strtolower($o))->unique()->count() !== $options->count()) {
            throw ValidationException::withMessages(['poll' => 'Poll options must be different from each other.']);
        }

        $hours = (int) ($poll['duration_hours'] ?? 24);
        if (!in_array($hours, self::DURATIONS, true)) $hours = 24;

        DB::transaction(function () use ($post, $options, $hours, $poll) {
            $id = DB::table('post_polls')->insertGetId([
                'post_id'        => $post->id,
                'allow_multiple' => (bool) ($poll['allow_multiple'] ?? false),
                'ends_at'        => now()->addHours($hours),
                'created_at'     => now(),
                'updated_at'     => now(),
            ]);
            DB::table('post_poll_options')->insert($options->map(fn ($text, $i) => [
                'poll_id' => $id, 'text' => $text, 'position' => $i, 'created_at' => now(), 'updated_at' => now(),
            ])->all());
        });
    }

    /**
     * Adds a 'poll' key (or null) to each post array.
     * @param  Collection|array $posts arrays with at least 'id' and 'user_id'
     */
    public function decorate($posts, ?int $viewerId)
    {
        $list = collect($posts);
        $ids = $list->pluck('id')->filter()->all();
        if (!$ids) return $posts;

        $polls = DB::table('post_polls')->whereIn('post_id', $ids)->get()->keyBy('post_id');
        if ($polls->isEmpty()) {
            return $list->map(fn ($p) => array_merge((array) $p, ['poll' => null]))->values();
        }

        $options = DB::table('post_poll_options')->whereIn('poll_id', $polls->pluck('id'))->orderBy('position')->get()->groupBy('poll_id');
        $mine = $viewerId
            ? DB::table('post_poll_votes')->where('user_id', $viewerId)->whereIn('poll_id', $polls->pluck('id'))->get()->groupBy('poll_id')
            : collect();

        return $list->map(function ($p) use ($polls, $options, $mine, $viewerId) {
            $p = (array) $p;
            $poll = $polls->get($p['id']);
            $p['poll'] = $poll ? $this->payload($poll, $options->get($poll->id, collect()), $mine->get($poll->id, collect())->pluck('option_id')->all(), $viewerId !== null && $viewerId === ($p['user_id'] ?? null)) : null;
            return $p;
        })->values();
    }

    public function payloadFor(int $postId, ?int $viewerId, ?int $ownerId): ?array
    {
        $poll = DB::table('post_polls')->where('post_id', $postId)->first();
        if (!$poll) return null;
        $options = DB::table('post_poll_options')->where('poll_id', $poll->id)->orderBy('position')->get();
        $mine = $viewerId ? DB::table('post_poll_votes')->where('poll_id', $poll->id)->where('user_id', $viewerId)->pluck('option_id')->all() : [];
        return $this->payload($poll, $options, $mine, $viewerId !== null && $viewerId === $ownerId);
    }

    private function payload($poll, $options, array $myVotes, bool $isOwner): array
    {
        $closed = $poll->ends_at && now()->gte(\Illuminate\Support\Carbon::parse($poll->ends_at));
        $show = $closed || $isOwner || !empty($myVotes);
        $total = max(0, (int) $poll->total_votes);

        return [
            'id'             => $poll->id,
            'allow_multiple' => (bool) $poll->allow_multiple,
            'ends_at'        => $poll->ends_at ? \Illuminate\Support\Carbon::parse($poll->ends_at)->toIso8601String() : null,
            'is_closed'      => $closed,
            'total_votes'    => $show ? $total : null,
            'my_votes'       => array_values($myVotes),
            'show_results'   => $show,
            'options'        => collect($options)->map(fn ($o) => [
                'id'      => $o->id,
                'text'    => $o->text,
                'votes'   => $show ? (int) $o->votes_count : null,
                'percent' => $show ? ($total > 0 ? round(($o->votes_count / $total) * 100) : 0) : null,
            ])->values()->all(),
        ];
    }

    /** @param array<int> $optionIds */
    public function vote(int $pollId, int $userId, array $optionIds): void
    {
        $optionIds = array_values(array_unique(array_map('intval', $optionIds)));
        if (!$optionIds) throw ValidationException::withMessages(['option_ids' => 'Pick an option first.']);

        DB::transaction(function () use ($pollId, $userId, $optionIds) {
            $poll = DB::table('post_polls')->where('id', $pollId)->lockForUpdate()->first();
            if (!$poll) throw ValidationException::withMessages(['poll' => 'This poll no longer exists.']);
            if ($poll->ends_at && now()->gte(\Illuminate\Support\Carbon::parse($poll->ends_at))) {
                throw ValidationException::withMessages(['poll' => 'This poll has ended.']);
            }
            if (!$poll->allow_multiple && count($optionIds) > 1) {
                throw ValidationException::withMessages(['option_ids' => 'You can only pick one option.']);
            }
            $valid = DB::table('post_poll_options')->where('poll_id', $pollId)->whereIn('id', $optionIds)->pluck('id')->all();
            if (count($valid) !== count($optionIds)) {
                throw ValidationException::withMessages(['option_ids' => 'That option is not part of this poll.']);
            }
            if (DB::table('post_poll_votes')->where('poll_id', $pollId)->where('user_id', $userId)->exists()) {
                throw ValidationException::withMessages(['poll' => 'You have already voted in this poll.']);
            }

            DB::table('post_poll_votes')->insert(array_map(fn ($oid) => [
                'poll_id' => $pollId, 'option_id' => $oid, 'user_id' => $userId, 'created_at' => now(), 'updated_at' => now(),
            ], $valid));
            DB::table('post_poll_options')->whereIn('id', $valid)->increment('votes_count');
            DB::table('post_polls')->where('id', $pollId)->increment('total_votes');
        });
    }
}
