import { supabase } from './supabase';
import { addDays, computeStreak, formatLocalDate } from '../lib/streakLogic';

export async function fetchProgressRange(userId, fromDate, toDate) {
  const { data, error } = await supabase
    .from('progress')
    .select('*')
    .eq('user_id', userId)
    .gte('date', fromDate)
    .lte('date', toDate);
  if (error) throw error;
  const map = {};
  for (const row of data ?? []) {
    map[row.date] = {
      id: row.id,
      completed: !!row.completed,
      rest_day: !!row.rest_day,
    };
  }
  return map;
}

export async function fetchProgressForStreak(userId, todayStr) {
  const from = addDays(todayStr, -400);
  return fetchProgressRange(userId, from, todayStr);
}

export async function upsertProgress(userId, dateStr, { completed, rest_day }) {
  const { data: exist } = await supabase
    .from('progress')
    .select('id')
    .eq('user_id', userId)
    .eq('date', dateStr)
    .maybeSingle();

  if (exist?.id) {
    const { error } = await supabase
      .from('progress')
      .update({ completed, rest_day })
      .eq('id', exist.id);
    if (error) throw error;
    return exist.id;
  }

  const { data, error } = await supabase
    .from('progress')
    .insert({ user_id: userId, date: dateStr, completed, rest_day })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function syncStreakFromProgress(userId, progressMap, todayStr) {
  const { currentStreak, lastActiveDate } = computeStreak(progressMap, todayStr);
  const { data: prev } = await supabase.from('streaks').select('longest_streak').eq('user_id', userId).maybeSingle();
  const prevLong = prev?.longest_streak ?? 0;
  const longestStreak = Math.max(prevLong, currentStreak);
  const { error } = await supabase.from('streaks').upsert(
    {
      user_id: userId,
      current_streak: currentStreak,
      last_active_date: lastActiveDate,
      longest_streak: longestStreak,
    },
    { onConflict: 'user_id' }
  );
  if (error) throw error;
  return { currentStreak, lastActiveDate, longestStreak };
}

export async function countRestDaysLogged(userId) {
  const { count, error } = await supabase
    .from('progress')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('rest_day', true);
  if (error) throw error;
  return count ?? 0;
}

export function todayLocal() {
  return formatLocalDate(new Date());
}

export async function countCompletedWorkouts(userId) {
  const { count, error } = await supabase
    .from('progress')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('completed', true);
  if (error) throw error;
  return count ?? 0;
}

export async function fetchStreakRow(userId) {
  const { data, error } = await supabase.from('streaks').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data;
}
