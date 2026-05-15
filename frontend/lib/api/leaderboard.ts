import { apiFetch } from '../api';

export interface LeaderboardEntry {
  rank: number;
  name: string;
  totalPoints: number;
  avatarUrl?: string | null;
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  currentUser: { rank: number; totalPoints: number } | null;
}

export const getLeaderboard = (limit = 5) =>
  apiFetch<LeaderboardResponse>(`/v1/leaderboard?limit=${limit}`);
