<?php
namespace App\Services;

use App\Models\Category;
use App\Models\Video;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class VideoCategoryTagger
{
    public function tag(Video $video): void
    {
        if ($video->ai_category_id) return; // already tagged, don't re-spend API calls

        $categoryNames = Category::pluck('name')->implode(', ');

        $prompt = "You are categorizing a short-form video for a Nigerian social commerce app.
Pick EXACTLY ONE category from this list that best matches the video below. Reply with ONLY the exact category name from the list, nothing else.

Categories: {$categoryNames}

Video Title: {$video->title}
Description: {$video->description}
Hashtags: " . implode(', ', is_array($video->hashtags) ? $video->hashtags : []);

        try {
            $response = Http::timeout(20)->post(
                'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=' . env('GEMINI_API_KEY'),
                ['contents' => [['parts' => [['text' => $prompt]]]]]
            );

            $content = trim(data_get($response->json(), 'candidates.0.content.parts.0.text', ''));
            if (!$content) return;

            $category = Category::where('name', $content)->first();
            if ($category) {
                $video->update(['ai_category_id' => $category->id]);
            } else {
                Log::info('VideoCategoryTagger: no category match for AI response', ['response' => $content]);
            }
        } catch (\Throwable $e) {
            Log::warning('VideoCategoryTagger failed: ' . $e->getMessage());
        }
    }
}