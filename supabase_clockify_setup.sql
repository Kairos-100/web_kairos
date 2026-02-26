
-- Tabla para almacenar resúmenes semanales de tiempo
CREATE TABLE IF NOT EXISTS clockify_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    user_email TEXT NOT NULL,
    project_name TEXT NOT NULL,
    duration_seconds BIGINT NOT NULL,
    project_color TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(week_start, week_end, user_email, project_name)
);

-- Políticas RLS
ALTER TABLE clockify_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read-only access to clockify_stats"
    ON clockify_stats FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "Allow authenticated insert to clockify_stats"
    ON clockify_stats FOR INSERT
    TO anon
    WITH CHECK (true);
