import { formatMmSsShort } from './formatMmSs';

/** Seconds per km from time and distance in meters. */
export function computePacePerKm(timeSeconds, distanceM) {
  const t = Number(timeSeconds);
  const d = Number(distanceM);
  if (!Number.isFinite(t) || !Number.isFinite(d) || d <= 0) return null;
  return (t / d) * 1000;
}

/** @param {number} paceSecondsPerKm */
export function formatPaceMinPerKm(paceSecondsPerKm) {
  const sec = Math.max(0, Math.round(Number(paceSecondsPerKm) || 0));
  const min = Math.floor(sec / 60);
  const s = sec % 60;
  return `${min}:${String(s).padStart(2, '0')}/km`;
}

/**
 * @param {{ distance_m: number, time_seconds: number, pace_per_km?: number | null }} r
 * @returns {string} e.g. "1200m in 5:48 (4:50/km)"
 */
export function formatRunSummary(r) {
  const d = Math.round(Number(r.distance_m) || 0);
  const time = formatMmSsShort(r.time_seconds);
  const pace =
    r.pace_per_km != null && Number.isFinite(Number(r.pace_per_km))
      ? formatPaceMinPerKm(r.pace_per_km)
      : formatPaceMinPerKm(computePacePerKm(r.time_seconds, d));
  return `${d}m in ${time} (${pace})`;
}
