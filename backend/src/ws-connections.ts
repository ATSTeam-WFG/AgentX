interface SocketLike {
  readyState: number
  send(data: string): void
}

// userId → set of open sockets (one user may have multiple tabs/devices)
const connections = new Map<string, Set<SocketLike>>()

export function registerConnection(userId: string, socket: SocketLike): void {
  let sockets = connections.get(userId)
  if (!sockets) { sockets = new Set(); connections.set(userId, sockets) }
  sockets.add(socket)
}

export function removeConnection(userId: string, socket: SocketLike): void {
  const sockets = connections.get(userId)
  if (!sockets) return
  sockets.delete(socket)
  if (sockets.size === 0) connections.delete(userId)
}

function trySend(socket: SocketLike, payload: string): void {
  if (socket.readyState === 1) socket.send(payload)
}

export function broadcastAll(payload: string): void {
  for (const sockets of connections.values()) {
    for (const socket of sockets) trySend(socket, payload)
  }
}

export function broadcastUser(userId: string, payload: string): void {
  const sockets = connections.get(userId)
  if (!sockets) return
  for (const socket of sockets) trySend(socket, payload)
}

export function connectionCount(): number {
  let n = 0
  for (const s of connections.values()) n += s.size
  return n
}
