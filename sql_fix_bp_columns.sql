-- EXECUTAR ESTO EN EL SQL EDITOR DE SUPABASE PARA SOLUCIONAR EL ERROR DE IMPORTACIÓN
-- Añade las columnas mínimas necesarias para los Learning Points (BP)

ALTER TABLE public.metrics 
ADD COLUMN IF NOT EXISTS bp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS bp_title TEXT,
ADD COLUMN IF NOT EXISTS bp_pdf_url TEXT;

-- Comentario para verificar que se han añadido
COMMENT ON COLUMN public.metrics.bp IS 'Puntos de aprendizaje extraídos del Excel';
COMMENT ON COLUMN public.metrics.bp_title IS 'Título del hit de aprendizaje';
COMMENT ON COLUMN public.metrics.bp_pdf_url IS 'Link o PDF de evidencia del hit de aprendizaje';
