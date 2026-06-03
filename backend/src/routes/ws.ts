import { FastifyInstance, FastifyRequest } from 'fastify'
import { SocketStream } from '@fastify/websocket'
import { registerConnection, removeConnection } from '../ws-connections'

export async function wsRoutes(fastify: FastifyInstance) {
  fastify.get('/ws', { websocket: true }, (connection: SocketStream, request: FastifyRequest) => {
    const token = (request.query as { token?: string }).token

    if (!token) {
      connection.socket.close(4001, 'Missing token')
      return
    }

    let userId: string
    try {
      const payload = fastify.jwt.verify<{ sub: string; aud?: string }>(token)
      if (payload.aud === 'admin') {
        connection.socket.close(4003, 'Admin token not allowed')
        return
      }
      userId = payload.sub
    } catch {
      connection.socket.close(4001, 'Invalid token')
      return
    }

    registerConnection(userId, connection.socket)

    // Ping every 30 s so Railway / proxies don't drop the idle connection (typical idle timeout ~60 s)
    const pingInterval = setInterval(() => {
      if (connection.socket.readyState === 1) connection.socket.ping()
    }, 30_000)

    connection.socket.on('close', () => {
      clearInterval(pingInterval)
      removeConnection(userId, connection.socket)
    })

    // All events are server → client; ignore inbound messages
    connection.socket.on('message', () => {})
  })
}
