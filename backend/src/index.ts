import 'dotenv/config'
import { buildApp } from './app'
import { config } from './config'
import { startWorker } from './workers/index'

async function main() {
  const app = await buildApp()
  await app.listen({ port: config.PORT, host: '0.0.0.0' })
  startWorker()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
