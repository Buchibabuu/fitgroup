const QUOTES = [
  'Show up. Stack days. Win quietly.',
  'Consistency beats intensity — every time.',
  'Small reps today, big future you.',
  'Your future self is watching today’s choices.',
  'Discipline is choosing what you want most over what you want now.',
  'Compete with yesterday’s version of you.',
  'Energy follows action — start small, start now.',
];

export function getDailyMotivation(seedDate = new Date()) {
  const day = seedDate.getDate() + seedDate.getMonth() * 31 + seedDate.getFullYear() * 400;
  return QUOTES[day % QUOTES.length];
}
