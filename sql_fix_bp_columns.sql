-- EXECUTAR ESTO EN EL SQL EDITOR DE SUPABASE PARA SOLUCIONAR EL ERROR DE IMPORTACIÓN
-- Añade las columnas mínimas necesarias para todas las métricas y sus metadatos

ALTER TABLE public.metrics 
ADD COLUMN IF NOT EXISTS bp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS bp_title TEXT,
ADD COLUMN IF NOT EXISTS bp_description TEXT,
ADD COLUMN IF NOT EXISTS bp_pdf_url TEXT,

ADD COLUMN IF NOT EXISTS cv_title TEXT,
ADD COLUMN IF NOT EXISTS cv_description TEXT,
ADD COLUMN IF NOT EXISTS cv_pdf_url TEXT,

ADD COLUMN IF NOT EXISTS cp_title TEXT,
ADD COLUMN IF NOT EXISTS cp_description TEXT,
ADD COLUMN IF NOT EXISTS cp_pdf_url TEXT,

ADD COLUMN IF NOT EXISTS sharing_title TEXT,
ADD COLUMN IF NOT EXISTS sharing_description TEXT,
ADD COLUMN IF NOT EXISTS sharing_pdf_url TEXT;

-- Comentarios para documentar las columnas
COMMENT ON COLUMN public.metrics.bp IS 'Puntos de aprendizaje extraídos del Excel';
COMMENT ON COLUMN public.metrics.bp_title IS 'Título del hit de aprendizaje';
COMMENT ON COLUMN public.metrics.bp_description IS 'Descripción del hit de aprendizaje';
COMMENT ON COLUMN public.metrics.bp_pdf_url IS 'Link o PDF de evidencia del hit de aprendizaje';

COMMENT ON COLUMN public.metrics.cv_title IS 'Título de la visita comercial';
COMMENT ON COLUMN public.metrics.cv_description IS 'Descripción de la visita comercial';
COMMENT ON COLUMN public.metrics.cv_pdf_url IS 'Link o PDF de evidencia de la visita comercial';

COMMENT ON COLUMN public.metrics.cp_title IS 'Título de la iniciativa de comunidad';
COMMENT ON COLUMN public.metrics.cp_description IS 'Descripción de la iniciativa de comunidad';
COMMENT ON COLUMN public.metrics.cp_pdf_url IS 'Link o PDF de evidencia de la iniciativa';

COMMENT ON COLUMN public.metrics.sharing_title IS 'Título del sharing';
COMMENT ON COLUMN public.metrics.sharing_description IS 'Descripción del sharing';
COMMENT ON COLUMN public.metrics.sharing_pdf_url IS 'Link o PDF de evidencia del sharing';
