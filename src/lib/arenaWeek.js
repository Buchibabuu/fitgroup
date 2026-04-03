import { formatLocalDate } from './streakLogic';

export function getMondayOfDate(d = new Date()) {
  const t = new Date(d);
  t.setHours(0, 0, 0, 0);
  const day = t.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  t.setDate(t.getDate() + offset);
  return t;
}

/** Monday YYYY-MM-DD for the week containing `d`. */
export function mondayYmd(d = new Date()) {
  return formatLocalDate(getMondayOfDate(d));
}

/** Monday YYYY-MM-DD of the calendar week before the one containing `d`. */
export function previousWeekMondayYmd(d = new Date()) {
  const m = getMondayOfDate(d);
  m.setDate(m.getDate() - 7);
  return formatLocalDate(m);
}

/**
 * Arena week = Mon–Sun ending the Sunday before the next Monday.
 * Eligible to finalize that week after its Sunday (i.e. when local date >= Monday after prevWeekMonday).
 */
export function canFinalizeArenaWeek(prevWeekMondayYmdStr, now = new Date()) {
  const [y, mo, day] = prevWeekMondayYmdStr.split('-').map(Number);
  const prevMon = new Date(y, mo - 1, day);
  const eligibleStart = new Date(prevMon);
  eligibleStart.setDate(eligibleStart.getDate() + 7);
  eligibleStart.setHours(0, 0, 0, 0);
  const n = new Date(now);
  n.setHours(0, 0, 0, 0);
  return n.getTime() >= eligibleStart.getTime();
}
