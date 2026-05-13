# Flockr — pgvector Reference & Query Examples
# ─────────────────────────────────────────────────────────────────────────────

## What is pgvector?

pgvector is a Postgres extension that stores and queries high-dimensional float
vectors (embeddings). We use it for:
- "For You" feed: find videos semantically similar to what this user likes
- Semantic product search: "cheap ankara dress lagos" → relevant products even
  if the exact words don't appear in the product name
- Similar products widget: "you might also like..."


## Setup (already in migration, shown for reference)

```sql
-- Enable once per database
CREATE EXTENSION IF NOT EXISTS vector;

-- Add column to any table (1024 dims = jina-embeddings-v3)
ALTER TABLE products ADD COLUMN embedding vector(1024);
ALTER TABLE videos   ADD COLUMN embedding vector(1024);

-- IVFFlat index (approximate nearest neighbour — fast at scale)
-- lists = sqrt(row_count) is a good starting point
CREATE INDEX products_embedding_idx
    ON products USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- For exact search (slower but accurate, good under 100k rows)
CREATE INDEX products_embedding_exact_idx
    ON products USING hnsw (embedding vector_cosine_ops);
```


## Distance operators

| Operator | Meaning           | Use case                     |
|----------|-------------------|------------------------------|
| `<->`    | Cosine distance   | Semantic similarity (our default) |
| `<#>`    | Negative dot product | When vectors are normalised |
| `<+>`    | L1 distance       | Rarely used                  |
| `<=>` (L2) | Euclidean distance | Image embeddings            |

Lower distance = more similar.
Similarity = 1 - cosine_distance (ranges 0..1, higher = better match).


## Query examples

### 1. Semantic product search
```sql
-- Find top 20 products semantically similar to a search query
-- $1 = query vector as string '[0.1, 0.2, ...]'

SELECT
    p.id,
    p.name,
    p.price,
    1 - (p.embedding <-> $1::vector) AS similarity
FROM products p
WHERE p.status = 'active'
  AND p.stock_quantity > 0
  AND p.embedding IS NOT NULL
ORDER BY p.embedding <-> $1::vector
LIMIT 20;
```

### 2. Similar products (recommendation widget)
```sql
-- Find products similar to product ID 42
-- Uses the product's own stored vector

SELECT
    p2.id,
    p2.name,
    p2.price,
    1 - (p2.embedding <-> p1.embedding) AS similarity
FROM products p1
JOIN products p2 ON p2.id != p1.id
WHERE p1.id = 42
  AND p2.status = 'active'
  AND p2.embedding IS NOT NULL
ORDER BY p2.embedding <-> p1.embedding
LIMIT 6;
```

### 3. "For You" video feed
```sql
-- Find videos similar to user's taste vector
-- $1 = averaged embedding of user's liked/watched videos
-- $2 = array of already-seen video IDs

SELECT v.id, v.title, v.thumbnail_url, v.hls_url,
       1 - (v.embedding <-> $1::vector) AS relevance_score
FROM videos v
WHERE v.status = 'active'
  AND v.published_at IS NOT NULL
  AND v.embedding IS NOT NULL
  AND v.id != ALL($2::int[])        -- exclude seen
ORDER BY v.embedding <-> $1::vector
LIMIT 10;
```

### 4. Hybrid search (semantic + keyword + price filter)
```sql
-- Combine vector similarity with hard filters
-- Useful when user specifies "under ₦5000 in Lagos"

SELECT
    p.id,
    p.name,
    p.price,
    1 - (p.embedding <-> $1::vector) AS similarity
FROM products p
WHERE p.status = 'active'
  AND p.price <= 5000           -- hard filter
  AND p.location ILIKE '%lagos%' -- location filter
  AND p.embedding IS NOT NULL
ORDER BY p.embedding <-> $1::vector
LIMIT 20;
```

### 5. Average multiple vectors (compute taste vector in SQL)
```sql
-- Compute user taste vector server-side (alternative to PHP averaging)
-- Useful for a cron that pre-computes taste vectors

SELECT avg(v.embedding)::vector AS taste_vector
FROM videos v
JOIN video_likes vl ON vl.video_id = v.id
WHERE vl.user_id = 123
  AND v.embedding IS NOT NULL
  AND vl.created_at >= now() - interval '30 days';
```


## Setting probes for IVFFlat (query-time tuning)

More probes = better recall but slower. Default = 1.
```sql
-- Set for this session (e.g. in high-accuracy search endpoints)
SET ivfflat.probes = 10;

-- Back to fast for feed
SET ivfflat.probes = 1;
```


## Storing a vector from PHP (Laravel)
```php
// Convert float[] to Postgres vector literal
$vector = $jinaService->embed($text);               // [0.12, -0.05, ...]
$vectorStr = '[' . implode(',', $vector) . ']';     // "[0.12,-0.05,...]"

DB::statement(
    "UPDATE products SET embedding = ?::vector WHERE id = ?",
    [$vectorStr, $productId]
);
```


## Retrieving a stored vector from PHP
```php
$row = DB::selectOne(
    "SELECT embedding::text FROM products WHERE id = ?",
    [$productId]
);

// Postgres returns "[0.12,-0.05,...]" — parse it
$vector = array_map('floatval', explode(',', trim($row->embedding, '[]')));
```


## Cost at scale

| Users  | Embeddings/day | Jina cost/day |
|--------|---------------|---------------|
| 1,000  | ~500          | ~$0.01        |
| 10,000 | ~5,000        | ~$0.10        |
| 100,000| ~50,000       | ~$1.00        |

Jina pricing: ~$0.02 per 1M tokens. A product description ≈ 50 tokens.
At 10k users → well within the $50/month AI budget.
