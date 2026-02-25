-- RUN THIS IN SUPABASE SQL EDITOR TO FIX THE METRICS ERROR
-- Adds missing PDF and Metadata columns to the metrics table

ALTER TABLE public.metrics 
ADD COLUMN IF NOT EXISTS cv_pdf_url TEXT,
ADD COLUMN IF NOT EXISTS sharing_pdf_url TEXT,
ADD COLUMN IF NOT EXISTS cp_pdf_url TEXT,
ADD COLUMN IF NOT EXISTS cv_title TEXT,
ADD COLUMN IF NOT EXISTS cv_description TEXT,
ADD COLUMN IF NOT EXISTS sharing_title TEXT,
ADD COLUMN IF NOT EXISTS sharing_description TEXT,
ADD COLUMN IF NOT EXISTS cp_title TEXT,
ADD COLUMN IF NOT EXISTS cp_description TEXT;

-- Verify the columns are added
COMMENT ON COLUMN public.metrics.cv_pdf_url IS 'URL to CV PDF evidence';
COMMENT ON COLUMN public.metrics.sharing_pdf_url IS 'URL to Sharing PDF evidence';
COMMENT ON COLUMN public.metrics.cp_pdf_url IS 'URL to Community Points PDF evidence';
