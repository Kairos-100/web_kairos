-- Delete records from unauthorized users or garbage data
-- Authorized users:
-- jaime.gonzalez@alumni.mondragon.edu
-- carlos.ortas@alumni.mondragon.edu
-- claudia.pinna@alumni.mondragon.edu
-- paula.gascon@alumni.mondragon.edu
-- angela.cuevas@alumni.mondragon.edu
-- carlos.pereza@alumni.mondragon.edu
-- marc.cano@alumni.mondragon.edu
-- jimena.gonzalez-tarr@alumni.mondragon.edu
-- guillermo.haya@alumni.mondragon.edu
-- eviela@mondragon.edu

DELETE FROM metrics 
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

DELETE FROM essays 
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
