-- Group admin + membership. Run after existing FitGroup schema.

ALTER TABLE groups ADD COLUMN IF NOT EXISTS admin_id TEXT;

CREATE TABLE IF NOT EXISTS group_members (
  group_id UUID NOT NULL REFERENCES groups (id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  PRIMARY KEY (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members (user_id);

ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dev_group_members_all" ON group_members;
CREATE POLICY "dev_group_members_all" ON group_members FOR ALL USING (true) WITH CHECK (true);

-- Backfill from users.group_id
INSERT INTO group_members (group_id, user_id, role)
SELECT u.group_id, u.id, 'member'
FROM users u
WHERE u.group_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Assign admin_id from earliest member per group
UPDATE groups g
SET admin_id = (
  SELECT u.id
  FROM users u
  WHERE u.group_id = g.id
  ORDER BY u.created_at ASC NULLS LAST
  LIMIT 1
)
WHERE g.admin_id IS NULL
  AND EXISTS (SELECT 1 FROM users u WHERE u.group_id = g.id);

-- Sync roles
UPDATE group_members gm
SET role = 'admin'
FROM groups g
WHERE gm.group_id = g.id
  AND g.admin_id IS NOT NULL
  AND gm.user_id = g.admin_id;
