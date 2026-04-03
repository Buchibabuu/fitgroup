-- FitGroup: Firebase UID = users.id (TEXT). Run in Supabase SQL editor.
-- RLS is permissive for MVP when using Firebase (no Supabase JWT). Tighten for production.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  admin_id TEXT,
  last_awarded_week TEXT,
  last_winner_user_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT,
  avatar_url TEXT,
  wins_count INTEGER NOT NULL DEFAULT 0,
  group_id UUID REFERENCES groups (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS group_members (
  group_id UUID NOT NULL REFERENCES groups (id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  PRIMARY KEY (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members (user_id);

CREATE TABLE IF NOT EXISTS workout_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  day_of_week TEXT NOT NULL,
  exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, day_of_week)
);

CREATE TABLE IF NOT EXISTS progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  date DATE NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  rest_day BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (user_id, date)
);

CREATE TABLE IF NOT EXISTS streaks (
  user_id TEXT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_active_date DATE
);

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

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE run_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dev_users_all" ON users;
DROP POLICY IF EXISTS "dev_groups_all" ON groups;
DROP POLICY IF EXISTS "dev_workout_plans_all" ON workout_plans;
DROP POLICY IF EXISTS "dev_progress_all" ON progress;
DROP POLICY IF EXISTS "dev_streaks_all" ON streaks;

CREATE POLICY "dev_users_all" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_groups_all" ON groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_workout_plans_all" ON workout_plans FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_progress_all" ON progress FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_streaks_all" ON streaks FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "dev_group_members_all" ON group_members;
CREATE POLICY "dev_group_members_all" ON group_members FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "dev_run_logs_all" ON run_logs;
CREATE POLICY "dev_run_logs_all" ON run_logs FOR ALL USING (true) WITH CHECK (true);
