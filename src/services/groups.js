import { supabase } from './supabase';
import { fetchUserById } from './users';

function randomInviteCode() {
  const s = crypto.randomUUID().replace(/-/g, '');
  return s.slice(0, 10).toUpperCase();
}

export async function createGroup(userId, name) {
  const me = await fetchUserById(userId);
  if (me?.group_id) throw new Error('Leave your current squad first');

  const invite_code = randomInviteCode();
  const { data: group, error } = await supabase
    .from('groups')
    .insert({
      name: name.trim() || 'My Squad',
      invite_code,
      admin_id: userId,
    })
    .select()
    .single();
  if (error) throw error;

  const { error: memErr } = await supabase
    .from('group_members')
    .insert({ group_id: group.id, user_id: userId, role: 'admin' });
  if (memErr) throw memErr;

  const { error: uerr } = await supabase.from('users').update({ group_id: group.id }).eq('id', userId);
  if (uerr) throw uerr;

  return group;
}

export async function joinGroupByCode(userId, code) {
  const trimmed = String(code ?? '').trim();
  if (!trimmed) throw new Error('Enter an invite code');

  const me = await fetchUserById(userId);
  if (me?.group_id) throw new Error('Leave your current squad first');

  const { data: group, error } = await supabase
    .from('groups')
    .select('id')
    .eq('invite_code', trimmed.toUpperCase())
    .maybeSingle();

  if (error) throw error;
  if (!group) throw new Error('Invalid invite code');

  const { error: memErr } = await supabase
    .from('group_members')
    .insert({ group_id: group.id, user_id: userId, role: 'member' });
  if (memErr) {
    if (memErr.code === '23505') throw new Error('Already in this squad');
    throw memErr;
  }

  const { error: uerr } = await supabase.from('users').update({ group_id: group.id }).eq('id', userId);
  if (uerr) throw uerr;

  return group;
}

/** Non-admin leaves squad. Admins must delete the squad. */
export async function leaveGroup(userId) {
  const me = await fetchUserById(userId);
  if (!me?.group_id) return;

  const { data: g } = await supabase.from('groups').select('admin_id').eq('id', me.group_id).maybeSingle();
  if (g?.admin_id === userId) {
    throw new Error('Admins cannot leave — delete the squad or transfer ownership (coming soon).');
  }

  const { error: d1 } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', me.group_id)
    .eq('user_id', userId);
  if (d1) throw d1;

  const { error: d2 } = await supabase.from('users').update({ group_id: null }).eq('id', userId);
  if (d2) throw d2;
}

export async function removeMemberAsAdmin(actorId, groupId, targetUserId) {
  const { data: g } = await supabase.from('groups').select('admin_id').eq('id', groupId).maybeSingle();
  if (!g || g.admin_id !== actorId) throw new Error('Only the squad admin can remove members');
  if (targetUserId === g.admin_id) throw new Error('Cannot remove the admin');

  const { error: d1 } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', targetUserId);
  if (d1) throw d1;

  const { error: d2 } = await supabase.from('users').update({ group_id: null }).eq('id', targetUserId);
  if (d2) throw d2;
}

export async function deleteGroupAsAdmin(actorId, groupId) {
  const { data: g } = await supabase.from('groups').select('admin_id').eq('id', groupId).maybeSingle();
  if (!g || g.admin_id !== actorId) throw new Error('Only the squad admin can delete the squad');

  const { error } = await supabase.from('groups').delete().eq('id', groupId);
  if (error) throw error;
}

export async function regenerateInviteCode(actorId, groupId) {
  const { data: g } = await supabase.from('groups').select('admin_id').eq('id', groupId).maybeSingle();
  if (!g || g.admin_id !== actorId) throw new Error('Only the squad admin can change the invite code');

  const invite_code = randomInviteCode();
  const { data, error } = await supabase
    .from('groups')
    .update({ invite_code })
    .eq('id', groupId)
    .select('invite_code')
    .single();
  if (error) throw error;
  return data.invite_code;
}

async function fetchMemberUserIds(groupId) {
  const { data: gm, error } = await supabase.from('group_members').select('user_id').eq('group_id', groupId);
  if (error) throw error;
  if (gm?.length) return gm.map((r) => r.user_id);

  const { data: legacy, error: lerr } = await supabase.from('users').select('id').eq('group_id', groupId);
  if (lerr) throw lerr;
  return (legacy ?? []).map((u) => u.id);
}

export async function fetchLeaderboard(groupId) {
  const ids = await fetchMemberUserIds(groupId);
  if (ids.length === 0) return [];

  const { data: members, error } = await supabase
    .from('users')
    .select('id, name, email, group_id, avatar_url, wins_count')
    .in('id', ids);

  if (error) throw error;
  const list = members ?? [];

  const { data: streakRows, error: serr } = await supabase
    .from('streaks')
    .select('user_id, current_streak, last_active_date, longest_streak')
    .in('user_id', ids);

  if (serr) throw serr;

  const byId = Object.fromEntries((streakRows ?? []).map((r) => [r.user_id, r]));

  const merged = list.map((m) => {
    const s = byId[m.id];
    const cur = s?.current_streak ?? 0;
    const lng = s?.longest_streak ?? 0;
    return {
      userId: m.id,
      name: m.name || m.email?.split('@')[0] || 'Athlete',
      email: m.email,
      avatarUrl: m.avatar_url,
      winsCount: m.wins_count ?? 0,
      streak: cur,
      longestStreak: Math.max(lng, cur),
      lastActive: s?.last_active_date ?? null,
    };
  });

  merged.sort((a, b) => {
    if (b.streak !== a.streak) return b.streak - a.streak;
    return a.name.localeCompare(b.name);
  });

  const ranked = [];
  for (let i = 0; i < merged.length; i++) {
    const row = merged[i];
    if (i === 0) {
      ranked.push({ ...row, rank: 1 });
      continue;
    }
    if (row.streak === merged[i - 1].streak) {
      ranked.push({ ...row, rank: ranked[i - 1].rank });
    } else {
      ranked.push({ ...row, rank: i + 1 });
    }
  }
  return ranked;
}
