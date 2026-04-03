import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import RunTrackerCard from '../components/RunTrackerCard';
import { useAuth } from '../hooks/useAuth';
import { formatMmSsShort } from '../lib/formatMmSs';
import { formatPaceMinPerKm, formatRunSummary } from '../lib/runDisplay';
import { fetchGroup } from '../services/arena';
import { todayLocal } from '../services/progress';
import {
  fetchGroupRunLeaderboard,
  fetchRunForDate,
  fetchRunHistory,
  HISTORY_DISTANCE_FILTERS,
  MIN_TIME_SECONDS,
} from '../services/runs';

function formatHistoryDate(ymd) {
  const [y, m, d] = ymd.split('-').map((x) => parseInt(x, 10));
  if (!y || !m || !d) return ymd;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function pickBestPace(rows) {
  if (!rows?.length) return null;
  return rows.reduce((best, r) => {
    if (!best || Number(r.pace_per_km) < Number(best.pace_per_km)) return r;
    return best;
  }, null);
}

export default function RunPage() {
  const { firebaseUser, profile } = useAuth();
  const uid = firebaseUser?.uid;
  const today = todayLocal();
  const [board, setBoard] = useState([]);
  const [myRun, setMyRun] = useState(null);
  const [history, setHistory] = useState([]);
  const [distanceFilter, setDistanceFilter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [squadName, setSquadName] = useState('');

  const load = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const [mine, hist, boardResult, groupRow] = await Promise.all([
        fetchRunForDate(uid, today),
        fetchRunHistory(uid, 250),
        profile?.group_id
          ? fetchGroupRunLeaderboard(profile.group_id, today, uid)
          : Promise.resolve([]),
        profile?.group_id ? fetchGroup(profile.group_id) : Promise.resolve(null),
      ]);
      const validMine =
        mine?.distance_m > 100 &&
        mine?.pace_per_km != null &&
        mine.time_seconds >= MIN_TIME_SECONDS
          ? mine
          : null;
      setMyRun(validMine);
      setHistory(hist);
      setBoard(boardResult);
      setSquadName(groupRow?.name?.trim() || '');
    } catch (e) {
      console.error(e);
      toast.error(e?.message || 'Could not load runs.');
    } finally {
      setLoading(false);
    }
  }, [uid, today, profile?.group_id]);

  useEffect(() => {
    load();
  }, [load]);

  const personalBest = useMemo(() => pickBestPace(history), [history]);

  const filteredHistory = useMemo(() => {
    if (distanceFilter == null) return history;
    return history.filter((r) => r.distance_m === distanceFilter);
  }, [history, distanceFilter]);

  const bestAtFilter = useMemo(() => {
    if (distanceFilter == null) return null;
    return pickBestPace(history.filter((r) => r.distance_m === distanceFilter));
  }, [history, distanceFilter]);

  const myRank = useMemo(() => board.find((r) => r.isYou)?.rank ?? null, [board]);
  const hasLogged = !!myRun;

  const statusBanner = useMemo(() => {
    if (!profile?.group_id) {
      return {
        tone: 'neutral',
        title: 'Solo mode',
        body: "Log runs here anytime. Join a squad to see today's squad-only pace board.",
      };
    }
    if (!hasLogged) {
      return {
        tone: 'amber',
        title: "You haven't logged your run",
        body: 'Add distance, time, and save to show up for your squad today.',
      };
    }
    if (board.length === 0) {
      return {
        tone: 'cyan',
        title: 'On the board',
        body: 'Waiting for more squad members to log a run today.',
      };
    }
    if (myRank === 1) {
      return {
        tone: 'emerald',
        title: 'You are leading',
        body: 'Lowest min/km among squad members — defend it until midnight.',
      };
    }
    return {
      tone: 'amber',
      title: 'Someone is faster than you',
        body: 'Another member has a better min/km today — beat their pace and save.',
    };
  }, [profile?.group_id, hasLogged, board.length, myRank]);

  const toneClass = {
    neutral: 'border-white/10 bg-white/[0.04] text-zinc-200',
    amber: 'border-amber-500/35 bg-amber-500/10 text-amber-50',
    cyan: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-50',
    emerald: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-50',
  }[statusBanner.tone];

  if (!uid) return null;

  return (
    <div className="space-y-5 pb-2">
      <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-surface-card/70 p-5 shadow-lg backdrop-blur-md">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-sky-500/10" />
        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-200/80">Track</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-white">Run</h1>
          <p className="mt-1 text-sm text-zinc-400">Meters, time, pace — history and personal bests.</p>
        </div>
      </header>

      <section className="relative overflow-hidden rounded-3xl border border-amber-500/25 bg-gradient-to-br from-amber-500/15 via-[#12121a] to-[#12121a] p-5 shadow-[0_0_32px_rgba(251,191,36,0.12)]">
        <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-amber-400/15 blur-2xl" />
        <div className="relative">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-200/90">Personal best</p>
          <p className="mt-1 text-xs text-amber-100/70">Lowest min/km across all logged runs</p>
          {personalBest ? (
            <>
              <p className="mt-3 text-lg font-black leading-snug text-white">{formatRunSummary(personalBest)}</p>
              <p className="mt-1 text-xs text-zinc-500">{formatHistoryDate(personalBest.date)}</p>
            </>
          ) : (
            <p className="mt-3 text-sm font-semibold text-zinc-400">Log a run to set your first PR.</p>
          )}
        </div>
      </section>

      <div className={`rounded-2xl border px-4 py-3 ${toneClass}`}>
        <p className="text-sm font-black">{statusBanner.title}</p>
        <p className="mt-1 text-xs font-medium opacity-90">{statusBanner.body}</p>
        {!profile?.group_id ? (
          <Link
            to="/group"
            className="mt-3 inline-flex rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-4 py-2 text-xs font-extrabold text-white"
          >
            Open Squad
          </Link>
        ) : null}
      </div>

      <RunTrackerCard userId={uid} dateYmd={today} onSaved={load} />

      <section className="overflow-hidden rounded-3xl border border-white/10 bg-surface-card/80 p-4 shadow-xl backdrop-blur-md sm:p-5">
        <h2 className="text-lg font-black text-white">Squad · Today&apos;s fastest</h2>
        <p className="mt-0.5 text-xs text-zinc-500">
          {profile?.group_id
            ? `${squadName ? `${squadName} · ` : ''}Squad members only · ranked by lowest min/km today`
            : 'Join a squad to see member rankings'}
        </p>

        {loading ? (
          <p className="mt-6 text-center text-sm text-zinc-500">Loading leaderboard…</p>
        ) : !profile?.group_id ? (
          <p className="mt-4 text-sm leading-relaxed text-zinc-400">
            This board only includes people in your squad. Join one on the Squad tab, then log a run here.
          </p>
        ) : board.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-400">
            No squad member has a qualifying run logged for today yet.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-white/5">
            <table className="w-full min-w-[300px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-black uppercase tracking-wider text-zinc-500">
                  <th className="px-3 py-2.5">Rank</th>
                  <th className="px-3 py-2.5">Name</th>
                  <th className="px-3 py-2.5 text-right">Distance</th>
                  <th className="px-3 py-2.5 text-right">Time</th>
                  <th className="px-3 py-2.5 text-right">Pace</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {board.map((r) => (
                  <tr
                    key={r.userId}
                    className={r.isYou ? 'bg-cyan-500/[0.08]' : 'hover:bg-white/[0.02]'}
                  >
                    <td className="px-3 py-3 font-black tabular-nums text-zinc-400">#{r.rank}</td>
                    <td className="px-3 py-3 font-bold text-white">{r.isYou ? 'You' : r.name}</td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums text-zinc-300">{r.distance_m}m</td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums text-zinc-200">
                      {formatMmSsShort(r.time_seconds)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-sm font-bold text-cyan-200/95">
                      {formatPaceMinPerKm(r.pace_per_km)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-3xl border border-white/10 bg-surface-card/80 p-4 shadow-xl backdrop-blur-md sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-white">Run history</h2>
            <p className="mt-0.5 text-xs text-zinc-500">Latest first</p>
            {distanceFilter != null && bestAtFilter ? (
              <p className="mt-2 text-xs font-semibold text-cyan-200/90">
                Best at {distanceFilter}m: {formatPaceMinPerKm(bestAtFilter.pace_per_km)} min/km
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setDistanceFilter(null)}
              className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wide transition ${
                distanceFilter == null
                  ? 'bg-cyan-500/25 text-cyan-100 ring-1 ring-cyan-400/40'
                  : 'border border-white/10 bg-white/5 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              All
            </button>
            {HISTORY_DISTANCE_FILTERS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDistanceFilter(d)}
                className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wide transition ${
                  distanceFilter === d
                    ? 'bg-cyan-500/25 text-cyan-100 ring-1 ring-cyan-400/40'
                    : 'border border-white/10 bg-white/5 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {d}m
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="mt-6 text-center text-sm text-zinc-500">Loading history…</p>
        ) : filteredHistory.length === 0 ? (
          <p className="mt-6 text-center text-sm text-zinc-500">
            {distanceFilter != null ? `No ${distanceFilter}m runs yet.` : 'No runs logged yet.'}
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {filteredHistory.map((r) => (
              <li
                key={`${r.date}-${r.distance_m}-${r.time_seconds}`}
                className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-zinc-500">{formatHistoryDate(r.date)}</p>
                  <p className="mt-1 font-mono text-sm font-semibold text-white">
                    {r.distance_m}m · {formatMmSsShort(r.time_seconds)} ·{' '}
                    <span className="text-cyan-200/95">{formatPaceMinPerKm(r.pace_per_km)}</span>
                  </p>
                </div>
                {personalBest &&
                Math.abs(Number(r.pace_per_km) - Number(personalBest.pace_per_km)) < 1e-6 ? (
                  <span className="shrink-0 self-start rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-200 sm:self-center">
                    PR pace
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
