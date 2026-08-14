import { PrismaClient, type PrismaClient as PrismaClientType } from '../node_modules/.prisma/client/index.js'

const globalForPrisma = global as unknown as { prisma: PrismaClientType }

export const prisma: PrismaClientType = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export { PrismaClient }
export * from './chunking.js'
export * from './knowledgeVector.js'
