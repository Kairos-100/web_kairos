-- CLEAN MIGRATION FROM GOOGLE SHEET
-- This script clears existing metrics and inserts historical data extracted from the spreadsheet.
-- EXCLUDES: Revenue and Profit data.

-- WARNING: This will delete ALL existing metric records to ensure a clean state.
DELETE FROM metrics;

-- INSERTING HISTORICAL DATA
INSERT INTO metrics (
    user_email, 
    date, 
    cv, 
    bp, 
    cp, 
    sharing, 
    cv_title, 
    cv_pdf_url, 
    bp_title, 
    bp_pdf_url, 
    sharing_title, 
    sharing_pdf_url, 
    cp_title
) VALUES
-- Paula's Visits
('paula.gascon@alumni.mondragon.edu', '2025-02-26', 1, 0, 0, 0, 'PAULA CALABUIG VENTA TALLER PRIVADO (CERRADO)', 'https://drive.google.com/file/d/104P2P6ZDHpo-XagRkB4LEx6xkiUP8zku/view?usp=sharing', '', '', '', '', ''),
('paula.gascon@alumni.mondragon.edu', '2025-03-13', 1, 0, 0, 0, 'VENTA TALLER PRIVADO MAR SANCHEZ', 'https://docs.google.com/document/d/1T4w1FMVW-hZR1f-i99kHT2hnGt3305m_/edit?usp=drive_link', '', '', '', '', ''),
('paula.gascon@alumni.mondragon.edu', '2025-03-13', 1, 0, 0, 0, 'VENTA TALLER PRIVADO MARIANA CANO', 'https://docs.google.com/document/d/1Vdruumc95wY-AwimgRNd3sCH2LuN6FA5/edit?usp=drive_link', '', '', '', '', ''),
('paula.gascon@alumni.mondragon.edu', '2025-03-28', 1, 0, 0, 0, 'reunion lola imma ingrid', 'https://docs.google.com/document/d/1xyJHsCOV6yB80tyz39rw-QLkjBPCVZ_Y4TE2ajw2wmI/edit?usp=sharing', '', '', '', '', ''),
('paula.gascon@alumni.mondragon.edu', '2025-03-28', 1, 0, 0, 0, 'asociaciones first feel', 'https://drive.google.com/file/d/12-DxA9quXQLusVCbbUG6GeWkWzM11ETE/view?usp=sharing', '', '', '', '', ''),
('paula.gascon@alumni.mondragon.edu', '2025-03-28', 1, 0, 0, 0, 'abby herper', 'https://drive.google.com/file/d/1HGi4cjkcf_fsCtPmNAg5kJojC8UpTQGC/view?usp=sharing', '', '', '', '', ''),

-- Marc's Learning & Visits
('marc.cano@alumni.mondragon.edu', '2025-03-28', 0, 2, 0, 0, '', '', 'EL CLUB DEL... (BookPoints)', 'https://drive.google.com/file/d/1Kv2LdpuDhA4Ha0Cnpx3GwqPa_WAyDWOk/view?usp=sharing', '', '', ''),
('marc.cano@alumni.mondragon.edu', '2025-03-28', 1, 0, 0, 0, 'quien se ha l...', 'https://docs.google.com/document/d/1xyJHsCOV6yB80tyz39rw-QLkjBPCVZ_Y4TE2ajw2wmI/edit?usp=sharing', '', '', '', '', ''),

-- Carlos's Visits
('carlos.ortas@alumni.mondragon.edu', '2025-04-04', 1, 0, 0, 0, 'barks', 'https://drive.google.com/file/d/1dKkEn6cDyU2BHUvPn_lWVFea5TUgmKa4/view?usp=drive_link', '', '', '', '', ''),
('carlos.ortas@alumni.mondragon.edu', '2025-04-04', 1, 0, 0, 0, 'own contrato', 'https://drive.google.com/file/d/1tjwIQx-d6lAwUVf6WzoDcmJUYvkXpkIc/view?usp=drive_link', '', '', '', '', ''),
('carlos.ortas@alumni.mondragon.edu', '2025-04-04', 1, 0, 0, 0, 'llamadas asociaciones', 'https://drive.google.com/file/d/1tjwIQx-d6lAwUVf6WzoDcmJUYvkXpkIc/view?usp=drive_link', '', '', '', '', ''),
('carlos.ortas@alumni.mondragon.edu', '2025-04-04', 1, 0, 0, 0, 'irun', 'https://drive.google.com/file/d/1aWhyCta16u491yotiMKIZsQyidXdu826/view?usp=drive_link', '', '', '', '', ''),

-- Angela's Metrics
('angela.cuevas@alumni.mondragon.edu', '2025-04-04', 1, 0, 0, 0, 'ciclicas', 'https://drive.google.com/file/d/1m33N_0Kfai0q7wudSaBE-QDqRGqAtzfL/view?usp=drive_link', '', '', '', '', ''),
('angela.cuevas@alumni.mondragon.edu', '2025-04-04', 1, 0, 0, 0, 'oscar evento', 'https://drive.google.com/file/d/1UomGIVHLSLVxowxNbTBMpJCyk7D_NLvm/view?usp=sharing', '', '', '', '', ''),
('angela.cuevas@alumni.mondragon.edu', '2025-12-09', 1, 0, 0, 0, 'CV ANGELA CONTACTO CON PROVEEDORES', 'https://docs.google.com/document/d/1d8bZBWBpYZeEL35yYsZbP7v_0VENMcxJNYizn-_P-j0/edit?usp=sharing', '', '', '', '', ''),
('angela.cuevas@alumni.mondragon.edu', '2025-12-09', 1, 0, 0, 0, 'cv angela socks and co', 'https://docs.google.com/document/d/10KWD099Cs_z0LTrq5vumEVI3KA_n0ocxmGjTmEZIFoU/edit?usp=sharing', '', '', '', '', ''),
('angela.cuevas@alumni.mondragon.edu', '2025-12-09', 1, 0, 0, 0, 'Customer Belén Robledo', 'https://docs.google.com/document/d/17dF9GHzwJs0F-xauA5wp62i7Oo2rBKSanDoLquBugh8/edit', '', '', '', '', ''),
('angela.cuevas@alumni.mondragon.edu', '2025-12-09', 1, 0, 0, 0, 'Taller CEE Rosa Llacer.docx', 'https://docs.google.com/file/d/1VEreNU1j24iRrmnj7v4UVxI5hCz4lgno/edit?usp=docslist_api&filetype=msword', '', '', '', '', ''),
('angela.cuevas@alumni.mondragon.edu', '2025-12-09', 0, 2, 0, 0, '', '', 'essay dharavi (BookPoints)', 'https://docs.google.com/document/d/1e1jtoyR-ONqt-3zxwwTFdZovd51UPJfRekfNqZmooss/edit?usp=drive_link', '', ''),
('angela.cuevas@alumni.mondragon.edu', '2025-12-09', 1, 0, 0, 0, 'Cv galería pop art', 'https://docs.google.com/document/d/11H8rK_M24nw8P1cllfdR95sX3Xe71FrqhfOFO8Ayev8/edit', '', '', '', '', ''),
('angela.cuevas@alumni.mondragon.edu', '2025-12-21', 0, 3, 0, 0, '', '', 'Ghandi el más... (BookPoints)', 'https://drive.google.com/file/d/12rM7FwcgkZRkyaFtmmn7vqYs3tMhU5TS/view?usp=sharing', '', ''),
('angela.cuevas@alumni.mondragon.edu', '2025-12-08', 0, 0, 1, 0, '', '', '', '', '', '', 'Community Point Entry'),
('angela.cuevas@alumni.mondragon.edu', '2026-02-03', 0, 0, 0, 1, '', '', '', '', 'estres y comunicacion', 'https://drive.google.com/file/d/12rM7FwcgkZRkyaFtmmn7vqYs3tMhU5TS/view?usp=sharing', ''),
('angela.cuevas@alumni.mondragon.edu', '2026-02-03', 0, 0, 0, 1, '', '', '', '', 'facturas', 'https://drive.google.com/file/d/1Kv2LdpuDhA4Ha0Cnpx3GwqPa_WAyDWOk/view?usp=sharing', ''),

-- Jaime's Visit
('jaime.gonzalez@alumni.mondragon.edu', '2025-12-02', 1, 0, 0, 0, 'entrevista maria', 'https://drive.google.com/file/d/1UomGIVHLSLVxowxNbTBMpJCyk7D_NLvm/view?usp=sharing', '', '', '', '', '');
