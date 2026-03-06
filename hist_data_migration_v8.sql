-- ACTUALIZACIÓN DEFINITIVA DE PUNTOS V8 (BP, CV, CP offsets corrects)
DO $$
BEGIN
    -- Target for jaime.gonzalez: CV=141, LP=80, CP=62
    -- Actual raw data: CV=71, LP=31, CP=14
    -- Missing gaps applied to 01/01/2020 record:
    UPDATE metrics SET bp = 49, cv = 70, cp = 48 WHERE user_email = 'jaime.gonzalez@alumni.mondragon.edu' AND date = '01/01/2020' AND cv_title = 'Ajuste Equilibrio Drive CV';

    -- Target for jimena.gonzalez-tarr: CV=140, LP=69, CP=58
    -- Actual raw data: CV=71, LP=25, CP=45
    -- Missing gaps applied to 01/01/2020 record:
    UPDATE metrics SET bp = 44, cv = 69, cp = 13 WHERE user_email = 'jimena.gonzalez-tarr@alumni.mondragon.edu' AND date = '01/01/2020' AND cv_title = 'Ajuste Equilibrio Drive CV';

    -- Target for angela.cuevas: CV=112, LP=68, CP=48
    -- Actual raw data: CV=53, LP=24, CP=6
    -- Missing gaps applied to 01/01/2020 record:
    UPDATE metrics SET bp = 44, cv = 59, cp = 42 WHERE user_email = 'angela.cuevas@alumni.mondragon.edu' AND date = '01/01/2020' AND cv_title = 'Ajuste Equilibrio Drive CV';

    -- Target for carlos.ortas: CV=111, LP=81, CP=46
    -- Actual raw data: CV=81, LP=77, CP=42
    -- Missing gaps applied to 01/01/2020 record:
    UPDATE metrics SET bp = 4, cv = 30, cp = 4 WHERE user_email = 'carlos.ortas@alumni.mondragon.edu' AND date = '01/01/2020' AND cv_title = 'Ajuste Equilibrio Drive CV';

    -- Target for guillermo.haya: CV=103, LP=63, CP=52
    -- Actual raw data: CV=50, LP=25, CP=10
    -- Missing gaps applied to 01/01/2020 record:
    UPDATE metrics SET bp = 38, cv = 53, cp = 42 WHERE user_email = 'guillermo.haya@alumni.mondragon.edu' AND date = '01/01/2020' AND cv_title = 'Ajuste Equilibrio Drive CV';

    -- Target for marc.cano: CV=92, LP=66, CP=31
    -- Actual raw data: CV=37, LP=29, CP=6
    -- Missing gaps applied to 01/01/2020 record:
    UPDATE metrics SET bp = 37, cv = 55, cp = 25 WHERE user_email = 'marc.cano@alumni.mondragon.edu' AND date = '01/01/2020' AND cv_title = 'Ajuste Equilibrio Drive CV';

    -- Target for paula.gascon: CV=84, LP=64, CP=29
    -- Actual raw data: CV=31, LP=14, CP=5
    -- Missing gaps applied to 01/01/2020 record:
    UPDATE metrics SET bp = 50, cv = 53, cp = 24 WHERE user_email = 'paula.gascon@alumni.mondragon.edu' AND date = '01/01/2020' AND cv_title = 'Ajuste Equilibrio Drive CV';

    -- Target for claudia.pinna: CV=83, LP=64, CP=42
    -- Actual raw data: CV=46, LP=19, CP=14
    -- Missing gaps applied to 01/01/2020 record:
    UPDATE metrics SET bp = 45, cv = 37, cp = 28 WHERE user_email = 'claudia.pinna@alumni.mondragon.edu' AND date = '01/01/2020' AND cv_title = 'Ajuste Equilibrio Drive CV';

    -- Target for carlos.pereza: CV=81, LP=79, CP=38
    -- Actual raw data: CV=43, LP=37, CP=13
    -- Missing gaps applied to 01/01/2020 record:
    UPDATE metrics SET bp = 42, cv = 38, cp = 25 WHERE user_email = 'carlos.pereza@alumni.mondragon.edu' AND date = '01/01/2020' AND cv_title = 'Ajuste Equilibrio Drive CV';

END $$;
