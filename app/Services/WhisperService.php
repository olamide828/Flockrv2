<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class WhisperService
{
    private const MODEL      = 'whisper-1';
    private const API_URL    = 'https://api.openai.com/v1/audio/transcriptions';

    public function __construct(
        private readonly OpenAIService $openai,
    ) {}

    /**
     * Transcribe audio from a local file path (after video has been downloaded
     * from R2 to the worker's tmp directory).
     *
     * Returns structured result:
     * [
     *   'text'     => 'Full transcript...',
     *   'segments' => [[start, end, text], ...],
     *   'keywords' => ['keyword1', 'keyword2', ...],
     *   'hashtags' => ['#fashion', '#lagos', ...],
     * ]
     */
    public function transcribeFile(string $localPath): array
    {
        if (!file_exists($localPath)) {
            throw new \InvalidArgumentException("File not found: {$localPath}");
        }

        // Whisper accepts mp3, mp4, mpeg, mpga, m4a, wav, webm — max 25MB
        $fileSize = filesize($localPath);
        if ($fileSize > 25 * 1024 * 1024) {
            $localPath = $this->extractAudio($localPath); // extract audio-only stream
        }

        $response = Http::withToken(config('services.openai.api_key'))
            ->timeout(120)
            ->retry(2, 1000)
            ->attach('file', fopen($localPath, 'r'), basename($localPath))
            ->post(self::API_URL, [
                'model'           => self::MODEL,
                'response_format' => 'verbose_json',   // gives us segments with timestamps
                'language'        => 'en',              // most Nigerian content is English/Pidgin
                'temperature'     => 0,
            ]);

        if ($response->failed()) {
            Log::error('Whisper transcription failed', [
                'status' => $response->status(),
                'file'   => $localPath,
            ]);
            throw new \RuntimeException('Whisper API failed: ' . $response->status());
        }

        $data = $response->json();

        $text     = $data['text'] ?? '';
        $segments = $this->formatSegments($data['segments'] ?? []);
        $keywords = $this->extractKeywords($text);
        $hashtags = $this->generateHashtags($text, $keywords);

        return compact('text', 'segments', 'keywords', 'hashtags');
    }

    /**
     * Transcribe from an R2/S3 URL directly (stream to tmp, then transcribe).
     */
    public function transcribeFromUrl(string $storageKey): array
    {
        $tmpPath = sys_get_temp_dir() . '/' . basename($storageKey);

        try {
            $contents = Storage::disk('r2')->get($storageKey);
            file_put_contents($tmpPath, $contents);
            return $this->transcribeFile($tmpPath);
        } finally {
            if (file_exists($tmpPath)) unlink($tmpPath);
        }
    }

    // ─── Private helpers ─────────────────────────────────────────────────────

    /**
     * Format Whisper segments into simpler [{start, end, text}] arrays.
     */
    private function formatSegments(array $segments): array
    {
        return array_map(fn ($seg) => [
            'start' => round($seg['start'], 2),
            'end'   => round($seg['end'], 2),
            'text'  => trim($seg['text']),
        ], $segments);
    }

    /**
     * Use GPT-4o-mini to extract product-relevant keywords from transcript.
     * Cheap: ~50 tokens per video.
     */
    private function extractKeywords(string $transcript): array
    {
        if (empty(trim($transcript))) return [];

        $prompt = <<<PROMPT
Extract 5–10 product-relevant keywords from this video transcript for a Nigerian
social commerce platform. Focus on: product names, materials, locations, styles,
occasions. Return ONLY a JSON array of lowercase strings, no explanation.

Transcript: "{$transcript}"
PROMPT;

        try {
            $raw  = $this->openai->chat($prompt, maxTokens: 100);
            $json = trim($raw);
            // Handle if GPT wraps in ```json ... ```
            $json = preg_replace('/^```json\s*|\s*```$/m', '', $json);
            return json_decode($json, true, flags: JSON_THROW_ON_ERROR);
        } catch (\Throwable $e) {
            Log::warning('Keyword extraction failed', ['error' => $e->getMessage()]);
            return [];
        }
    }

    /**
     * Generate relevant hashtags for feed discovery.
     */
    private function generateHashtags(string $transcript, array $keywords): array
    {
        $combined = implode(', ', $keywords) . ' ' . mb_substr($transcript, 0, 200);

        $prompt = <<<PROMPT
Generate 5 relevant hashtags for a Nigerian social commerce video based on these
keywords and transcript excerpt. Return ONLY a JSON array of hashtag strings
(include the # symbol, e.g. "#ankarafashion"). No explanation.

Input: "{$combined}"
PROMPT;

        try {
            $raw  = $this->openai->chat($prompt, maxTokens: 80);
            $json = preg_replace('/^```json\s*|\s*```$/m', '', trim($raw));
            return json_decode($json, true, flags: JSON_THROW_ON_ERROR);
        } catch (\Throwable) {
            return [];
        }
    }

    /**
     * Extract audio-only from video using ffmpeg (reduces Whisper upload size).
     * Requires ffmpeg on the server.
     */
    private function extractAudio(string $videoPath): string
    {
        $audioPath = sys_get_temp_dir() . '/' . uniqid('audio_') . '.mp3';

        $cmd = sprintf(
            'ffmpeg -i %s -vn -ar 16000 -ac 1 -ab 64k -f mp3 %s 2>/dev/null',
            escapeshellarg($videoPath),
            escapeshellarg($audioPath)
        );

        exec($cmd, $output, $exitCode);

        if ($exitCode !== 0 || !file_exists($audioPath)) {
            throw new \RuntimeException('ffmpeg audio extraction failed');
        }

        return $audioPath;
    }
}
