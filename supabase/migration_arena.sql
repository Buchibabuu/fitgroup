-- Run in Supabase SQL editor (additive; safe to re-run with IF NOT EXISTS patterns).

ALTER TABLE users ADD COLUMN IF NOT EXISTS wins_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE streaks ADD COLUMN IF NOT EXISTS longest_streak INTEGER NOT NULL DEFAULT 0;

ALTER TABLE groups ADD COLUMN IF NOT EXISTS last_awarded_week TEXT;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS last_winner_user_id TEXT;

COMMENT ON COLUMN groups.last_awarded_week IS 'Monday YYYY-MM-DD of the arena week last finalized';
COMMENT ON COLUMN groups.last_winner_user_id IS 'Firebase UID of last weekly winner';
COMMENT ON COLUMN streaks.longest_streak IS 'Max current_streak observed for this user';
