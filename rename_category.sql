-- Rename "Otros" category to "Wellbeing" in the essays table
UPDATE essays 
SET category = 'Wellbeing' 
WHERE category = 'Otros';

-- Verify the change
SELECT count(*) FROM essays WHERE category = 'Otros';
SELECT count(*) FROM essays WHERE category = 'Wellbeing';
