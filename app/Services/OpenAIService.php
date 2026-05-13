<?php

namespace App\Services;

use App\Models\Product;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OpenAIService
{
    private PendingRequest $client;

    private const MODEL       = 'gpt-4o-mini';
    private const MAX_TOKENS  = 1024;

    public function __construct()
    {
        $this->client = Http::withToken(config('services.openai.api_key'))
            ->baseUrl('https://api.openai.com/v1')
            ->timeout(60)
            ->retry(2, 500);
    }

    // ─── Product descriptions ─────────────────────────────────────────────────

    /**
     * Generate a compelling, SEO-friendly product description.
     * Called from GenerateProductDescriptionJob.
     */
    public function generateProductDescription(Product $product): string
    {
        $prompt = <<<PROMPT
You are a product copywriter for Flockr, a Nigerian social commerce marketplace.
Write a compelling product description for a Nigerian audience.

Product details:
- Name: {$product->name}
- Category: {$product->category?->name}
- Price: ₦{$product->price}
- Condition: {$product->condition}
- Tags: {$this->formatTags($product->tags)}
- Seller location: {$product->location}

Requirements:
- 2–3 short paragraphs
- Highlight value for Nigerian buyers (quality, price, local availability)
- Include relevant keywords naturally
- End with a subtle call-to-action
- Tone: friendly, trustworthy, enthusiastic but not pushy
- No markdown, plain text only
PROMPT;

        return $this->chat($prompt);
    }

    /**
     * Parse a buyer's free-text search into structured intent.
     * e.g. "cheap ankara dress size 12 lagos" → {category, price_max, location, size}
     */
    public function parseSearchIntent(string $query): array
    {
        $prompt = <<<PROMPT
Extract structured shopping intent from this Nigerian buyer's search query.
Return ONLY valid JSON, no explanation.

Query: "{$query}"

Return this structure (use null for missing fields):
{
  "keywords": ["keyword1", "keyword2"],
  "category": null,
  "price_min": null,
  "price_max": null,
  "location": null,
  "condition": null,
  "attributes": {}
}
PROMPT;

        $raw = $this->chat($prompt, maxTokens: 256);

        try {
            return json_decode($raw, true, flags: JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            Log::warning('OpenAI: could not parse search intent JSON', ['raw' => $raw]);
            return ['keywords' => explode(' ', $query)];
        }
    }

    /**
     * Seller chat assistant — answer a seller's question about their shop,
     * pricing strategies, or platform features.
     */
    public function sellerAssistant(array $messages, array $sellerContext = []): string
    {
        $systemPrompt = <<<SYSTEM
You are FlockrBot, an AI assistant for sellers on Flockr — a Nigerian video-first
social commerce platform (like TikTok + Amazon for Nigeria).

Seller context:
- Total sales: {$sellerContext['total_sales']}
- Revenue: ₦{$sellerContext['revenue']}
- Active products: {$sellerContext['product_count']}
- Location: {$sellerContext['location']}

Help the seller with:
- Pricing strategies (always in Naira)
- Product photography tips for short videos
- Growing their following
- Understanding their dashboard metrics
- Order and logistics questions in Nigeria

Be concise, practical, and Nigeria-aware. Use warm, supportive language.
SYSTEM;

        return $this->chat(messages: $messages, system: $systemPrompt);
    }

    // ─── Generic chat ─────────────────────────────────────────────────────────

    /**
     * @param string|array $messages  string for single user message,
     *                                array for full message history [{role, content}]
     */
    public function chat(
        string|array $messages,
        string       $system    = '',
        int          $maxTokens = self::MAX_TOKENS,
    ): string {
        $formattedMessages = [];

        if ($system) {
            $formattedMessages[] = ['role' => 'system', 'content' => $system];
        }

        if (is_string($messages)) {
            $formattedMessages[] = ['role' => 'user', 'content' => $messages];
        } else {
            $formattedMessages = array_merge($formattedMessages, $messages);
        }

        $response = $this->client->post('/chat/completions', [
            'model'       => self::MODEL,
            'messages'    => $formattedMessages,
            'max_tokens'  => $maxTokens,
            'temperature' => 0.7,
        ]);

        if ($response->failed()) {
            Log::error('OpenAI API error', [
                'status' => $response->status(),
                'body'   => $response->body(),
            ]);
            throw new \RuntimeException('OpenAI API request failed: ' . $response->status());
        }

        return $response->json('choices.0.message.content', '');
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private function formatTags(?array $tags): string
    {
        return $tags ? implode(', ', $tags) : 'none';
    }
}
