-- ELIMINAR LA RESTRICCIÓN DE UNICIDAD PARA PERMITIR MÚLTIPLES INDICADORES EL MISMO DÍA
-- Ejecuta esto en el SQL Editor de Supabase

ALTER TABLE public.metrics 
DROP CONSTRAINT IF EXISTS metrics_user_date_unique;

-- Comentario para confirmar el cambio
COMMENT ON TABLE public.metrics IS 'Almacena métricas comerciales. Se permiten múltiples entradas por usuario y día.';
