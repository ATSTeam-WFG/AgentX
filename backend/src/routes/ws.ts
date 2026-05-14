import { FastifyInstance } from 'fastify'
import '@fastify/websocket'

export async function wsRoutes(fastify: FastifyInstance) {
  fastify.get('/ws', { websocket: true }, (socket) => {
    socket.on('message', () => {
      // not implemented — events: leaderboard.update, announcements.new, agenda.changed, jobs.{id}.complete
    })

    socket.on('close', () => {})
  })
}
