-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create HNSW index for knowledge chunk embeddings (used by AI agent knowledge search)
CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_hnsw_idx
  ON knowledge_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- New tables for prompt registry and eval harness
CREATE TABLE IF NOT EXISTS prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  skill_name TEXT,
  version INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT false,
  previous_version_id UUID REFERENCES prompt_templates(id),
  system_prompt TEXT NOT NULL,
  router_prompt TEXT,
  guardrails JSONB DEFAULT '[]'::jsonb,
  allowed_models TEXT[] DEFAULT '{}',
  fallback_model TEXT,
  experiment_key TEXT,
  metadata JSONB,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS prompt_templates_skill_active_idx
  ON prompt_templates(skill_name, is_active, version DESC);

CREATE TABLE IF NOT EXISTS eval_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID NOT NULL REFERENCES prompt_templates(id),
  branch TEXT,
  commit_sha TEXT,
  results JSONB NOT NULL,
  summary JSONB NOT NULL,
  passed BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS eval_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  skill_name TEXT NOT NULL,
  input JSONB NOT NULL,
  expected JSONB NOT NULL,
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS eval_cases_active_skill_idx
  ON eval_cases(is_active, skill_name);

CREATE INDEX IF NOT EXISTS eval_cases_tags_idx
  ON eval_cases USING GIN(tags);

-- Migration guard: add columns if enrollment table already existed without id/user_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'enrollments')
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'enrollments' AND column_name = 'id')
  THEN
    ALTER TABLE enrollments ADD COLUMN id UUID PRIMARY KEY DEFAULT gen_random_uuid();
  END IF;
END $$;
