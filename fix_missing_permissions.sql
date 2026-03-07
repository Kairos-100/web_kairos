-- RUN THIS IN SUPABASE SQL EDITOR TO FIX MISSING PERMISSIONS
-- Specifically for clockify_stats and ensuring document_sections is public

-- 1. Fix clockify_stats RLS
ALTER TABLE public.clockify_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert for clockify_stats" ON public.clockify_stats;
CREATE POLICY "Allow public insert for clockify_stats" ON public.clockify_stats FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select for clockify_stats" ON public.clockify_stats;
CREATE POLICY "Allow public select for clockify_stats" ON public.clockify_stats FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public update for clockify_stats" ON public.clockify_stats;
CREATE POLICY "Allow public update for clockify_stats" ON public.clockify_stats FOR UPDATE USING (true);

-- 2. Ensure document_sections is fully public for the AI RAG features
ALTER TABLE public.document_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert for document_sections" ON public.document_sections;
CREATE POLICY "Allow public insert for document_sections" ON public.document_sections FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete for document_sections" ON public.document_sections;
CREATE POLICY "Allow public delete for document_sections" ON public.document_sections FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow public select for document_sections" ON public.document_sections;
CREATE POLICY "Allow public select for document_sections" ON public.document_sections FOR SELECT USING (true);
