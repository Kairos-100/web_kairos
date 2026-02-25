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
CREATE INDEX IF NOT EXISTS document_sections_embedding_idx ON public.document_sections USING hnsw (embedding vector_cosine_ops);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.document_sections ENABLE ROW LEVEL SECURITY;

-- 5. Define Policies (IMPORTANT: Public access for frontend indexing)
DROP POLICY IF EXISTS "Public read access" ON public.document_sections;
CREATE POLICY "Public read access" ON public.document_sections FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert access" ON public.document_sections;
CREATE POLICY "Public insert access" ON public.document_sections FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public delete access" ON public.document_sections;
CREATE POLICY "Public delete access" ON public.document_sections FOR DELETE USING (true);

-- 6. Create a function to search for document segments
CREATE OR REPLACE FUNCTION match_document_sections (
  query_embedding VECTOR(768),
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
