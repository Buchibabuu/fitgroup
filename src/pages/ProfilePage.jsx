import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getStoredAvatarDataUrl, setStoredAvatarDataUrl } from '../lib/avatarStorage';
import { getExerciseLinesForUi, parsePlanDay } from '../lib/planDay';
import { fetchGroup } from '../services/arena';
import { countCompletedWorkouts, countRestDaysLogged, fetchStreakRow } from '../services/progress';
import { fetchLeaderboard } from '../services/groups';
import { DAYS, fetchWorkoutPlans } from '../services/workoutPlans';
import { updateUserName } from '../services/users';

export default function ProfilePage() {
  const { firebaseUser, profile, refreshProfile, logout } = useAuth();
  const uid = firebaseUser?.uid;
  const fileRef = useRef(null);

  const [tab, setTab] = useState('plan');
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [streak, setStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [totalWorkouts, setTotalWorkouts] = useState(0);
  const [restDays, setRestDays] = useState(0);
  const [squadName, setSquadName] = useState('');
  const [squadRank, setSquadRank] = useState(null);
  const [plans, setPlans] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(profile?.name ?? '');
  }, [profile?.name]);

  useEffect(() => {
    if (!uid) return;
    setAvatar(getStoredAvatarDataUrl(uid) || profile?.avatar_url || null);
  }, [uid, profile?.avatar_url]);

  const loadAll = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const [row, total, rests, planData] = await Promise.all([
        fetchStreakRow(uid),
        countCompletedWorkouts(uid),
        countRestDaysLogged(uid),
        fetchWorkoutPlans(uid),
      ]);
      const cur = row?.current_streak ?? 0;
      const lng = row?.longest_streak ?? 0;
      setStreak(cur);
      setLongestStreak(Math.max(lng, cur));
      setTotalWorkouts(total);
      setRestDays(rests);
      setPlans(planData);

      if (profile?.group_id) {
        const [g, board] = await Promise.all([fetchGroup(profile.group_id), fetchLeaderboard(profile.group_id)]);
        setSquadName(g?.name ?? '');
        const mine = board.find((r) => r.userId === uid);
        setSquadRank(mine?.rank ?? null);
      } else {
        setSquadName('');
        setSquadRank(null);
      }
    } catch (e) {
      console.error(e);
      toast.error(e?.message || 'Could not load profile.');
    } finally {
      setLoading(false);
    }
  }, [uid, profile?.group_id]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  function onPickAvatar(e) {
    const file = e.target.files?.[0];
    if (!file || !uid) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (dataUrl.length > 1_200_000) {
        toast.error('Image is too large. Try a smaller photo.');
        return;
      }
      setAvatar(dataUrl);
      setStoredAvatarDataUrl(uid, dataUrl);
      toast.success('Photo updated.');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function saveName() {
    if (!uid) return;
    setSaving(true);
    try {
      await updateUserName(uid, name);
      await refreshProfile();
      toast.success('Name saved.');
    } catch (e) {
      toast.error(e?.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  if (!uid) return null;

  return (
    <div className="space-y-4 pb-6">
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-[#0a0a10] p-1 shadow-[0_0_40px_rgba(251,191,36,0.08)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(251,191,36,0.15),transparent_55%),radial-gradient(ellipse_at_100%_100%,rgba(168,85,247,0.12),transparent_50%)]" />
        <div className="relative rounded-[22px] border border-white/5 bg-black/40 p-5 backdrop-blur-md">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="group relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl border-2 border-amber-500/40 shadow-[0_0_24px_rgba(251,191,36,0.2)] transition active:scale-[0.98]"
            >
              {avatar ? (
                <img src={avatar} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-800 to-black text-4xl">
                  👤
                </div>
              )}
              <span className="absolute inset-x-0 bottom-0 bg-black/70 py-1 text-[9px] font-black uppercase tracking-widest text-amber-200 opacity-0 transition group-hover:opacity-100">
                Photo
              </span>
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickAvatar} />

            <div className="flex-1 text-center sm:text-left">
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-amber-500/90">Operative</p>
              <h1 className="mt-1 bg-gradient-to-r from-amber-100 via-white to-fuchsia-200 bg-clip-text text-2xl font-black tracking-tight text-transparent sm:text-3xl">
                {profile?.name || 'Unknown'}
              </h1>
              <p className="mt-1 truncate text-xs text-zinc-500">{profile?.email ?? firebaseUser?.email}</p>

              <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Squad</p>
                  <p className="text-sm font-black text-white">{squadName || '—'}</p>
                </div>
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-center">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-400/80">Rank</p>
                  <p className="text-sm font-black text-emerald-200">{squadRank != null ? `#${squadRank}` : '—'}</p>
                </div>
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-center">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-amber-200/80">Streak</p>
                  <p className="text-sm font-black text-amber-100">🔥 {loading ? '…' : streak}</p>
                </div>
                <div className="rounded-xl border border-fuchsia-500/25 bg-fuchsia-500/10 px-3 py-2 text-center">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-fuchsia-200/80">Wins</p>
                  <p className="text-sm font-black text-fuchsia-100">👑 {profile?.wins_count ?? 0}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 border-t border-white/10 pt-4">
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-zinc-500">Callsign</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm font-bold text-white outline-none focus:border-amber-500/50"
              />
              <button
                type="button"
                disabled={saving || !name.trim()}
                onClick={saveName}
                className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-3 text-sm font-black text-black shadow-lg shadow-amber-500/20 disabled:opacity-50"
              >
                Save
              </button>
            </div>
            <p className="mt-2 text-[10px] text-zinc-600">Avatar stored on this device. Email is from your account.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-800/50 to-transparent p-4 shadow-lg">
          <p className="text-[9px] font-black uppercase text-zinc-500">Workouts</p>
          <p className="mt-1 text-2xl font-black tabular-nums text-white">{loading ? '—' : totalWorkouts}</p>
        </div>
        <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-4 shadow-lg">
          <p className="text-[9px] font-black uppercase text-orange-300/80">Longest</p>
          <p className="mt-1 text-2xl font-black tabular-nums text-orange-100">{loading ? '—' : longestStreak}</p>
        </div>
        <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4 shadow-lg">
          <p className="text-[9px] font-black uppercase text-sky-300/80">Recovery</p>
          <p className="mt-1 text-2xl font-black tabular-nums text-sky-100">{loading ? '—' : restDays}</p>
        </div>
        <div className="rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/5 p-4 shadow-lg">
          <p className="text-[9px] font-black uppercase text-fuchsia-300/80">Arena</p>
          <p className="mt-1 text-2xl font-black tabular-nums text-fuchsia-100">👑 {profile?.wins_count ?? 0}</p>
        </div>
      </div>

      <div className="flex rounded-2xl border border-white/10 bg-black/40 p-1">
        {[
          { id: 'plan', label: 'Plan' },
          { id: 'stats', label: 'Stats' },
        ].map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex-1 rounded-xl py-3 text-xs font-black uppercase tracking-wider transition ${
              tab === id
                ? 'bg-gradient-to-r from-amber-500/30 to-fuchsia-500/20 text-white shadow-inner'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-zinc-500">Loading dossier…</p>
      ) : tab === 'plan' ? (
        <section className="space-y-2">
          {plans &&
            DAYS.map((day) => {
              const row = plans[day];
              const p = parsePlanDay(row?.exercises);
              const lines = getExerciseLinesForUi({ exercises: p });
              return (
                <div
                  key={day}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-md"
                >
                  <p className="text-xs font-black uppercase tracking-wide text-amber-200/90">{day}</p>
                  {p.rest ? (
                    <p className="mt-2 text-sm text-sky-200/90">❄️ Rest day</p>
                  ) : lines.length ? (
                    <ul className="mt-2 space-y-1">
                      {lines.map((l, i) => (
                        <li key={i} className="text-sm text-zinc-300">
                          {l}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-zinc-600">No exercises</p>
                  )}
                </div>
              );
            })}
        </section>
      ) : (
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md">
          <p className="text-sm font-bold text-white">Combat record</p>
          <div className="mt-4 space-y-3">
            <div className="flex justify-between border-b border-white/5 py-2 text-sm">
              <span className="text-zinc-500">Total workouts</span>
              <span className="font-bold text-white">{totalWorkouts}</span>
            </div>
            <div className="flex justify-between border-b border-white/5 py-2 text-sm">
              <span className="text-zinc-500">Recovery days logged</span>
              <span className="font-bold text-white">{restDays}</span>
            </div>
            <div className="flex justify-between border-b border-white/5 py-2 text-sm">
              <span className="text-zinc-500">Current streak</span>
              <span className="font-bold text-amber-200">🔥 {streak}</span>
            </div>
            <div className="flex justify-between py-2 text-sm">
              <span className="text-zinc-500">Longest streak</span>
              <span className="font-bold text-orange-200">{longestStreak}</span>
            </div>
          </div>
        </section>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Link
          to="/plan"
          className="flex-1 rounded-2xl border border-white/15 bg-white/5 py-3 text-center text-sm font-black text-white transition hover:bg-white/10"
        >
          Edit training plan
        </Link>
        <Link
          to="/group"
          className="flex-1 rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/10 py-3 text-center text-sm font-black text-fuchsia-100 transition hover:bg-fuchsia-500/20"
        >
          Weekly Arena
        </Link>
      </div>

      <button
        type="button"
        onClick={() => logout()}
        className="w-full rounded-2xl border border-red-500/30 bg-red-500/10 py-3 text-sm font-black uppercase tracking-wide text-red-200 transition hover:bg-red-500/20"
      >
        Sign out
      </button>
    </div>
  );
}
