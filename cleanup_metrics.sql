-- EXECUTAR ESTO EN EL SQL EDITOR DE SUPABASE PARA REORGANIZAR LAS MÉTRICAS
-- Basado en los errores comunes de importación (ej: CVs que aparecen como CPs)

-- 1. Mover CVs que están en la columna de CP (o Sharing) a la columna correcta
UPDATE public.metrics 
SET 
  cv = COALESCE(cv, 0) + CASE WHEN cp > 0 THEN cp ELSE sharing END,
  cp = 0,
  sharing = 0
WHERE 
  (cv_title ILIKE '%CV%' OR cp_title ILIKE '%CV%' OR sharing_title ILIKE '%CV%')
  AND (cv = 0 OR cv IS NULL)
  AND (cp > 0 OR sharing > 0);

-- 2. Asegurar que si el título dice "CV", al menos tenga 1 CV
UPDATE public.metrics 
SET cv = 1 
WHERE cv_title ILIKE '%CV%' AND (cv = 0 OR cv IS NULL);

-- 3. Mover Sharings que están en CP a la columna correcta
UPDATE public.metrics 
SET 
  sharing = COALESCE(sharing, 0) + cp,
  cp = 0
WHERE 
  (sharing_title ILIKE '%Sharing%' OR cp_title ILIKE '%Sharing%')
  AND (sharing = 0 OR sharing IS NULL)
  AND cp > 0;

-- 4. Normalizar Community Points (PC)
UPDATE public.metrics 
SET 
  cp = CASE WHEN cp = 0 THEN 1 ELSE cp END
WHERE 
  (cp_title ILIKE '%PC%' OR cp_title ILIKE '%Comunidad%' OR cp_title ILIKE '%Desfilarte%')
  AND cp >= 0;
