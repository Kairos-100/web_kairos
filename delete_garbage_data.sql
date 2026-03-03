-- EXECUTAR ESTO EN EL SQL EDITOR DE SUPABASE PARA BORRAR LOS DATOS CORRUPTOS
-- Este script borra cualquier entrada cuyo email no sea uno de los oficiales (Whitelist)

DELETE FROM public.metrics 
WHERE user_email NOT IN (
    'jaime.gonzalez@alumni.mondragon.edu',
    'carlos.ortas@alumni.mondragon.edu',
    'claudia.pinna@alumni.mondragon.edu',
    'paula.gascon@alumni.mondragon.edu',
    'angela.cuevas@alumni.mondragon.edu',
    'carlos.pereza@alumni.mondragon.edu',
    'marc.cano@alumni.mondragon.edu',
    'jimena.gonzalez-tarr@alumni.mondragon.edu',
    'guillermo.haya@alumni.mondragon.edu',
    'eviela@mondragon.edu'
);

DELETE FROM public.essays 
WHERE author NOT IN (
    'jaime.gonzalez@alumni.mondragon.edu',
    'carlos.ortas@alumni.mondragon.edu',
    'claudia.pinna@alumni.mondragon.edu',
    'paula.gascon@alumni.mondragon.edu',
    'angela.cuevas@alumni.mondragon.edu',
    'carlos.pereza@alumni.mondragon.edu',
    'marc.cano@alumni.mondragon.edu',
    'jimena.gonzalez-tarr@alumni.mondragon.edu',
    'guillermo.haya@alumni.mondragon.edu',
    'eviela@mondragon.edu'
);
