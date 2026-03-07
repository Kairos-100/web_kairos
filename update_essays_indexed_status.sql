-- Add is_indexed column to essays table
ALTER TABLE public.essays ADD COLUMN IF NOT EXISTS is_indexed BOOLEAN DEFAULT false;

-- Add is_indexed column to metrics table (to track CV, Sharing, CP PDFs)
-- Since one metric entry can have multiple PDFs, we might need a more granular approach, 
-- but for now let's track the essay/thesis documents primarily.
