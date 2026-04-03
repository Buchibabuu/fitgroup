import { supabase } from './supabase';
import { parsePlanDay, serializePlanDay } from '../lib/planDay';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export { DAYS };

export async function fetchWorkoutPlans(userId) {
  const { data, error } = await supabase.from('workout_plans').select('*').eq('user_id', userId);
  if (error) throw error;
  const byDay = Object.fromEntries(
    DAYS.map((d) => [d, { day_of_week: d, exercises: { rest: false, items: [] } }])
  );
  for (const row of data ?? []) {
    byDay[row.day_of_week] = {
      id: row.id,
      day_of_week: row.day_of_week,
      exercises: parsePlanDay(row.exercises),
    };
  }
  return byDay;
}

export async function upsertDayPlan(userId, dayOfWeek, dayState) {
  const { data: existing } = await supabase
    .from('workout_plans')
    .select('id')
    .eq('user_id', userId)
    .eq('day_of_week', dayOfWeek)
    .maybeSingle();

  const payload = serializePlanDay(dayState);

  if (existing?.id) {
    const { error } = await supabase.from('workout_plans').update({ exercises: payload }).eq('id', existing.id);
    if (error) throw error;
    return existing.id;
  }

  const { data, error } = await supabase
    .from('workout_plans')
    .insert({ user_id: userId, day_of_week: dayOfWeek, exercises: payload })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function saveWeeklyPlan(userId, planByDay) {
  for (const day of DAYS) {
    const st = planByDay[day];
    const payload = serializePlanDay(st);
    await upsertDayPlan(userId, day, payload);
  }
}
