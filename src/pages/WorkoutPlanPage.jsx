import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { getWeekDateStringsForDayNames } from '../lib/weekDates';
import { normalizeItem, parsePlanDay, totalVolume } from '../lib/planDay';
import { fetchProgressRange, todayLocal } from '../services/progress';
import { DAYS, fetchWorkoutPlans, saveWeeklyPlan } from '../services/workoutPlans';

function dayIndexFromToday() {
  const js = new Date().getDay();
  return js === 0 ? 6 : js - 1;
}

function restCount(map) {
  return DAYS.reduce((n, d) => n + (map[d]?.rest ? 1 : 0), 0);
}

function restCountExcluding(map, dayName) {
  return DAYS.reduce((n, d) => n + (d === dayName ? 0 : map[d]?.rest ? 1 : 0), 0);
}

export default function WorkoutPlanPage() {
  const { firebaseUser } = useAuth();
  const uid = firebaseUser?.uid;
  const todayStr = todayLocal();

  const [dayMap, setDayMap] = useState(null);
  const [initialSnap, setInitialSnap] = useState('');
  const [activeIdx, setActiveIdx] = useState(dayIndexFromToday);
  const [weekProgress, setWeekProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingRestDay, setPendingRestDay] = useState(null);

  const weekDates = useMemo(() => getWeekDateStringsForDayNames(new Date()), []);

  const load = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const byDay = await fetchWorkoutPlans(uid);
      const m = {};
      for (const d of DAYS) {
        const parsed = parsePlanDay(byDay[d]?.exercises);
        m[d] = {
          rest: parsed.rest,
          items: parsed.items.map((it) => ({ ...it })),
        };
      }
      setDayMap(m);
      setInitialSnap(JSON.stringify(m));
      const from = weekDates.Monday;
      const to = weekDates.Sunday;
      const prog = await fetchProgressRange(uid, from, to);
      setWeekProgress(prog);
    } catch (e) {
      toast.error(e?.message || 'Could not load plan.');
    } finally {
      setLoading(false);
    }
  }, [uid, weekDates]);

  useEffect(() => {
    load();
  }, [load]);

  const dirty = useMemo(() => (dayMap ? JSON.stringify(dayMap) !== initialSnap : false), [dayMap, initialSnap]);

  const activeDay = DAYS[activeIdx];
  const active = dayMap?.[activeDay];

  const hasAnyPlan = useMemo(() => {
    if (!dayMap) return false;
    return DAYS.some((d) => dayMap[d].rest || dayMap[d].items.some((i) => i.name.trim()));
  }, [dayMap]);

  function goPrev() {
    setActiveIdx((i) => (i + 6) % 7);
  }

  function goNext() {
    setActiveIdx((i) => (i + 1) % 7);
  }

  function requestRestToggle(day) {
    if (!dayMap) return;
    const cur = dayMap[day];
    if (cur.rest) {
      setDayMap((prev) => ({
        ...prev,
        [day]: { rest: false, items: prev[day].items.length ? prev[day].items : [normalizeItem({ name: 'Exercise' }, 0)] },
      }));
      return;
    }
    if (restCountExcluding(dayMap, day) >= 3) {
      setPendingRestDay(day);
      setModalOpen(true);
      return;
    }
    setDayMap((prev) => ({ ...prev, [day]: { rest: true, items: [] } }));
  }

  function confirmRestModal() {
    if (!pendingRestDay) return;
    const d = pendingRestDay;
    setDayMap((prev) => ({ ...prev, [d]: { rest: true, items: [] } }));
    setModalOpen(false);
    setPendingRestDay(null);
  }

  function cancelRestModal() {
    setModalOpen(false);
    setPendingRestDay(null);
  }

  function updateItem(day, id, patch) {
    setDayMap((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        items: prev[day].items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
      },
    }));
  }

  function addExercise(day) {
    setDayMap((prev) => {
      const list = prev[day].items;
      const next = normalizeItem({ name: 'New exercise', sets: 3, reps: 10 }, list.length);
      return {
        ...prev,
        [day]: { ...prev[day], rest: false, items: [...list, next] },
      };
    });
  }

  function removeExercise(day, id) {
    setDayMap((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        items: prev[day].items.filter((it) => it.id !== id),
      },
    }));
  }

  async function handleSave() {
    if (!uid || !dayMap) return;
    setSaving(true);
    try {
      await saveWeeklyPlan(uid, dayMap);
      setInitialSnap(JSON.stringify(dayMap));
      toast.success('Plan saved.');
      await load();
    } catch (e) {
      toast.error(e?.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  if (loading || !dayMap || !active) {
    return (
      <div className="rounded-3xl border border-white/10 bg-surface-card/60 p-8 text-center text-sm text-zinc-400 backdrop-blur">
        Loading plan…
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-surface-card/70 p-5 shadow-2xl backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/15 via-transparent to-indigo-500/10" />
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200/80">Training map</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-white">Weekly plan</h1>
            <p className="mt-1 text-sm text-zinc-400">One day at a time. Tap a day, build the session.</p>
          </div>
          <button
            type="button"
            disabled={!dirty || saving}
            onClick={handleSave}
            className="rounded-2xl bg-gradient-to-r from-emerald-500 to-accent px-4 py-2.5 text-xs font-extrabold text-black shadow-lg shadow-emerald-500/15 transition hover:brightness-105 active:scale-[0.98] disabled:opacity-40"
          >
            {saving ? 'Saving…' : dirty ? 'Save plan' : 'Saved'}
          </button>
        </div>
      </header>

      {!hasAnyPlan ? (
        <div className="rounded-3xl border border-amber-500/25 bg-amber-500/5 p-5 shadow-lg backdrop-blur-md">
          <p className="text-base font-bold text-amber-100">No plan set ⚠️</p>
          <p className="mt-2 text-sm leading-relaxed text-amber-100/75">Discipline starts with a plan</p>
        </div>
      ) : null}

      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {DAYS.map((d, i) => {
          const sel = i === activeIdx;
          const prog = weekProgress[weekDates[d]];
          const dm = dayMap[d];
          const has = dm.rest || dm.items.some((x) => x.name.trim());
          return (
            <button
              key={d}
              type="button"
              onClick={() => setActiveIdx(i)}
              className={`min-w-[3.25rem] shrink-0 rounded-2xl border px-3 py-2 text-center text-[11px] font-bold transition ${
                sel
                  ? 'scale-105 border-emerald-400/40 bg-emerald-500/15 text-white shadow-[0_0_18px_rgba(16,185,129,0.25)]'
                  : 'border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10'
              }`}
            >
              <div>{d.slice(0, 3)}</div>
              {prog?.completed ? <div className="mt-0.5 text-[10px]">✓</div> : null}
              {dm.rest ? <div className="mt-0.5 text-[10px]">❄️</div> : null}
              {!has && !dm.rest ? <div className="mt-0.5 text-[10px] opacity-50">·</div> : null}
            </button>
          );
        })}
      </div>

      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-surface-card/60 p-4 shadow-2xl backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent" />
        <div className="relative flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={goPrev}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-lg text-white transition hover:bg-white/10 active:scale-95"
            aria-label="Previous day"
          >
            ‹
          </button>
          <div className="min-w-0 flex-1 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Selected</p>
            <p className="truncate text-xl font-black text-white">{activeDay}</p>
            <p className="text-[11px] text-zinc-500">{weekDates[activeDay]}</p>
          </div>
          <button
            type="button"
            onClick={goNext}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-lg text-white transition hover:bg-white/10 active:scale-95"
            aria-label="Next day"
          >
            ›
          </button>
        </div>

        <div className="relative mt-5 rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur-md">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-bold text-white">Rest Day ❄️</span>
            <button
              type="button"
              role="switch"
              aria-checked={active.rest}
              onClick={() => requestRestToggle(activeDay)}
              className={`relative h-9 w-16 shrink-0 rounded-full border transition ${
                active.rest ? 'border-sky-400/40 bg-sky-500/25' : 'border-white/10 bg-white/5'
              }`}
            >
              <span
                className={`absolute top-1 h-7 w-7 rounded-full bg-white shadow transition ${
                  active.rest ? 'left-8' : 'left-1'
                }`}
              />
            </button>
          </div>
          {active.rest ? (
            <p className="mt-3 text-sm leading-relaxed text-sky-100/85">
              Recovery day — consistency still counts
            </p>
          ) : null}
          <p className="mt-2 text-[11px] text-zinc-500">
            Max 3 rest days / week ({restCount(dayMap)}/3). More than 3 consecutive logged rest days can break your
            streak.
          </p>
        </div>

        <div
          className={`relative mt-4 space-y-3 transition-opacity duration-200 ${
            active.rest ? 'pointer-events-none opacity-40' : ''
          }`}
        >
          {active.items.map((it) => (
            <div
              key={it.id}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-lg backdrop-blur-md transition-all duration-200"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <input
                  value={it.name}
                  disabled={active.rest}
                  onChange={(e) => updateItem(activeDay, it.id, { name: e.target.value })}
                  placeholder="Exercise name"
                  className="w-full rounded-xl border border-white/10 bg-[#0c0c12] px-3 py-2.5 text-sm font-semibold text-white outline-none focus:border-emerald-400/40 disabled:opacity-50"
                />
                <button
                  type="button"
                  disabled={active.rest}
                  onClick={() => removeExercise(activeDay, it.id)}
                  className="shrink-0 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-200 transition hover:bg-red-500/20 active:scale-95 disabled:opacity-40"
                >
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <label className="block">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Sets</span>
                  <input
                    type="number"
                    min={1}
                    disabled={active.rest}
                    value={it.sets}
                    onChange={(e) =>
                      updateItem(activeDay, it.id, { sets: Math.max(1, Number(e.target.value) || 1) })
                    }
                    className="mt-1 w-full rounded-xl border border-white/10 bg-[#0c0c12] px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/40 disabled:opacity-50"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Reps</span>
                  <input
                    type="number"
                    min={1}
                    disabled={active.rest}
                    value={it.reps}
                    onChange={(e) =>
                      updateItem(activeDay, it.id, { reps: Math.max(1, Number(e.target.value) || 1) })
                    }
                    className="mt-1 w-full rounded-xl border border-white/10 bg-[#0c0c12] px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/40 disabled:opacity-50"
                  />
                </label>
                <div className="col-span-2 flex flex-col justify-end sm:col-span-1">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Total reps</span>
                  <div className="mt-1 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-center text-sm font-black tabular-nums text-emerald-100">
                    {totalVolume(it)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {!active.rest ? (
          <button
            type="button"
            onClick={() => addExercise(activeDay)}
            className="relative mt-4 w-full rounded-2xl border border-dashed border-white/20 bg-white/[0.03] py-3 text-sm font-extrabold text-zinc-200 transition hover:border-emerald-400/30 hover:bg-emerald-500/10 active:scale-[0.99]"
          >
            + Add Exercise
          </button>
        ) : null}
      </section>

      {modalOpen ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 p-4 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-md rounded-3xl border border-amber-500/30 bg-[#12121a] p-6 shadow-2xl shadow-amber-500/10">
            <p className="text-lg font-black text-white">⚠️ Heads up</p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-300">
              You selected more than 3 rest days. This can make it harder to keep momentum — and more than 3{' '}
              <span className="font-semibold text-amber-200">consecutive logged</span> rest days will break your streak.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={cancelRestModal}
                className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-bold text-zinc-200 transition hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRestModal}
                className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 text-sm font-extrabold text-black shadow-lg transition hover:brightness-105"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
