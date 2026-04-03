import { computePacePerKm, formatPaceMinPerKm } from '../lib/runDisplay';
import { supabase } from './supabase';

/** Strictly more than 100 m */
export const MIN_DISTANCE_M = 101;
// Allow quick runs; mm:ss on the clock is typically coarse (seconds only).
export const MIN_TIME_SECONDS = 1;
/** ~2:00/km — rejects absurd sprint typos */
export const MIN_PACE_SEC_PER_KM = 120;
/** ~25:00/km — rejects typos / non-runs */
export const MAX_PACE_SEC_PER_KM = 1500;

/** History filter chips (exact distance_m). */
export const HISTORY_DISTANCE_FILTERS = [800, 1000, 1200];

export function isValidStoredRun(r) {
  if (!r) return false;
  const pace = Number(r.pace_per_km);
  const d = Number(r.distance_m);
  return (
    r.pace_per_km != null &&
    Number.isFinite(pace) &&
    pace >= MIN_PACE_SEC_PER_KM &&
    pace <= MAX_PACE_SEC_PER_KM &&
    r.distance_m != null &&
    d > 100 &&
    r.time_seconds >= MIN_TIME_SECONDS
  );
}

async function memberIdsForGroup(groupId) {
  const { data: gm, error } = await supabase.from('group_members').select('user_id').eq('group_id', groupId);
  if (error) throw error;
  if (gm?.length) return gm.map((r) => r.user_id);

  const { data: legacy, error: lerr } = await supabase.from('users').select('id').eq('group_id', groupId);
  if (lerr) throw lerr;
  return (legacy ?? []).map((u) => u.id);
}

function displayName(row) {
  const n = row?.name?.trim();
  if (n) return n.split(/\s+/)[0];
  const e = row?.email?.split('@')[0];
  return e || 'Teammate';
}

/**
 * @param {number} timeSeconds
 * @param {number} distanceM
 * @returns {{ distance_m: number, pace_per_km: number }}
 */
export function validateAndComputeRun(timeSeconds, distanceM) {
  const time_seconds = Math.round(Number(timeSeconds) || 0);
  const distance_m = Math.round(Number(distanceM) || 0);

  if (time_seconds < MIN_TIME_SECONDS) {
    throw new Error(`Time must be at least ${MIN_TIME_SECONDS}s (mm:ss on the clock).`);
  }
  if (!Number.isFinite(distance_m) || distance_m <= 100) {
    throw new Error('Distance must be greater than 100 m.');
  }

  const pace_per_km = computePacePerKm(time_seconds, distance_m);
  if (pace_per_km == null) {
    throw new Error('Invalid distance.');
  }
  if (pace_per_km < MIN_PACE_SEC_PER_KM) {
    throw new Error('That pace is unrealistically fast — check time and distance.');
  }
  if (pace_per_km > MAX_PACE_SEC_PER_KM) {
    throw new Error('That pace is unrealistically slow — check time and distance.');
  }

  return { distance_m, pace_per_km: Math.round(pace_per_km * 1000) / 1000 };
}

/**
 * @param {string} userId
 * @param {string} dateYmd local date YYYY-MM-DD
 */
export async function fetchRunForDate(userId, dateYmd) {
  const { data, error } = await supabase
    .from('run_logs')
    .select('user_id, date, time_seconds, distance_m, pace_per_km')
    .eq('user_id', userId)
    .eq('date', dateYmd)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

/**
 * Past runs, latest date first (valid rows only).
 * @param {string} userId
 * @param {number} [limit]
 */
export async function fetchRunHistory(userId, limit = 200) {
  const { data, error } = await supabase
    .from('run_logs')
    .select('date, time_seconds, distance_m, pace_per_km')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).filter(isValidStoredRun);
}

async function fetchPriorMinPace(userId) {
  const { data, error } = await supabase.from('run_logs').select('pace_per_km').eq('user_id', userId);
  if (error) throw error;
  const paces = (data ?? [])
    .map((r) => Number(r.pace_per_km))
    .filter((p) => Number.isFinite(p) && p >= MIN_PACE_SEC_PER_KM && p <= MAX_PACE_SEC_PER_KM);
  if (paces.length === 0) return Infinity;
  return Math.min(...paces);
}

/**
 * Upsert one run per user per day (meters + pace).
 * @returns {Promise<{ user_id: string, date: string, time_seconds: number, distance_m: number, pace_per_km: number, isNewPersonalBest: boolean }>}
 */
export async function upsertRunLog(userId, dateYmd, payload) {
  const { distance_m, pace_per_km } = validateAndComputeRun(payload.time_seconds, payload.distance_m);

  const time_seconds = Math.round(Number(payload.time_seconds) || 0);

  const existing = await fetchRunForDate(userId, dateYmd);
  if (
    existing?.pace_per_km != null &&
    existing.distance_m != null &&
    Number(existing.distance_m) > 100 &&
    existing.time_seconds >= MIN_TIME_SECONDS
  ) {
    const best = Number(existing.pace_per_km);
    if (Number.isFinite(best) && pace_per_km >= best) {
      throw new Error(
        `Today's best is ${formatPaceMinPerKm(best)} min/km — go faster (lower pace) to replace it.`
      );
    }
  }

  const priorMin = await fetchPriorMinPace(userId);
  const isNewPersonalBest = pace_per_km < priorMin - 1e-9;

  const { data, error } = await supabase
    .from('run_logs')
    .upsert(
      {
        user_id: userId,
        date: dateYmd,
        time_seconds,
        distance_m,
        pace_per_km,
      },
      { onConflict: 'user_id,date' }
    )
    .select('user_id, date, time_seconds, distance_m, pace_per_km')
    .single();
  if (error) throw error;
  return { ...data, isNewPersonalBest };
}

/**
 * Run leaderboard for one calendar day, **scoped to this group’s members only**
 * (`group_members`, with legacy fallback to `users.group_id`).
 * Sorted by lowest `pace_per_km` (best first).
 */
export async function fetchGroupRunLeaderboard(groupId, dateYmd, currentUserId) {
  const ids = await memberIdsForGroup(groupId);
  if (ids.length === 0) return [];

  const { data: logs, error } = await supabase
    .from('run_logs')
    .select('user_id, time_seconds, distance_m, pace_per_km')
    .eq('date', dateYmd)
    .in('user_id', ids);
  if (error) throw error;

  const valid = (logs ?? []).filter(isValidStoredRun);

  if (valid.length === 0) return [];

  const userIds = [...new Set(valid.map((r) => r.user_id))];
  const { data: users, error: uerr } = await supabase.from('users').select('id, name, email').in('id', userIds);
  if (uerr) throw uerr;
  const byId = Object.fromEntries((users ?? []).map((u) => [u.id, u]));

  const merged = valid.map((r) => ({
    userId: r.user_id,
    name: displayName(byId[r.user_id]),
    time_seconds: r.time_seconds,
    distance_m: r.distance_m,
    pace_per_km: Number(r.pace_per_km),
    isYou: r.user_id === currentUserId,
  }));

  merged.sort((a, b) => {
    if (a.pace_per_km !== b.pace_per_km) return a.pace_per_km - b.pace_per_km;
    return a.name.localeCompare(b.name);
  });

  const ranked = [];
  for (let i = 0; i < merged.length; i++) {
    const row = merged[i];
    if (i === 0) {
      ranked.push({ ...row, rank: 1 });
      continue;
    }
    if (row.pace_per_km === merged[i - 1].pace_per_km) {
      ranked.push({ ...row, rank: ranked[i - 1].rank });
    } else {
      ranked.push({ ...row, rank: i + 1 });
    }
  }

  return ranked;
}
