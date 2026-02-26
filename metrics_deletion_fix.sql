-- RUN THIS IN SUPABASE SQL EDITOR TO ENABLE DELETIONS
-- If RLS is enabled, you need these policies to allow deleting metrics

-- 1. Ensure RLS is enabled (optional, but good practice)
ALTER TABLE public.metrics ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policy if any (to avoid conflicts)
DROP POLICY IF EXISTS "Enable delete for anyone" ON public.metrics;

-- 3. Create a policy that allows anyone to delete (suitable for Anon key usage)
CREATE POLICY "Enable delete for anyone" 
ON public.metrics 
FOR DELETE 
USING (true);

-- 4. Just in case, grant permissions to the roles
GRANT ALL ON TABLE public.metrics TO anon;
GRANT ALL ON TABLE public.metrics TO authenticated;
GRANT ALL ON TABLE public.metrics TO service_role;

-- Verify columns for completeness (from previous fix)
ALTER TABLE public.metrics 
ADD COLUMN IF NOT EXISTS cv_pdf_url TEXT,
ADD COLUMN IF NOT EXISTS sharing_pdf_url TEXT,
ADD COLUMN IF NOT EXISTS cp_pdf_url TEXT;
