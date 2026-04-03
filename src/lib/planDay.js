/** Backward-compatible workout plan JSON stored in `workout_plans.exercises`. */

function clampInt(v, min, max, fallback) {
  const n = Number.parseInt(String(v ?? ''), 10);
  if (Number.isFinite(n)) return Math.min(max, Math.max(min, n));
  return fallback;
}

function makeId(seed) {
  return `ex-${seed}-${Math.random().toString(36).slice(2, 9)}`;
}

export function normalizeItem(it, index) {
  if (typeof it === 'string') {
    const name = it.trim() || 'Exercise';
    return { id: makeId(index), name, sets: 3, reps: 10 };
  }
  const name = String(it?.name ?? '').trim() || 'Exercise';
  return {
    id: String(it?.id ?? makeId(index)),
    name,
    sets: clampInt(it?.sets, 1, 999, 3),
    reps: clampInt(it?.reps, 1, 99999, 10),
  };
}

/**
 * Parse DB JSON: legacy string[] or new { rest, items }.
 */
export function parsePlanDay(raw) {
  if (raw == null) return { rest: false, items: [] };

  if (typeof raw === 'object' && !Array.isArray(raw)) {
    if ('rest' in raw || 'items' in raw) {
      const rest = !!raw.rest;
      const arr = Array.isArray(raw.items) ? raw.items : [];
      const items = rest ? [] : arr.map((it, i) => normalizeItem(it, i));
      return { rest, items };
    }
  }

  if (Array.isArray(raw)) {
    if (raw.length === 0) return { rest: false, items: [] };
    return { rest: false, items: raw.map((it, i) => normalizeItem(it, i)) };
  }

  return { rest: false, items: [] };
}

export function serializePlanDay(state) {
  if (state.rest) return { rest: true, items: [] };
  return {
    rest: false,
    items: (state.items ?? []).map((it) => ({
      id: it.id,
      name: String(it.name ?? '').trim() || 'Exercise',
      sets: clampInt(it.sets, 1, 999, 3),
      reps: clampInt(it.reps, 1, 99999, 10),
    })),
  };
}

export function totalVolume(item) {
  const s = clampInt(item?.sets, 1, 999, 1);
  const r = clampInt(item?.reps, 1, 99999, 1);
  return s * r;
}

export function countWorkoutItems(planDay) {
  const p = parsePlanDay(planDay?.exercises ?? planDay);
  if (p.rest) return 0;
  return p.items.filter((i) => i.name.trim().length > 0).length;
}

export function isPlanRestDay(planDay) {
  const p = parsePlanDay(planDay?.exercises ?? planDay);
  return !!p.rest;
}

/** Lines for dashboard / battle card */
export function getExerciseLinesForUi(planDay) {
  const p = parsePlanDay(planDay?.exercises ?? planDay);
  if (p.rest) return [];
  return p.items
    .filter((i) => i.name.trim())
    .map((i) => `${i.name} · ${i.sets}×${i.reps} (${totalVolume(i)} total)`);
}
