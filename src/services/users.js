import { supabase } from './supabase';

export async function fetchUserById(userId) {
  const { data, error } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

/** Creates or updates the Supabase user row keyed by Firebase UID. */
export async function ensureUserRecord(firebaseUser, nameOverride) {
  const existing = await fetchUserById(firebaseUser.uid);
  const name =
    (nameOverride && String(nameOverride).trim()) ||
    firebaseUser.displayName ||
    firebaseUser.email?.split('@')[0] ||
    'Athlete';

  const row = {
    id: firebaseUser.uid,
    name,
    email: firebaseUser.email ?? '',
    avatar_url: firebaseUser.photoURL ?? null,
  };
  if (existing) {
    row.wins_count = existing.wins_count ?? 0;
    row.group_id = existing.group_id;
  }

  const { data, error } = await supabase.from('users').upsert(row, { onConflict: 'id' }).select().single();
  if (error) throw error;
  return data;
}

export async function updateUserName(userId, name) {
  const trimmed = String(name ?? '').trim();
  if (!trimmed) throw new Error('Name is required');

  const { data, error } = await supabase
    .from('users')
    .update({ name: trimmed })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
