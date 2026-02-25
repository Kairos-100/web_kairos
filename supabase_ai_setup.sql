-- RUN THIS IN SUPABASE SQL EDITOR

-- 1. Enable the pgvector extension to work with embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create the document_sections table for storing chunks
CREATE TABLE IF NOT EXISTS public.document_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('essay', 'metric')),
    content TEXT NOT NULL,
    embedding VECTOR(1536), -- Standard size for Gemini/OpenAI embeddings
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
