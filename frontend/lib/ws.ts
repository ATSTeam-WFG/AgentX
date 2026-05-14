type WsEventHandler = (event: string, data: unknown) => void;

const MAX_BACKOFF_MS = 30_000;

let ws: WebSocket | null = null;
let backoffMs = 1000;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const handlers = new Set<WsEventHandler>();

export function connectWs(token: string): void {
  if (ws && ws.readyState === WebSocket.OPEN) return;

  const wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:3001';
  ws = new WebSocket(`${wsUrl}/v1/ws?token=${token}`);

  ws.onopen = () => {
    backoffMs = 1000;
    emit('__connected', null);
  };

  ws.onmessage = (e) => {
    try {
      const { event, data } = JSON.parse(e.data as string) as { event: string; data: unknown };
      emit(event, data);
    } catch { /* ignore malformed */ }
  };

  ws.onclose = () => {
    ws = null;
    emit('__disconnected', null);
    scheduleReconnect(token);
  };

  ws.onerror = () => {
    ws?.close();
  };
}

function scheduleReconnect(token: string): void {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS);
    connectWs(token);
  }, backoffMs);
}

function emit(event: string, data: unknown): void {
  handlers.forEach(h => h(event, data));
}

export function onWsEvent(handler: WsEventHandler): () => void {
  handlers.add(handler);
  return () => handlers.delete(handler);
}

export function disconnectWs(): void {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  ws?.close();
  ws = null;
}

export function isWsConnected(): boolean {
  return ws?.readyState === WebSocket.OPEN;
}
