<?php

namespace App\Services;

use App\Models\Product;
use App\Models\Video;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class JinaService
{
    private const MODEL  = 'jina-embeddings-v3';
    private const DIM    = 1024;
    private const URL    = 'https://api.jina.ai/v1/embeddings';

    // ─── Embedding generation ─────────────────────────────────────────────────

    /**
     * Get a single embedding vector for a text string.
     * Returns a 1024-dim float array.
     */
    public function embed(string $text): array
    {
        return $this->embedBatch([$text])[0];
    }

    /**
     * Embed multiple texts in one API call (cheaper, faster).
     * Returns array of 1024-dim float arrays.
     */
    public function embedBatch(array $texts): array
    {
        // Jina max input: 8192 tokens per string, 2048 strings per batch
        $chunks = array_chunk($texts, 100);
        $allEmbeddings = [];

        foreach ($chunks as $chunk) {
            $response = Http::withToken(config('services.jina.api_key'))
                ->timeout(60)
                ->retry(2, 500)
                ->post(self::URL, [
                    'model'           => self::MODEL,
                    'input'           => $chunk,
                    'task'            => 'retrieval.passage',  // for indexing
                    'dimensions'      => self::DIM,
                    'embedding_type'  => 'float',
                ]);

            if ($response->failed()) {
                Log::error('Jina embedding failed', ['status' => $response->status()]);
                throw new \RuntimeException('Jina API error: ' . $response->status());
            }

            foreach ($response->json('data') as $item) {
                $allEmbeddings[] = $item['embedding'];
            }
        }

        return $allEmbeddings;
    }

    /**
     * Get a query embedding (different task type — optimised for search queries).
     */
    public function embedQuery(string $query): array
    {
        $response = Http::withToken(config('services.jina.api_key'))
            ->timeout(30)
            ->post(self::URL, [
                'model'      => self::MODEL,
                'input'      => [$query],
                'task'       => 'retrieval.query',  // search query, not document
                'dimensions' => self::DIM,
            ]);

        if ($response->failed()) {
            throw new \RuntimeException('Jina query embedding failed');
        }

        return $response->json('data.0.embedding');
    }

    // ─── Postgres / pgvector storage ─────────────────────────────────────────

    /**
     * Generate and persist a product's embedding.
     * Text = name + category + description + tags — gives best retrieval quality.
     */
    public function indexProduct(Product $product): void
    {
        $text = implode(' ', array_filter([
            $product->name,
            $product->category?->name,
            $product->description,
            $product->ai_description,
            implode(' ', $product->tags ?? []),
        ]));

        $vector = $this->embed($text);
        $this->saveVector('products', $product->id, $vector);
    }

    /**
     * Generate and persist a video's embedding.
     * Text = title + captions + keywords + hashtags.
     */
    public function indexVideo(Video $video): void
    {
        $text = implode(' ', array_filter([
            $video->title,
            $video->description,
            $video->captions,
            implode(' ', $video->keywords ?? []),
            implode(' ', $video->hashtags ?? []),
        ]));

        $vector = $this->embed($text);
        $this->saveVector('videos', $video->id, $vector);
    }

    /**
     * Save a float[] vector to the embedding column using raw SQL.
     * Eloquent doesn't have a vector type, so we cast manually.
     */
    public function saveVector(string $table, int $id, array $vector): void
    {
        $vectorStr = '[' . implode(',', $vector) . ']';
        DB::statement(
            "UPDATE {$table} SET embedding = ?::vector WHERE id = ?",
            [$vectorStr, $id]
        );
    }

    // ─── Semantic search ──────────────────────────────────────────────────────

    /**
     * Find similar products using cosine distance (<->).
     *
     * SELECT * FROM products
     *   ORDER BY embedding <-> $queryVector
     *   LIMIT 10
     */
    public function searchProducts(string $query, int $limit = 20, array $filters = []): Collection
    {
        $vector    = $this->embedQuery($query);
        $vectorStr = '[' . implode(',', $vector) . ']';

        $sql = "
            SELECT p.id,
                   1 - (p.embedding <-> ?::vector) AS similarity
            FROM products p
            WHERE p.status = 'active'
              AND p.stock_quantity > 0
              AND p.embedding IS NOT NULL
        ";

        $bindings = [$vectorStr];

        if (!empty($filters['category_id'])) {
            $sql .= ' AND p.category_id = ?';
            $bindings[] = $filters['category_id'];
        }
        if (!empty($filters['price_max'])) {
            $sql .= ' AND p.price <= ?';
            $bindings[] = $filters['price_max'];
        }
        if (!empty($filters['price_min'])) {
            $sql .= ' AND p.price >= ?';
            $bindings[] = $filters['price_min'];
        }

        $sql .= ' ORDER BY p.embedding <-> ?::vector LIMIT ?';
        $bindings[] = $vectorStr;
        $bindings[] = $limit;

        $rows = DB::select($sql, $bindings);
        $ids  = collect($rows)->pluck('id');

        // Hydrate Eloquent models, preserve similarity order
        return Product::with(['seller:id,name,username,avatar', 'category:id,name'])
            ->whereIn('id', $ids)
            ->get()
            ->sortBy(fn ($p) => $ids->search($p->id))
            ->values();
    }

    /**
     * Find products similar to a given product (recommendation widget).
     */
    public function similarProducts(Product $product, int $limit = 6): Collection
    {
        $row = DB::selectOne(
            "SELECT embedding::text FROM products WHERE id = ?",
            [$product->id]
        );

        if (!$row || !$row->embedding) {
            return collect();
        }

        $sql = "
            SELECT id
            FROM products
            WHERE status = 'active'
              AND id != ?
              AND embedding IS NOT NULL
            ORDER BY embedding <-> ?::vector
            LIMIT ?
        ";

        $ids = collect(DB::select($sql, [$product->id, $row->embedding, $limit]))->pluck('id');

        return Product::with('seller:id,name,avatar')
            ->whereIn('id', $ids)
            ->get()
            ->sortBy(fn ($p) => $ids->search($p->id))
            ->values();
    }
}
