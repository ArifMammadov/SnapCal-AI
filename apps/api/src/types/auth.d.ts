import type { FastifyRequest } from 'fastify'

export interface JwtPayload {
  userId: string
  telegramId?: string
  role?: string
  type?: string
  languageCode?: string
  iat?: number
  exp?: number
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload
    user: JwtPayload
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    user: JwtPayload
  }
}
