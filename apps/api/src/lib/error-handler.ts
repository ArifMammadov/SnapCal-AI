import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify'

export function errorHandler(
  error: FastifyError,
  _request: FastifyRequest,
  reply: FastifyReply
) {
  const statusCode = error.statusCode ?? 500
  const code = error.code ?? 'INTERNAL_ERROR'

  if (statusCode >= 500) {
    console.error(error)
  }

  reply.status(statusCode).send({
    error: {
      code,
      message: statusCode >= 500 ? 'Internal server error' : error.message,
    },
  })
}
