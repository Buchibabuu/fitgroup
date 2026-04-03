const MESSAGES = [
  'Solid work — stack days, not sprints.',
  'Logged is better than perfect. See you next run.',
  'Your future self is taking notes.',
  'Keep the chain — one run at a time.',
  'Progress loves consistency.',
  'That’s in the bank. Recover well.',
];

/** Stable pick per day so toasts don’t feel totally random. */
export function getRunSaveMotivation(dateYmd) {
  const seed = dateYmd.split('-').reduce((a, x) => a + parseInt(x, 10), 0);
  return MESSAGES[seed % MESSAGES.length];
}
