/**
 * UI-only streak state (does not change scoring logic in streakLogic.js).
 * - active: streak > 0 and today is not a rest day (you’re still “in the fight”)
 * - frozen: streak > 0 and today is a rest day (streak preserved, not advanced)
 * - broken: streak === 0
 */
export function getStreakDisplayState(currentStreak, todayRow) {
  if (currentStreak <= 0) {
    return {
      kind: 'broken',
      emoji: '💀',
      headline: 'Streak reset',
      sub: 'Log a workout to start a new run. One day at a time.',
    };
  }

  if (todayRow?.rest_day) {
    return {
      kind: 'frozen',
      emoji: '❄️',
      headline: 'Streak on ice',
      sub: 'Rest counts — up to 3 in a row. Come back swinging tomorrow.',
    };
  }

  return {
    kind: 'active',
    emoji: '🔥',
    headline: 'Streak alive',
    sub:
      currentStreak >= 7
        ? 'You’re building something real. Keep the pressure on.'
        : 'Momentum is everything. Protect it today.',
  };
}
