import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { formatMmSs } from '../lib/formatMmSs';
import { computePacePerKm, formatPaceMinPerKm, formatRunSummary } from '../lib/runDisplay';
import { getRunSaveMotivation } from '../lib/runMotivation';
import {
  fetchRunForDate,
  upsertRunLog,
  MIN_TIME_SECONDS,
  MIN_DISTANCE_M,
  MIN_PACE_SEC_PER_KM,
  MAX_PACE_SEC_PER_KM,
} from '../services/runs';

function parseMmSsInputs(mmStr, ssStr) {
  const m = parseInt(String(mmStr).trim(), 10);
  const s = parseInt(String(ssStr).trim(), 10);
  if (!Number.isFinite(m) || m < 0) return null;
  if (!Number.isFinite(s) || s < 0 || s > 59) return null;
  return m * 60 + s;
}

export default function RunTrackerCard({ userId, dateYmd, onSaved, onSavedDetail }) {
  const [running, setRunning] = useState(false);
  const accumulatedMs = useRef(0);
  const sliceStart = useRef(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [saved, setSaved] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [distanceM, setDistanceM] = useState('');
  const [timeMm, setTimeMm] = useState('');
  const [timeSs, setTimeSs] = useState('');

  const tick = useCallback(() => {
    if (!running || sliceStart.current == null) return;
    setElapsedMs(accumulatedMs.current + (Date.now() - sliceStart.current));
  }, [running]);

  useEffect(() => {
    if (!running) return;
    sliceStart.current = Date.now();
    const id = setInterval(tick, 120);
    return () => clearInterval(id);
  }, [running, tick]);

  const loadSaved = useCallback(async () => {
    if (!userId || !dateYmd) return;
    setLoading(true);
    try {
      const row = await fetchRunForDate(userId, dateYmd);
      setSaved(row);
      if (row?.distance_m > 100) setDistanceM(String(row.distance_m));
    } catch (e) {
      console.error(e);
      toast.error(e?.message || 'Could not load run.');
    } finally {
      setLoading(false);
    }
  }, [userId, dateYmd]);

  useEffect(() => {
    loadSaved();
  }, [loadSaved]);

  const watchSeconds = Math.floor(elapsedMs / 1000);
  const parsedManual = useMemo(() => parseMmSsInputs(timeMm, timeSs), [timeMm, timeSs]);

  const displaySeconds = useMemo(() => {
    if (running) return watchSeconds;
    if (parsedManual != null && parsedManual >= MIN_TIME_SECONDS) return parsedManual;
    return watchSeconds;
  }, [running, parsedManual, watchSeconds]);

  const effectiveSeconds = useMemo(() => {
    if (parsedManual != null && parsedManual >= MIN_TIME_SECONDS) return parsedManual;
    if (!running && watchSeconds >= MIN_TIME_SECONDS) return watchSeconds;
    return null;
  }, [parsedManual, watchSeconds, running]);

  const display = formatMmSs(displaySeconds);

  const distanceParsed = useMemo(() => {
    const n = Number(String(distanceM).replace(/,/g, '').trim());
    return Number.isFinite(n) ? Math.round(n) : NaN;
  }, [distanceM]);

  const pacePreview = useMemo(() => {
    if (effectiveSeconds == null || !Number.isFinite(distanceParsed) || distanceParsed <= 100) return null;
    const pace = computePacePerKm(effectiveSeconds, distanceParsed);
    if (pace == null) return null;
    if (pace < MIN_PACE_SEC_PER_KM || pace > MAX_PACE_SEC_PER_KM) {
      return { invalid: true, text: 'Pace looks unrealistic — check meters and time.' };
    }
    return { invalid: false, text: `${formatPaceMinPerKm(pace)} min/km` };
  }, [effectiveSeconds, distanceParsed]);

  const canSave =
    !running &&
    effectiveSeconds != null &&
    Number.isFinite(distanceParsed) &&
    distanceParsed > 100 &&
    pacePreview &&
    !pacePreview.invalid;

  function handleStart() {
    if (!running) setRunning(true);
  }

  function handlePause() {
    if (!running) return;
    accumulatedMs.current += Date.now() - sliceStart.current;
    setElapsedMs(accumulatedMs.current);
    setRunning(false);
    sliceStart.current = null;
    const totalSec = Math.floor(accumulatedMs.current / 1000);
    setTimeMm(String(Math.floor(totalSec / 60)));
    setTimeSs(String(totalSec % 60).padStart(2, '0'));
  }

  function handleReset() {
    setRunning(false);
    sliceStart.current = null;
    accumulatedMs.current = 0;
    setElapsedMs(0);
    setTimeMm('');
    setTimeSs('');
  }

  async function handleSave() {
    if (!userId || !dateYmd || running || effectiveSeconds == null) return;
    setSaving(true);
    try {
      const row = await upsertRunLog(userId, dateYmd, {
        time_seconds: effectiveSeconds,
        distance_m: distanceParsed,
      });
      const { isNewPersonalBest, ...savedRow } = row;
      setSaved(savedRow);
      setRunning(false);
      sliceStart.current = null;
      accumulatedMs.current = 0;
      setElapsedMs(0);
      setTimeMm('');
      setTimeSs('');
      setDistanceM(String(savedRow.distance_m));
      if (isNewPersonalBest) {
        toast.success('New Personal Best 🏆');
      } else {
        toast.success(getRunSaveMotivation(dateYmd));
      }
      onSavedDetail?.(row);
      onSaved?.();
    } catch (e) {
      toast.error(e?.message || 'Could not save run.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border border-sky-500/20 bg-surface-card/80 p-5 shadow-xl backdrop-blur-md">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-500/15 via-transparent to-cyan-500/10" />
      <div className="pointer-events-none absolute -left-16 top-0 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-200/90">Run input</p>
            <h2 className="mt-1 text-xl font-black tracking-tight text-white">Log today&apos;s run</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Stopwatch or type time (mm:ss). Distance in meters (&gt;100). Best pace of the day wins.
            </p>
          </div>
          <span className="text-2xl" aria-hidden>
            🏃
          </span>
        </div>

        {loading ? (
          <p className="mt-6 text-center text-sm text-zinc-500">Loading…</p>
        ) : (
          <>
            {saved?.time_seconds > 0 && saved?.distance_m > 100 ? (
              <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-wider text-emerald-200/90">Today&apos;s best</p>
                <p className="mt-1 text-sm font-bold leading-snug text-emerald-100">{formatRunSummary(saved)}</p>
                <p className="mt-2 text-[11px] text-zinc-500">
                  Beat this pace to replace — slower times won&apos;t save.
                </p>
              </div>
            ) : null}

            <div className="mt-5 flex justify-center">
              <div className="rounded-3xl border border-white/10 bg-black/40 px-8 py-6 shadow-[0_0_40px_rgba(34,211,238,0.12)]">
                <p
                  className="text-center font-mono text-5xl font-black tabular-nums tracking-tight text-cyan-100 sm:text-6xl"
                  style={{ textShadow: '0 0 28px rgba(34,211,238,0.35)' }}
                >
                  {display}
                </p>
                <p className="mt-2 text-center text-[10px] font-bold uppercase tracking-wider text-zinc-600">mm:ss</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={running ? handlePause : handleStart}
                className={`rounded-2xl py-3 text-sm font-black transition active:scale-[0.98] ${
                  running
                    ? 'border border-amber-500/40 bg-amber-500/15 text-amber-100'
                    : 'bg-gradient-to-r from-sky-500 to-cyan-500 text-black shadow-lg shadow-cyan-500/20'
                }`}
              >
                {running ? 'Pause' : 'Start'}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="rounded-2xl border border-white/15 bg-white/5 py-3 text-sm font-black text-zinc-200 transition hover:bg-white/10"
              >
                Reset
              </button>
              <button
                type="button"
                disabled={saving || !canSave}
                onClick={handleSave}
                className="rounded-2xl border border-emerald-500/40 bg-emerald-500/15 py-3 text-sm font-black text-emerald-100 transition hover:bg-emerald-500/25 disabled:opacity-40"
              >
                Save run
              </button>
            </div>
            {running ? (
              <p className="mt-2 text-center text-[11px] text-amber-200/90">Pause the stopwatch before saving.</p>
            ) : null}

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Time · min</label>
                <input
                  inputMode="numeric"
                  placeholder="0"
                  value={timeMm}
                  onChange={(e) => setTimeMm(e.target.value.replace(/\D/g, ''))}
                  className="mt-1 w-full rounded-2xl border border-white/10 bg-[#12121a] px-4 py-3 text-sm font-semibold text-white outline-none focus:border-cyan-500/40"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Time · sec</label>
                <input
                  inputMode="numeric"
                  placeholder="00"
                  maxLength={2}
                  value={timeSs}
                  onChange={(e) => setTimeSs(e.target.value.replace(/\D/g, '').slice(0, 2))}
                  className="mt-1 w-full rounded-2xl border border-white/10 bg-[#12121a] px-4 py-3 text-sm font-semibold text-white outline-none focus:border-cyan-500/40"
                />
              </div>
            </div>
            <p className="mt-1 text-[10px] text-zinc-600">Typing time overrides the stopwatch (0–59 sec).</p>

            <div className="mt-4">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Distance (meters, min {MIN_DISTANCE_M}m)
              </label>
              <input
                inputMode="numeric"
                placeholder="e.g. 1200"
                value={distanceM}
                onChange={(e) => setDistanceM(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-white/10 bg-[#12121a] px-4 py-3 text-sm font-semibold text-white outline-none focus:border-cyan-500/40"
              />
              {pacePreview ? (
                <p
                  className={`mt-2 text-xs font-semibold ${pacePreview.invalid ? 'text-amber-200' : 'text-cyan-200/90'}`}
                >
                  {pacePreview.invalid ? pacePreview.text : `Pace · ${pacePreview.text}`}
                </p>
              ) : (
                <p className="mt-2 text-[11px] text-zinc-600">
                  Need valid time (≥{MIN_TIME_SECONDS}s) and distance &gt; 100 m.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
