-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add HNSW index for approximate nearest neighbor search on 768-dim embeddings.
-- Parameters:
--   m = 16            number of bi-directional links for each layer
--   ef_construction = 64  quality vs build time trade-off
--
-- For 1M chunks consider m=32, ef_construction=128.
CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_hnsw_idx
  ON knowledge_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Increase search accuracy at query time. Tune per workload (higher = slower, better recall).
SET hnsw.ef_search = 100;

-- Ensure published filter can be combined with vector scan efficiently.
CREATE INDEX IF NOT EXISTS knowledge_articles_published_category_idx
  ON knowledge_articles (is_published, category);
