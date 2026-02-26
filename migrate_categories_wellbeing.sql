-- RUN THIS IN SUPABASE SQL EDITOR TO MIGRATE CATEGORIES
-- This will update all existing essays categorized as 'Otros' to 'Wellbeing'

-- 1. Update the 'essays' table
UPDATE public.essays 
SET category = 'Wellbeing' 
WHERE category = 'Otros';

-- 2. Verify the changes (optional)
-- SELECT count(*) FROM public.essays WHERE category = 'Wellbeing';
