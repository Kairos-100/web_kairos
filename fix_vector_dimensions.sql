-- RUN THIS IN SUPABASE SQL EDITOR TO FIX DIMENSION MISMATCH
-- Changes vector size from 1536 to 768 for embedding-001 compatibility

-- 1. Drop existing index
DROP INDEX IF EXISTS document_sections_embedding_idx;

-- 2. Change column type
ALTER TABLE public.document_sections 
ALTER COLUMN embedding TYPE vector(768);

-- 3. Recreate index
CREATE INDEX ON public.document_sections USING hnsw (embedding vector_cosine_ops);

-- 4. Recreate match function to match new dimensions
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
