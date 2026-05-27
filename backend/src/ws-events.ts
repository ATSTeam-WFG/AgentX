export type WsEvent =
  | { event: 'agenda.changed';     data: { action: 'created' | 'updated' | 'deleted'; eventId: string } }
  | { event: 'announcements.new';  data: { id: string; title: string; body: string } }
  | { event: 'activity.changed';   data: { id: string; isOpen: boolean } }
  | { event: 'scores.update';      data: { userId: string; totalPoints: number } }
  | { event: 'leaderboard.update'; data: null }
  | { event: 'jobs.done';          data: { jobId: string; type: string; userId: string } }

export const makeWsMessage = (ev: WsEvent): string => JSON.stringify(ev)
