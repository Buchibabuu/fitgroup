import { countCompletedWorkouts, countRestDaysLogged, fetchStreakRow } from './progress';
import { fetchUserById } from './users';
import { fetchWorkoutPlans } from './workoutPlans';

export async function fetchMemberPublicProfile(userId) {
  const [user, streak, completedWorkouts, restDays, plans] = await Promise.all([
    fetchUserById(userId),
    fetchStreakRow(userId),
    countCompletedWorkouts(userId),
    countRestDaysLogged(userId),
    fetchWorkoutPlans(userId),
  ]);

  return {
    user,
    currentStreak: streak?.current_streak ?? 0,
    longestStreak: Math.max(streak?.longest_streak ?? 0, streak?.current_streak ?? 0),
    winsCount: user?.wins_count ?? 0,
    completedWorkouts,
    restDays,
    plans,
  };
}
