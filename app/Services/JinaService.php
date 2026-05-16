<?php

namespace App\Services;

use App\Models\Product;
use App\Models\Video;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class JinaService
{
    private const MODEL = 'jina-embeddings-v3';
    private const DIM   = 1024;
    private const URL   = 'https://api.jina.ai/v1/embeddings';

    // ─── Embedding generation ─────────────────────────────────────────────────

    public function embed(string $text): array
    {
        return $this->embedBatch([$text])[0];
    }

    public function embedBatch(array $texts): array
    {
        $chunks        = array_chunk($texts, 100);
        $allEmbeddings = [];

        foreach ($chunks as $chunk) {
            $response = Http::withToken(config('services.jina.api_key'))
                ->timeout(60)
                ->retry(2, 500)
                ->post(self::URL, [
                    'model'          => self::MODEL,
                    'input'          => $chunk,
                    'task'           => 'retrieval.passage',
                    'dimensions'     => self::DIM,
                    'embedding_type' => 'float',
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

    public function embedQuery(string $query): array
    {
        $response = Http::withToken(config('services.jina.api_key'))
            ->timeout(30)
            ->post(self::URL, [
                'model'      => self::MODEL,
                'input'      => [$query],
                'task'       => 'retrieval.query',
                'dimensions' => self::DIM,
            ]);

        if ($response->failed()) {
            throw new \RuntimeException('Jina query embedding failed');
        }

        return $response->json('data.0.embedding');
    }

    // ─── Postgres / pgvector storage ─────────────────────────────────────────

    /**
     * Check if the embedding column exists before running any vector SQL.
     * This prevents crashes when pgvector migration hasn't been run yet.
     */
    private function hasEmbeddingColumn(string $table): bool
    {
        return Schema::hasColumn($table, 'embedding');
    }

    public function indexProduct(Product $product): void
    {
        if (!$this->hasEmbeddingColumn('products')) {
            Log::info('Skipping product embedding — column does not exist yet.');
            return;
        }

        $text = implode(' ', array_filter([
            $product->name,
            $product->category?->name,
            $product->description,
            $product->ai_description ?? '',
            implode(' ', $product->tags ?? []),
        ]));

        try {
            $vector = $this->embed($text);
            $this->saveVector('products', $product->id, $vector);
        } catch (\Throwable $e) {
            Log::error('Product embedding failed', ['product_id' => $product->id, 'error' => $e->getMessage()]);
        }
    }

    public function indexVideo(Video $video): void
    {
        if (!$this->hasEmbeddingColumn('videos')) {
            Log::info('Skipping video embedding — column does not exist yet.');
            return;
        }

        $text = implode(' ', array_filter([
            $video->title,
            $video->description,
            $video->captions,
            implode(' ', $video->keywords ?? []),
            implode(' ', $video->hashtags ?? []),
        ]));

        try {
            $vector = $this->embed($text);
            $this->saveVector('videos', $video->id, $vector);
        } catch (\Throwable $e) {
            Log::error('Video embedding failed', ['video_id' => $video->id, 'error' => $e->getMessage()]);
        }
    }

    public function saveVector(string $table, int $id, array $vector): void
    {
        if (!$this->hasEmbeddingColumn($table)) return;

        $vectorStr = '[' . implode(',', $vector) . ']';
        DB::statement(
            "UPDATE {$table} SET embedding = ?::vector WHERE id = ?",
            [$vectorStr, $id]
        );
    }

    // ─── Semantic search ──────────────────────────────────────────────────────

    public function searchProducts(string $query, int $limit = 20, array $filters = []): Collection
    {
        // Fall back to keyword search if embedding column doesn't exist
        if (!$this->hasEmbeddingColumn('products')) {
            return Product::with(['seller:id,name,username,avatar', 'category:id,name'])
                ->where('status', 'active')
                ->where('stock_quantity', '>', 0)
                ->where(fn ($q) => $q->where('name', 'ilike', "%{$query}%")
                    ->orWhere('description', 'ilike', "%{$query}%"))
                ->limit($limit)
                ->get();
        }

        try {
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

            $sql      .= ' ORDER BY p.embedding <-> ?::vector LIMIT ?';
            $bindings[] = $vectorStr;
            $bindings[] = $limit;

            $rows = DB::select($sql, $bindings);
            $ids  = collect($rows)->pluck('id');

            return Product::with(['seller:id,name,username,avatar', 'category:id,name'])
                ->whereIn('id', $ids)
                ->get()
                ->sortBy(fn ($p) => $ids->search($p->id))
                ->values();
        } catch (\Throwable $e) {
            Log::error('Semantic search failed', ['error' => $e->getMessage()]);
            return collect();
        }
    }

    /**
     * Find products similar to a given product.
     * Returns empty collection safely if embedding column doesn't exist.
     */
    public function similarProducts(Product $product, int $limit = 6): Collection
    {
        if (!$this->hasEmbeddingColumn('products')) {
            // Fall back: same category, different product
            return Product::with('seller:id,name,avatar')
                ->where('status', 'active')
                ->where('id', '!=', $product->id)
                ->where('category_id', $product->category_id)
                ->inRandomOrder()
                ->limit($limit)
                ->get();
        }

        try {
            $row = DB::selectOne(
                "SELECT embedding::text FROM products WHERE id = ?",
                [$product->id]
            );

            if (!$row || !$row->embedding) {
                return collect();
            }

            $ids = collect(DB::select(
                "SELECT id FROM products
                 WHERE status = 'active' AND id != ? AND embedding IS NOT NULL
                 ORDER BY embedding <-> ?::vector LIMIT ?",
                [$product->id, $row->embedding, $limit]
            ))->pluck('id');

            return Product::with('seller:id,name,avatar')
                ->whereIn('id', $ids)
                ->get()
                ->sortBy(fn ($p) => $ids->search($p->id))
                ->values();
        } catch (\Throwable $e) {
            Log::error('similarProducts failed', ['error' => $e->getMessage()]);
            return collect();
        }
    }
}