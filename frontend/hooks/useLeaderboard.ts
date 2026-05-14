import { useQuery } from '@tanstack/react-query';
import { getLeaderboard } from '@/lib/api/leaderboard';

export function useLeaderboard(limit = 5) {
  return useQuery({
    queryKey: ['leaderboard', limit],
    queryFn: () => getLeaderboard(limit),
    staleTime: 30_000,
  });
}
