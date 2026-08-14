import { seedDefaultPrompts } from '@snapcal/database'
import { defaultPrompts } from '../agent/promptResolver.js'
import { prisma } from '@snapcal/database'

export async function seed() {
  await seedDefaultPrompts(defaultPrompts)
  console.log('Seeded default prompt templates')
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err)
      process.exit(1)
    })
}
