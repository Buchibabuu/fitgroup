import { supabase } from './supabase';
import { canFinalizeArenaWeek, previousWeekMondayYmd } from '../lib/arenaWeek';
import { fetchLeaderboard } from './groups';

export async function fetchGroup(groupId) {
  const { data, error } = await supabase.from('groups').select('*').eq('id', groupId).single();
  if (error) throw error;
  return data;
}

/**
 * If we are past last week’s Sunday and haven’t awarded that week yet,
 * pick winner by current streak order and increment wins_count.
 */
export async function maybeFinalizeWeeklyArena(groupId, currentUserId) {
  const { data: group, error } = await supabase.from('groups').select('*').eq('id', groupId).single();
  if (error) throw error;

  const prevKey = previousWeekMondayYmd();
  if (group.last_awarded_week === prevKey) {
    return { finalized: false, winnerUserId: null, winnerName: null, youWon: false };
  }

  if (!canFinalizeArenaWeek(prevKey)) {
    return { finalized: false, winnerUserId: null, winnerName: null, youWon: false };
  }

  const board = await fetchLeaderboard(groupId);

  if (board.length === 0) {
    await supabase.from('groups').update({ last_awarded_week: prevKey, last_winner_user_id: null }).eq('id', groupId);
    return { finalized: true, winnerUserId: null, winnerName: null, youWon: false };
  }

  const winner = board[0];
  const { data: u } = await supabase.from('users').select('wins_count').eq('id', winner.userId).maybeSingle();
  const nextWins = (u?.wins_count ?? 0) + 1;

  const { error: uw } = await supabase.from('users').update({ wins_count: nextWins }).eq('id', winner.userId);
  if (uw) throw uw;

  const { error: gw } = await supabase
    .from('groups')
    .update({ last_awarded_week: prevKey, last_winner_user_id: winner.userId })
    .eq('id', groupId);
  if (gw) throw gw;

  return {
    finalized: true,
    winnerUserId: winner.userId,
    winnerName: winner.name,
    youWon: winner.userId === currentUserId,
  };
}
