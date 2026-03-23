-- 1. Enable RLS and grant SELECT permissions to anon and authenticated roles
-- This allows the frontend to display the data synced by the Edge Function.

-- Projects
ALTER TABLE holded_projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for holded_projects" ON holded_projects;
CREATE POLICY "Allow public read for holded_projects" ON holded_projects FOR SELECT USING (true);

-- Snapshots
ALTER TABLE holded_project_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for holded_project_snapshots" ON holded_project_snapshots;
CREATE POLICY "Allow public read for holded_project_snapshots" ON holded_project_snapshots FOR SELECT USING (true);

-- Invoices / Documents
ALTER TABLE holded_invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for holded_invoices" ON holded_invoices;
CREATE POLICY "Allow public read for holded_invoices" ON holded_invoices FOR SELECT USING (true);

-- API Keys
ALTER TABLE holded_api_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for holded_api_keys" ON holded_api_keys;
CREATE POLICY "Allow public read for holded_api_keys" ON holded_api_keys FOR SELECT USING (true);
