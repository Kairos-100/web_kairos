-- CORRECCIÓN DEFINITIVA DE LP (BP offsets)
DO $$
BEGIN
    UPDATE metrics SET bp = 49, cv = 70, cp = 48 WHERE id =  + adjustmentRows[user] + ;
    UPDATE metrics SET bp = 44, cv = 69, cp = 13 WHERE id =  + adjustmentRows[user] + ;
    UPDATE metrics SET bp = 44, cv = 59, cp = 42 WHERE id =  + adjustmentRows[user] + ;
    UPDATE metrics SET bp = 4, cv = 30, cp = 4 WHERE id =  + adjustmentRows[user] + ;
    UPDATE metrics SET bp = 38, cv = 53, cp = 42 WHERE id =  + adjustmentRows[user] + ;
    UPDATE metrics SET bp = 37, cv = 55, cp = 25 WHERE id =  + adjustmentRows[user] + ;
    UPDATE metrics SET bp = 50, cv = 53, cp = 24 WHERE id =  + adjustmentRows[user] + ;
    UPDATE metrics SET bp = 45, cv = 37, cp = 28 WHERE id =  + adjustmentRows[user] + ;
    UPDATE metrics SET bp = 42, cv = 38, cp = 25 WHERE id =  + adjustmentRows[user] + ;
END $$;
