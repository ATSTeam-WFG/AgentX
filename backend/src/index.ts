import 'dotenv/config'
import { buildApp } from './app'
import { config } from './config'
import { startWorker } from './workers/index'

async function main() {
  process.stdout.write('[startup] building app\n')
  const app = await buildApp()
  process.stdout.write('[startup] app built\n')

  const shutdown = async () => {
    await app.close()
    process.exit(0)
  }
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)

  process.stdout.write(`[startup] listening on port ${config.PORT}\n`)
  await app.listen({ port: config.PORT, host: '0.0.0.0' })
  process.stdout.write('[startup] server up\n')
  startWorker()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
