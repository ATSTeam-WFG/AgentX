import { apiFetch } from '../api';

export interface LeaderboardEntry {
  rank: number;
  name: string;
  total_points: number;
  is_current_user: boolean;
}

export interface LeaderboardResponse {
  top: LeaderboardEntry[];
  current_user: LeaderboardEntry;
}

export const getLeaderboard = (limit = 5) =>
  apiFetch<LeaderboardResponse>(`/v1/leaderboard?limit=${limit}`);
