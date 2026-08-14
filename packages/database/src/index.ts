import { PrismaClient, type PrismaClient as PrismaClientType } from '../node_modules/.prisma/client/index.js'

const globalForPrisma = global as unknown as {
  prisma: PrismaClientType
  prismaRead: PrismaClientType
}

const log: Array<'query' | 'error' | 'warn'> = process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']

function buildClient(url?: string): PrismaClientType {
  return new PrismaClient({
    datasources: {
      db: {
        url: url ?? process.env.DATABASE_URL,
      },
    },
    log,
  })
}

export const prisma: PrismaClientType = globalForPrisma.prisma ?? buildClient(process.env.DATABASE_URL)
export const prismaRead: PrismaClientType =
  globalForPrisma.prismaRead ?? buildClient(process.env.DATABASE_READ_URL ?? process.env.DATABASE_URL)

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
  globalForPrisma.prismaRead = prismaRead
}

export { PrismaClient }
export * from './chunking.js'
export * from './knowledgeVector.js'
