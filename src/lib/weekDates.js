import { formatLocalDate } from './streakLogic';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** Monday-start week containing `anchor`. */
export function getWeekDateStringsForDayNames(anchor = new Date()) {
  const d = new Date(anchor);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + mondayOffset);

  const map = {};
  DAYS.forEach((name, i) => {
    const x = new Date(monday);
    x.setDate(monday.getDate() + i);
    map[name] = formatLocalDate(x);
  });
  return map;
}
