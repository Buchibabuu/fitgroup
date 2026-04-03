import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import SquadMemberModal from '../components/SquadMemberModal';
import { getStoredAvatarDataUrl } from '../lib/avatarStorage';
import { mondayYmd } from '../lib/arenaWeek';
import { fetchGroup, maybeFinalizeWeeklyArena } from '../services/arena';
import {
  createGroup,
  deleteGroupAsAdmin,
  fetchLeaderboard,
  joinGroupByCode,
  leaveGroup,
  regenerateInviteCode,
  removeMemberAsAdmin,
} from '../services/groups';
import { fetchUserById } from '../services/users';
import { useAuth } from '../hooks/useAuth';

function MemberAvatar({ userId, avatarUrl, name, size = 48, ring = '' }) {
  const local = userId ? getStoredAvatarDataUrl(userId) : null;
  const src = local || avatarUrl;
  const ch = (name || '?').slice(0, 1).toUpperCase();
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={`rounded-2xl border border-white/10 object-cover ${ring}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className={`flex items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-700 to-zinc-900 text-sm font-black text-white ${ring}`}
      style={{ width: size, height: size }}
    >
      {ch}
    </div>
  );
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  } catch {
    toast.error('Could not copy');
  }
}

export default function GroupPage() {
  const { firebaseUser, profile, refreshProfile } = useAuth();
  const uid = firebaseUser?.uid;
  const groupId = profile?.group_id ?? null;

  const [group, setGroup] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState('');
  const [squadName, setSquadName] = useState('My Squad');
  const [busy, setBusy] = useState(false);
  const [createdCode, setCreatedCode] = useState('');
  const [winnerName, setWinnerName] = useState('');
  const [memberModal, setMemberModal] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const arenaSubtitle = useMemo(() => {
    const sun = new Date();
    const d = sun.getDay();
    const daysToSun = d === 0 ? 0 : 7 - d;
    sun.setDate(sun.getDate() + daysToSun);
    return `Week ends ${sun.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}`;
  }, []);

  const load = useCallback(async () => {
    if (!uid || !groupId) {
      setGroup(null);
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      let g = await fetchGroup(groupId);
      setGroup(g);
      const fin = await maybeFinalizeWeeklyArena(groupId, uid);
      if (fin.youWon) toast.success('👑 You topped this week');
      g = await fetchGroup(groupId);
      setGroup(g);

      const list = await fetchLeaderboard(groupId);
      setRows(list);

      const key = `arena_rank_${groupId}_${uid}`;
      const prev = sessionStorage.getItem(key);
      const mine = list.find((r) => r.userId === uid);
      if (prev != null && mine != null && mine.rank > Number(prev)) {
        toast('⚠️ Someone overtook you', { duration: 4200 });
      }
      if (mine != null) sessionStorage.setItem(key, String(mine.rank));
    } catch (e) {
      console.error(e);
      toast.error(e?.message || 'Could not load arena.');
    } finally {
      setLoading(false);
    }
  }, [uid, groupId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!group?.last_winner_user_id) {
      setWinnerName('');
      return;
    }
    fetchUserById(group.last_winner_user_id)
      .then((u) => setWinnerName(u?.name || u?.email?.split('@')[0] || 'Champion'))
      .catch(() => setWinnerName('Champion'));
  }, [group?.last_winner_user_id]);

  const myRank = useMemo(() => rows.find((r) => r.userId === uid)?.rank ?? null, [rows, uid]);
  const isAdmin = useMemo(() => group?.admin_id === uid, [group?.admin_id, uid]);

  const top3 = useMemo(() => rows.slice(0, 3), [rows]);

  const podiumOrder = useMemo(() => {
    if (top3.length === 0) return [];
    if (top3.length === 1) return [top3[0]];
    if (top3.length === 2) return [top3[1], top3[0]];
    return [top3[1], top3[0], top3[2]];
  }, [top3]);

  async function handleJoin() {
    if (!uid) return;
    const code = invite.trim().toUpperCase();
    if (code.length < 4) {
      toast.error('Enter a valid invite code');
      return;
    }
    setBusy(true);
    try {
      await joinGroupByCode(uid, code);
      toast.success('You joined the squad');
      setInvite('');
      await refreshProfile();
      await load();
    } catch (e) {
      toast.error(e?.message || 'Could not join.');
    } finally {
      setBusy(false);
    }
  }

  async function handleCreate() {
    if (!uid) return;
    setBusy(true);
    try {
      const g = await createGroup(uid, squadName);
      setCreatedCode(g.invite_code);
      toast.success('Squad created');
      await refreshProfile();
      await load();
    } catch (e) {
      toast.error(e?.message || 'Could not create squad.');
    } finally {
      setBusy(false);
    }
  }

  async function handleLeaveSquad() {
    if (!uid) return;
    setBusy(true);
    try {
      await leaveGroup(uid);
      toast.success('You left the squad');
      await refreshProfile();
      await load();
    } catch (e) {
      toast.error(e?.message || 'Could not leave.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveMember(targetId, targetName) {
    if (!uid || !groupId) return;
    if (!window.confirm(`Remove ${targetName} from the squad?`)) return;
    setBusy(true);
    try {
      await removeMemberAsAdmin(uid, groupId, targetId);
      toast.success('Member removed');
      await load();
    } catch (e) {
      toast.error(e?.message || 'Could not remove.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRegenCode() {
    if (!uid || !groupId) return;
    setBusy(true);
    try {
      const code = await regenerateInviteCode(uid, groupId);
      toast.success('New invite code generated');
      const g = await fetchGroup(groupId);
      setGroup(g);
      await copyText(code);
    } catch (e) {
      toast.error(e?.message || 'Could not update code.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteSquad() {
    if (!uid || !groupId) return;
    setBusy(true);
    try {
      await deleteGroupAsAdmin(uid, groupId);
      toast.success('Squad deleted');
      setDeleteOpen(false);
      await refreshProfile();
      await load();
    } catch (e) {
      toast.error(e?.message || 'Could not delete.');
    } finally {
      setBusy(false);
    }
  }

  if (!uid) return null;

  return (
    <div className="space-y-5">
      <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-surface-card/80 p-5 shadow-2xl backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-500/15 via-fuchsia-500/10 to-emerald-500/10" />
        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-200/90">Competition</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-white">Weekly Arena</h1>
          <p className="mt-1 text-sm font-medium text-zinc-400">Ends Sunday</p>
          <p className="mt-1 text-[11px] text-zinc-600">{arenaSubtitle}</p>
          {groupId && myRank != null && (
            <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-100">
              Your rank <span className="text-white">#{myRank}</span>
            </p>
          )}
        </div>
      </header>

      {!groupId ? (
        <section className="space-y-5">
          <div className="rounded-3xl border border-white/10 bg-surface-card/70 p-5 shadow-xl backdrop-blur-md">
            <p className="text-sm font-bold text-white">Join Squad</p>
            <p className="mt-1 text-sm text-zinc-400">Paste an invite code from your crew captain.</p>
            <input
              value={invite}
              onChange={(e) => setInvite(e.target.value.toUpperCase())}
              placeholder="INVITE CODE"
              className="mt-3 w-full rounded-2xl border border-white/10 bg-[#12121a] px-4 py-3 text-sm font-bold tracking-[0.2em] text-white outline-none focus:border-fuchsia-400/50"
            />
            <button
              type="button"
              disabled={busy}
              onClick={handleJoin}
              className="mt-3 w-full rounded-2xl bg-gradient-to-r from-fuchsia-500 to-indigo-500 py-3 text-sm font-extrabold text-white shadow-lg transition active:scale-[0.98] disabled:opacity-50"
            >
              Join Squad
            </button>
          </div>

          <div className="rounded-3xl border border-white/10 bg-surface-card/70 p-5 shadow-xl backdrop-blur-md">
            <p className="text-sm font-bold text-white">Create Squad</p>
            <p className="mt-1 text-sm text-zinc-400">Name it, get a code, draft your rivals in.</p>
            <input
              value={squadName}
              onChange={(e) => setSquadName(e.target.value)}
              placeholder="Squad name"
              className="mt-3 w-full rounded-2xl border border-white/10 bg-[#12121a] px-4 py-3 text-sm text-white outline-none focus:border-emerald-400/50"
            />
            <button
              type="button"
              disabled={busy}
              onClick={handleCreate}
              className="mt-3 w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-accent py-3 text-sm font-extrabold text-black shadow-lg transition active:scale-[0.98] disabled:opacity-50"
            >
              Create Squad
            </button>
            {createdCode ? (
              <div className="mt-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-4">
                <p className="text-xs font-semibold text-emerald-200/90">Your invite code</p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="flex-1 truncate rounded-xl bg-black/40 px-3 py-2 text-sm font-black tracking-wider text-white">
                    {createdCode}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyText(createdCode)}
                    className="shrink-0 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/15"
                  >
                    Copy
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : loading ? (
        <p className="py-10 text-center text-sm text-zinc-500">Loading arena…</p>
      ) : (
        <>
          {group?.name ? (
            <p className="text-center text-sm font-semibold text-zinc-500">
              {group.name} · Week {mondayYmd()}
            </p>
          ) : null}

          {group?.last_winner_user_id ? (
            <div className="relative overflow-hidden rounded-3xl border border-amber-500/35 bg-gradient-to-br from-amber-500/20 via-[#12121a] to-[#12121a] p-5 shadow-[0_0_40px_rgba(251,191,36,0.12)]">
              <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-400/20 blur-3xl" />
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-200/90">Last weekly champion</p>
              <p className="mt-2 text-2xl font-black text-white">👑 {winnerName || '…'}</p>
              <p className="mt-1 text-xs text-amber-100/70">Highest streak when the last arena closed.</p>
            </div>
          ) : null}

          {top3.length > 0 && (
            <section>
              <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-zinc-500">Top 3</p>
              <div className="flex items-end justify-center gap-2 sm:gap-4">
                {podiumOrder.map((r, i) => {
                  const isFirst = r.rank === 1;
                  const h = isFirst ? 'h-36' : 'h-28';
                  const glow =
                    r.rank === 1
                      ? 'shadow-[0_0_32px_rgba(251,191,36,0.35)] border-amber-400/40'
                      : r.rank === 2
                        ? 'shadow-[0_0_24px_rgba(148,163,184,0.25)] border-slate-300/30'
                        : 'shadow-[0_0_20px_rgba(180,83,9,0.2)] border-amber-700/30';
                  return (
                    <button
                      key={`${r.userId}-${i}`}
                      type="button"
                      onClick={() => setMemberModal(r.userId)}
                      className={`relative flex w-[30%] max-w-[7.5rem] flex-col items-center rounded-2xl border bg-white/[0.05] p-3 pt-4 backdrop-blur-md transition hover:scale-[1.02] active:scale-[0.98] ${h} ${glow}`}
                    >
                      <span className="absolute -top-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-black text-white">
                        #{r.rank}
                      </span>
                      <MemberAvatar
                        userId={r.userId}
                        avatarUrl={r.avatarUrl}
                        name={r.name}
                        size={isFirst ? 52 : 40}
                        ring="ring-2 ring-white/10"
                      />
                      <p className="mt-2 line-clamp-2 w-full text-center text-[10px] font-bold text-white sm:text-xs">
                        {r.name}
                      </p>
                      <p className="mt-1 text-sm font-black tabular-nums text-emerald-300">🔥 {r.streak}</p>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <section className="overflow-hidden rounded-3xl border border-white/10 bg-surface-card/70 shadow-xl backdrop-blur-md">
            <div className="border-b border-white/5 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Full leaderboard</p>
            </div>
            <ul className="divide-y divide-white/5">
              {rows.map((r) => {
                const isYou = r.userId === uid;
                return (
                  <li key={r.userId} className="flex items-stretch">
                    <button
                      type="button"
                      onClick={() => setMemberModal(r.userId)}
                      className={`flex min-w-0 flex-1 items-center justify-between gap-3 px-4 py-4 text-left transition hover:bg-white/[0.04] ${
                        isYou ? 'bg-gradient-to-r from-emerald-500/10 via-transparent to-fuchsia-500/5' : ''
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-black ${
                            r.rank <= 3
                              ? 'bg-amber-500/20 text-amber-100 ring-1 ring-amber-400/30'
                              : 'bg-white/5 text-zinc-300 ring-1 ring-white/10'
                          }`}
                        >
                          #{r.rank}
                        </div>
                        <MemberAvatar userId={r.userId} avatarUrl={r.avatarUrl} name={r.name} size={40} />
                        <div className="min-w-0">
                          <p className={`truncate font-semibold ${isYou ? 'text-white' : 'text-zinc-200'}`}>
                            {r.name}
                            {group?.admin_id === r.userId ? (
                              <span className="ml-2 text-[10px] font-black text-amber-300">CAPTAIN</span>
                            ) : null}
                            {isYou ? (
                              <span className="ml-2 text-[10px] font-black uppercase text-emerald-300">You</span>
                            ) : null}
                          </p>
                          <p className="truncate text-[11px] text-zinc-500">
                            👑 {r.winsCount} wins · best {r.longestStreak}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-lg font-black tabular-nums text-white">{r.streak}</p>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">streak</p>
                      </div>
                    </button>
                    {isAdmin && !isYou && r.userId !== group?.admin_id ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleRemoveMember(r.userId, r.name)}
                        className="shrink-0 border-l border-white/5 px-3 text-[10px] font-black uppercase text-red-300 transition hover:bg-red-500/10 disabled:opacity-40"
                      >
                        Remove
                      </button>
                    ) : null}
                  </li>
                );
              })}
              {rows.length === 0 ? (
                <li className="px-4 py-10 text-center text-sm text-zinc-500">Draft your squad — invite friends.</li>
              ) : null}
            </ul>
          </section>

          {group?.invite_code ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold text-zinc-400">Squad invite code</p>
                {isAdmin ? (
                  <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-200">
                    Captain
                  </span>
                ) : null}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 truncate rounded-xl bg-black/30 px-3 py-2 text-sm font-black tracking-wider text-white">
                  {group.invite_code}
                </code>
                <button
                  type="button"
                  onClick={() => copyText(group.invite_code)}
                  className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold text-white"
                >
                  Copy
                </button>
              </div>
              {isAdmin ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleRegenCode}
                  className="mt-3 w-full rounded-xl border border-amber-500/30 bg-amber-500/10 py-2.5 text-xs font-extrabold text-amber-100 transition hover:bg-amber-500/20 disabled:opacity-50"
                >
                  Generate new code
                </button>
              ) : null}
            </div>
          ) : null}

          {isAdmin ? (
            <div className="rounded-3xl border border-red-500/25 bg-red-500/5 p-4">
              <p className="text-sm font-bold text-red-200">Danger zone</p>
              <p className="mt-1 text-xs text-red-200/70">Delete the squad for everyone. This cannot be undone.</p>
              <button
                type="button"
                disabled={busy}
                onClick={() => setDeleteOpen(true)}
                className="mt-3 w-full rounded-2xl border border-red-500/40 bg-red-500/15 py-3 text-sm font-extrabold text-red-100 transition hover:bg-red-500/25 disabled:opacity-50"
              >
                Delete squad
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={handleLeaveSquad}
              className="w-full rounded-2xl border border-white/15 bg-white/5 py-3 text-sm font-extrabold text-zinc-200 transition hover:bg-white/10 disabled:opacity-50"
            >
              Leave squad
            </button>
          )}
        </>
      )}

      {deleteOpen ? (
        <div className="fixed inset-0 z-[130] flex items-end justify-center bg-black/80 p-4 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-md rounded-3xl border border-red-500/30 bg-[#12121a] p-6 shadow-2xl">
            <p className="text-lg font-black text-white">Delete squad?</p>
            <p className="mt-2 text-sm text-zinc-400">All members will be removed from this squad.</p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDeleteOpen(false)}
                className="rounded-2xl border border-white/15 px-4 py-3 text-sm font-bold text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleDeleteSquad}
                className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-extrabold text-white"
              >
                Delete forever
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <SquadMemberModal userId={memberModal} open={!!memberModal} onClose={() => setMemberModal(null)} />
    </div>
  );
}
