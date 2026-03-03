-- EXECUTAR ESTO EN EL SQL EDITOR DE SUPABASE PARA EVITAR DUPLICADOS
-- Crea una restricción única para que no se repitan datos de la misma persona en el mismo día

-- 1. Primero borramos posibles duplicados actuales (opcional pero recomendado)
-- DELETE FROM public.metrics a USING public.metrics b 
-- WHERE a.id < b.id AND a.user_email = b.user_email AND a.date = b.date;

-- 2. Añadimos la restricción única
ALTER TABLE public.metrics 
ADD CONSTRAINT metrics_user_date_unique UNIQUE (user_email, date);

-- 3. Comentario para confirmar
COMMENT ON CONSTRAINT metrics_user_date_unique ON public.metrics IS 'Evita que se dupliquen entradas para el mismo usuario y fecha';
