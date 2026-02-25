-- RUN THIS IN SUPABASE SQL EDITOR TO FIX RLS PERMISSIONS
-- Allows the frontend to index and clean up document sections without authentication

-- 1. Permitir inserción para todos (anon y bots)
CREATE POLICY "Allow public insert" ON public.document_sections FOR INSERT WITH CHECK (true);

-- 2. Permitir borrado para todos (necesario para la idempotencia de los documentos)
CREATE POLICY "Allow public delete" ON public.document_sections FOR DELETE USING (true);

-- 3. Asegurar que la lectura sea pública
DROP POLICY IF EXISTS "Public read access" ON public.document_sections;
CREATE POLICY "Public read access" ON public.document_sections FOR SELECT USING (true);
