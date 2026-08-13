import prom from 'prom-client'

const register = new prom.Registry()
prom.collectDefaultMetrics({ register })

export const aiRequestsTotal = new prom.Counter({
  name: 'snapcal_ai_requests_total',
  help: 'Total AI requests by skill, model, and status',
  labelNames: ['skill', 'model', 'status'],
  registers: [register],
})

export const aiLatencyHistogram = new prom.Histogram({
  name: 'snapcal_ai_latency_seconds',
  help: 'AI request latency in seconds',
  labelNames: ['skill', 'model'],
  buckets: [0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60],
  registers: [register],
})

export const aiCostTotal = new prom.Counter({
  name: 'snapcal_ai_cost_usd_total',
  help: 'Estimated AI cost in USD',
  labelNames: ['model', 'provider'],
  registers: [register],
})

export const aiErrorsTotal = new prom.Counter({
  name: 'snapcal_ai_errors_total',
  help: 'AI errors by skill and error type',
  labelNames: ['skill', 'error_type'],
  registers: [register],
})

export const visionQueueJobsTotal = new prom.Counter({
  name: 'snapcal_ai_vision_queue_jobs_total',
  help: 'Vision queue jobs by state',
  labelNames: ['state'],
  registers: [register],
})

export function registerMetricsEndpoint(app: any, path = '/metrics') {
  app.get(path, async (_req: unknown, reply: { header: (k: string, v: string) => void; send: (s: string) => void }) => {
    reply.header('Content-Type', register.contentType)
    reply.send(await register.metrics())
  })
}

export { register }
