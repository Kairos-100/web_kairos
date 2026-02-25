-- RUN THIS IN SUPABASE SQL EDITOR

-- 1. Enable the pgvector extension to work with embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create the document_sections table for storing chunks
CREATE TABLE IF NOT EXISTS public.document_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('essay', 'metric')),
    content TEXT NOT NULL,
    embedding VECTOR(768), -- Optimized size for HNSW index compatibility
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create an HNSW index for fast similarity searches
-- Note: 'vector_cosine_ops' is usually best for LLM embeddings
CREATE INDEX ON public.document_sections USING hnsw (embedding vector_cosine_ops);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.document_sections ENABLE ROW LEVEL SECURITY;

-- 5. Define Read Policy (Viewable by authenticated users)
CREATE POLICY "Authenticated users can read sections" ON public.document_sections
FOR SELECT TO authenticated USING (true);

-- 6. Define Insert Policy (Service role or authorized logic handles this)
-- For now, allowing all for testing, but ideally restricted to the update logic
CREATE POLICY "Authenticated users can insert sections" ON public.document_sections
FOR INSERT TO authenticated WITH CHECK (true);

-- 7. Create a function to search for document segments
CREATE OR REPLACE FUNCTION match_document_sections (
  query_embedding VECTOR(3072),
  match_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (
  id UUID,
  source_id UUID,
  source_type TEXT,
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ds.id,
    ds.source_id,
    ds.source_type,
    ds.content,
    1 - (ds.embedding <=> query_embedding) AS similarity
  FROM document_sections ds
  WHERE 1 - (ds.embedding <=> query_embedding) > match_threshold
  ORDER BY ds.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
