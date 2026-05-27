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

    connection.socket.on('close', () => {
      removeConnection(userId, connection.socket)
    })

    // All events are server → client; ignore inbound messages
    connection.socket.on('message', () => {})
  })
}
