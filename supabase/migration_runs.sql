-- Daily run tracker (no GPS). Run in Supabase SQL editor after core schema.

CREATE TABLE IF NOT EXISTS run_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time_seconds INTEGER NOT NULL CHECK (time_seconds >= 0),
  distance_m INTEGER NOT NULL CHECK (distance_m > 100),
  pace_per_km DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_run_logs_date ON run_logs (date);
CREATE INDEX IF NOT EXISTS idx_run_logs_user_date ON run_logs (user_id, date);

ALTER TABLE run_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dev_run_logs_all" ON run_logs;
CREATE POLICY "dev_run_logs_all" ON run_logs FOR ALL USING (true) WITH CHECK (true);
