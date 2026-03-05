-- INCREMENTAL ADJUSTMENT MIGRATION V7 (Uploaded: 2026-03-05 16:58)
-- Strictly aligns scores with Drive targets by adding deltas to 01/01/2020 entries.
-- Targets: Jaime 141, Jimena 140, Angela 112, Carlos Ortas 111, Guillermo 103, Marc 92, Paula 84, Claudia 83, Carlos Pereza 81 (CV).

-- Clean up previous attempts on this date
DELETE FROM metrics WHERE date = '01/01/2020' AND cv_title = 'Ajuste Equilibrio Drive CV';

INSERT INTO metrics (id, user_email, date, cv, cp, bp, cv_title, cp_title, bp_title) VALUES
-- Jaime: Actual 71, Target 141 (+70 CV) | LP: Actual 9, Target 80 (+71) | CP: Actual 14, Target 62 (+48)
(gen_random_uuid(), 'jaime.gonzalez@alumni.mondragon.edu', '01/01/2020', 70, 48, 71, 'Ajuste Equilibrio Drive CV', 'Ajuste Equilibrio Drive CP', 'Ajuste Equilibrio Drive LP'),
-- Jimena: Actual 71, Target 140 (+69 CV) | LP: Actual 6, Target 69 (+63) | CP: Actual 45, Target 58 (+13)
(gen_random_uuid(), 'jimena.gonzalez-tarr@alumni.mondragon.edu', '01/01/2020', 69, 13, 63, 'Ajuste Equilibrio Drive CV', 'Ajuste Equilibrio Drive CP', 'Ajuste Equilibrio Drive LP'),
-- Angela: Actual 53, Target 112 (+59 CV) | LP: Actual 9, Target 68 (+59) | CP: Actual 6, Target 48 (+42)
(gen_random_uuid(), 'angela.cuevas@alumni.mondragon.edu', '01/01/2020', 59, 42, 59, 'Ajuste Equilibrio Drive CV', 'Ajuste Equilibrio Drive CP', 'Ajuste Equilibrio Drive LP'),
-- Carlos Ortas: Actual 79, Target 111 (+32 CV) | LP: Actual 4, Target 81 (+77) | CP: Actual 42, Target 46 (+4)
(gen_random_uuid(), 'carlos.ortas@alumni.mondragon.edu', '01/01/2020', 32, 4, 77, 'Ajuste Equilibrio Drive CV', 'Ajuste Equilibrio Drive CP', 'Ajuste Equilibrio Drive LP'),
-- Guillermo: Actual 50, Target 103 (+53 CV) | LP: Actual 9, Target 63 (+54) | CP: Actual 10, Target 52 (+42)
(gen_random_uuid(), 'guillermo.haya@alumni.mondragon.edu', '01/01/2020', 53, 42, 54, 'Ajuste Equilibrio Drive CV', 'Ajuste Equilibrio Drive CP', 'Ajuste Equilibrio Drive LP'),
-- Marc: Actual 37, Target 92 (+55 CV) | LP: Actual 9, Target 66 (+57) | CP: Actual 6, Target 31 (+25)
(gen_random_uuid(), 'marc.cano@alumni.mondragon.edu', '01/01/2020', 55, 25, 57, 'Ajuste Equilibrio Drive CV', 'Ajuste Equilibrio Drive CP', 'Ajuste Equilibrio Drive LP'),
-- Paula: Actual 31, Target 84 (+53 CV) | LP: Actual 0, Target 64 (+64) | CP: Actual 5, Target 29 (+24)
(gen_random_uuid(), 'paula.gascon@alumni.mondragon.edu', '01/01/2020', 53, 24, 64, 'Ajuste Equilibrio Drive CV', 'Ajuste Equilibrio Drive CP', 'Ajuste Equilibrio Drive LP'),
-- Claudia: Actual 46, Target 83 (+37 CV) | LP: Actual 9, Target 64 (+55) | CP: Actual 14, Target 42 (+28)
(gen_random_uuid(), 'claudia.pinna@alumni.mondragon.edu', '01/01/2020', 37, 28, 55, 'Ajuste Equilibrio Drive CV', 'Ajuste Equilibrio Drive CP', 'Ajuste Equilibrio Drive LP'),
-- Carlos Pereza: Actual 43, Target 81 (+38 CV) | LP: Actual 13, Target 79 (+66) | CP: Actual 13, Target 38 (+25)
(gen_random_uuid(), 'carlos.pereza@alumni.mondragon.edu', '01/01/2020', 38, 25, 66, 'Ajuste Equilibrio Drive CV', 'Ajuste Equilibrio Drive CP', 'Ajuste Equilibrio Drive LP');
