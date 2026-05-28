import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { runFullSeed } from '../src/lib/seeder'

const prisma = new PrismaClient()

async function main() {
  const counts = await runFullSeed(prisma)
  console.log('Seeded admin: admin@es26.com')
  console.log(`Seeded ${counts.invitees} invitees`)
  console.log(`Seeded ${counts.agenda} agenda events`)
  console.log(`Seeded ${counts.sponsors} sponsors`)
  console.log(`Seeded ${counts.initiatives} initiatives`)
  console.log(`Seeded ${counts.announcements} announcement`)
  console.log(`Seeded ${counts.activities} activities`)
  console.log(`Seeded ${counts.trivia} trivia questions`)
  console.log(`Seeded ${counts.promptChallenge} prompt challenge questions`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
