/**
 * Compute workout streak from daily progress.
 * - completed: +1 to streak count for that day in the run
 * - rest_day: freezes streak (no +1); >3 consecutive rests breaks the run
 * - missing row: breaks the run (missed day)
 * If today has no entry yet, we measure from yesterday so the streak does not show 0 all morning.
 */
export function formatLocalDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(ymd, delta) {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return formatLocalDate(dt);
}

/** progressByDate: { [isoDate]: { completed, rest_day } } */
export function computeStreak(progressByDate, todayStr) {
  let start = todayStr;
  const todayRow = progressByDate[todayStr];
  if (!todayRow?.completed && !todayRow?.rest_day) {
    start = addDays(todayStr, -1);
  }

  let streak = 0;
  let consecutiveRest = 0;
  let cursor = start;
  const minDate = addDays(todayStr, -400);

  while (cursor >= minDate) {
    const row = progressByDate[cursor];
    if (!row) break;

    if (row.completed) {
      streak += 1;
      consecutiveRest = 0;
    } else if (row.rest_day) {
      consecutiveRest += 1;
      if (consecutiveRest > 3) {
        streak = 0;
        break;
      }
    } else {
      break;
    }

    cursor = addDays(cursor, -1);
  }

  let lastActive = null;
  for (let d = todayStr; d >= addDays(todayStr, -120); d = addDays(d, -1)) {
    const r = progressByDate[d];
    if (r?.completed || r?.rest_day) {
      lastActive = d;
      break;
    }
  }

  return { currentStreak: streak, lastActiveDate: lastActive };
}
