-- Run logs: kilometers → meters + pace_per_km. Run in Supabase SQL editor after migration_runs.sql.

ALTER TABLE run_logs ADD COLUMN IF NOT EXISTS distance_m INTEGER;
ALTER TABLE run_logs ADD COLUMN IF NOT EXISTS pace_per_km DOUBLE PRECISION;

UPDATE run_logs
SET distance_m = ROUND(distance_km * 1000)::INTEGER
WHERE distance_m IS NULL AND distance_km IS NOT NULL AND distance_km > 0;

UPDATE run_logs
SET pace_per_km = (time_seconds::double precision / NULLIF(distance_m, 0)) * 1000
WHERE distance_m IS NOT NULL AND distance_m > 100 AND pace_per_km IS NULL;

ALTER TABLE run_logs DROP COLUMN IF EXISTS distance_km;

DELETE FROM run_logs
WHERE distance_m IS NULL OR distance_m <= 100 OR pace_per_km IS NULL;

ALTER TABLE run_logs ALTER COLUMN distance_m SET NOT NULL;
ALTER TABLE run_logs ALTER COLUMN pace_per_km SET NOT NULL;
