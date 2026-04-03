import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getStoredAvatarDataUrl } from '../lib/avatarStorage';
import { getExerciseLinesForUi, parsePlanDay } from '../lib/planDay';
import { fetchMemberPublicProfile } from '../services/memberProfile';
import { DAYS } from '../services/workoutPlans';

function Avatar({ userId, url, name, size = 56 }) {
  const local = userId ? getStoredAvatarDataUrl(userId) : null;
  const src = local || url;
  const initial = (name || '?').slice(0, 1).toUpperCase();
  if (src) {
    return (
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        className="rounded-2xl border border-white/10 object-cover shadow-lg"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="flex items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-700 to-zinc-900 text-lg font-black text-white shadow-lg"
      style={{ width: size, height: size }}
    >
      {initial}
    </div>
  );
}

export default function SquadMemberModal({ userId, open, onClose }) {
  const [tab, setTab] = useState('stats');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !userId) return;
    setTab('stats');
    setLoading(true);
    setData(null);
    fetchMemberPublicProfile(userId)
      .then(setData)
      .catch((e) => {
        console.error(e);
        toast.error(e?.message || 'Could not load profile.');
      })
      .finally(() => setLoading(false));
  }, [open, userId]);

  if (!open) return null;

  const u = data?.user;

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-label="Close" />
      <div className="relative z-10 max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/10 bg-[#0e0e14] shadow-2xl sm:rounded-3xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-white/10 bg-[#0e0e14]/95 px-4 py-3 backdrop-blur-md">
          <p className="text-sm font-bold text-white">Rival profile</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-3 py-1.5 text-sm font-semibold text-zinc-400 transition hover:bg-white/5 hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="p-4">
          {loading ? (
            <p className="py-8 text-center text-sm text-zinc-500">Loading…</p>
          ) : !u ? (
            <p className="py-8 text-center text-sm text-zinc-500">No data.</p>
          ) : (
            <>
              <div className="flex items-center gap-4">
                <Avatar userId={userId} url={u.avatar_url} name={u.name} size={72} />
                <div className="min-w-0">
                  <h2 className="text-xl font-black text-white">{u.name || u.email}</h2>
                  <p className="truncate text-xs text-zinc-500">{u.email}</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center backdrop-blur">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Streak</p>
                  <p className="mt-1 text-xl font-black text-amber-200">🔥 {data.currentStreak}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center backdrop-blur">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Best</p>
                  <p className="mt-1 text-xl font-black text-white">{data.longestStreak}</p>
                </div>
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-center backdrop-blur">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-amber-200/80">Wins</p>
                  <p className="mt-1 text-xl font-black text-amber-100">👑 {data.winsCount}</p>
                </div>
              </div>

              <div className="mt-4 flex rounded-2xl border border-white/10 bg-black/30 p-1">
                {['stats', 'plan'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={`flex-1 rounded-xl py-2.5 text-xs font-extrabold capitalize transition ${
                      tab === t ? 'bg-white/10 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {tab === 'stats' ? (
                <div className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Workouts logged</span>
                    <span className="font-bold text-white">{data.completedWorkouts}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Recovery days</span>
                    <span className="font-bold text-white">{data.restDays}</span>
                  </div>
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  {DAYS.map((day) => {
                    const row = data.plans?.[day];
                    const p = parsePlanDay(row?.exercises);
                    const lines = getExerciseLinesForUi({ exercises: p });
                    return (
                      <div
                        key={day}
                        className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur"
                      >
                        <p className="text-xs font-bold text-emerald-200/90">{day}</p>
                        {p.rest ? (
                          <p className="mt-1 text-sm text-sky-200/90">❄️ Rest day</p>
                        ) : lines.length ? (
                          <ul className="mt-2 space-y-1">
                            {lines.map((l, i) => (
                              <li key={i} className="text-sm text-zinc-300">
                                {l}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-1 text-sm text-zinc-500">No exercises set</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
