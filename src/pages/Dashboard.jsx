import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import StreakPanel from '../components/StreakPanel';
import TodaysBattleCard from '../components/TodaysBattleCard';
import { getDailyMotivation } from '../lib/dailyMotivation';
import { getStreakDisplayState } from '../lib/streakDisplay';
import { useAuth } from '../hooks/useAuth';
import {
  fetchProgressForStreak,
  syncStreakFromProgress,
  todayLocal,
  upsertProgress,
} from '../services/progress';
import { fetchWorkoutPlans } from '../services/workoutPlans';
import { countWorkoutItems, isPlanRestDay } from '../lib/planDay';

function dayNameFromDate(d) {
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()];
}

export default function Dashboard() {
  const { firebaseUser, profile } = useAuth();
  const uid = firebaseUser?.uid;
  const today = todayLocal();
  const [streak, setStreak] = useState(0);
  const [todayRow, setTodayRow] = useState(null);
  const [todayPlan, setTodayPlan] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const motivation = useMemo(() => getDailyMotivation(new Date()), []);

  const load = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const progressMap = await fetchProgressForStreak(uid, today);
      const { currentStreak } = await syncStreakFromProgress(uid, progressMap, today);
      setStreak(currentStreak);
      setTodayRow(progressMap[today] ?? null);

      const plans = await fetchWorkoutPlans(uid);
      const dow = dayNameFromDate(new Date());
      setTodayPlan(plans[dow] ?? { exercises: [] });

    } catch (e) {
      console.error(e);
      toast.error(e?.message || 'Could not load dashboard.');
    } finally {
      setLoading(false);
    }
  }, [uid, today]);

  useEffect(() => {
    load();
  }, [load]);

  const display = useMemo(() => getStreakDisplayState(streak, todayRow), [streak, todayRow]);

  const exercisesCount = useMemo(() => countWorkoutItems(todayPlan), [todayPlan]);
  const planDayRest = useMemo(() => isPlanRestDay(todayPlan), [todayPlan]);

  const { completionPct, completionHint, statusLabel } = useMemo(() => {
    const completed = !!todayRow?.completed;
    const rest = !!todayRow?.rest_day;

    if (planDayRest && !completed && !rest) {
      return {
        completionPct: 0,
        completionHint: 'Planned rest · log it',
        statusLabel: 'Rest planned',
      };
    }

    if (exercisesCount <= 0 && !planDayRest) {
      if (completed) {
        return {
          completionPct: 100,
          completionHint: '100% · Battle won',
          statusLabel: 'Completed',
        };
      }
      if (rest) {
        return {
          completionPct: 100,
          completionHint: '100% · Recovery',
          statusLabel: 'Rest day',
        };
      }
      return {
        completionPct: 0,
        completionHint: 'No targets set',
        statusLabel: 'Not started',
      };
    }

    if (completed) {
      return {
        completionPct: 100,
        completionHint: '100% · Battle won',
        statusLabel: 'Completed',
      };
    }

    if (rest) {
      return {
        completionPct: 100,
        completionHint: '100% · Recovery',
        statusLabel: 'Rest day',
      };
    }

    return {
      completionPct: 0,
      completionHint: `0 / ${exercisesCount} exercises`,
      statusLabel: 'Not started',
    };
  }, [todayRow, exercisesCount, planDayRest]);

  const { battleEmoji, battleSubtitle } = useMemo(() => {
    const completed = !!todayRow?.completed;
    const rest = !!todayRow?.rest_day;

    if (completed) {
      return {
        battleEmoji: '✅',
        battleSubtitle: 'Victory logged. Carry this energy into tomorrow.',
      };
    }
    if (rest) {
      return {
        battleEmoji: '❄️',
        battleSubtitle: 'Recovery is part of the process. Your streak stays on ice.',
      };
    }
    if (planDayRest) {
      return {
        battleEmoji: '❄️',
        battleSubtitle: 'Recovery day — consistency still counts. Log it when you’re ready.',
      };
    }
    if (exercisesCount <= 0) {
      return {
        battleEmoji: '⚠️',
        battleSubtitle: 'No targets yet — set your plan and make today measurable.',
      };
    }
    return {
      battleEmoji: '⚔️',
      battleSubtitle: motivation,
    };
  }, [todayRow, exercisesCount, motivation, planDayRest]);

  async function markCompleted() {
    if (!uid) return;
    setBusy(true);
    try {
      await upsertProgress(uid, today, { completed: true, rest_day: false });
      toast.success('🔥 Streak +1');
      await load();
    } catch (e) {
      toast.error(e?.message || 'Could not save.');
    } finally {
      setBusy(false);
    }
  }

  async function markRest() {
    if (!uid) return;
    setBusy(true);
    try {
      await upsertProgress(uid, today, { completed: false, rest_day: true });
      toast.success('❄️ Recovery logged');
      await load();
    } catch (e) {
      toast.error(e?.message || 'Could not save.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-surface-card/60 p-8 text-center text-sm text-zinc-400 backdrop-blur">
        Loading your battle…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-surface-card/60 p-4 shadow-lg backdrop-blur">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-fuchsia-500/10 via-transparent to-emerald-500/10" />
        <p className="relative text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Daily drive</p>
        <p className="relative mt-2 text-sm font-semibold leading-relaxed text-zinc-200">{motivation}</p>
      </section>

      <StreakPanel streak={streak} display={display} />

      <TodaysBattleCard
        todayLabel={today}
        dayName={dayNameFromDate(new Date())}
        todayPlan={todayPlan}
        todayRow={todayRow}
        statusLabel={statusLabel}
        completionPct={completionPct}
        completionHint={completionHint}
        battleEmoji={battleEmoji}
        battleSubtitle={battleSubtitle}
        onMarkDone={markCompleted}
        onMarkRest={markRest}
        busy={busy}
      />

      {!profile?.group_id ? (
        <section className="relative overflow-hidden rounded-3xl border border-fuchsia-500/25 bg-surface-card/80 p-5 shadow-xl backdrop-blur-md">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-fuchsia-500/15 via-transparent to-indigo-500/10" />
          <div className="relative">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-fuchsia-200/80">Squad</p>
            <h2 className="mt-1 text-lg font-black text-white">Enter the Weekly Arena</h2>
            <p className="mt-1 text-sm text-zinc-400">Train with a crew. Compete on streaks every week.</p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Link
                to="/group"
                className="flex-1 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-indigo-500 py-3 text-center text-sm font-extrabold text-white shadow-lg shadow-fuchsia-500/20 transition active:scale-[0.98]"
              >
                Join Squad
              </Link>
              <Link
                to="/group"
                className="flex-1 rounded-2xl border border-white/15 bg-white/5 py-3 text-center text-sm font-extrabold text-white transition hover:bg-white/10 active:scale-[0.98]"
              >
                Create Squad
              </Link>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
