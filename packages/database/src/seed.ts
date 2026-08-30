import { seedFoods } from './seedFoods.js'

async function main() {
  try {
    await seedFoods()
    console.log('✅ Food seed complete')
  } catch (err) {
    console.error('❌ Food seed failed', err)
    process.exit(1)
  }
}

main()
