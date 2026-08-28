import prom from 'prom-client'

const register = new prom.Registry()
prom.collectDefaultMetrics({ register })

export const apiRequestsTotal = new prom.Counter({
  name: 'snapcal_api_requests_total',
  help: 'Total API requests by method, route, and status',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
})

export const apiLatencyHistogram = new prom.Histogram({
  name: 'snapcal_api_latency_seconds',
  help: 'API request latency in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30],
  registers: [register],
})

export const apiErrorsTotal = new prom.Counter({
  name: 'snapcal_api_errors_total',
  help: 'API errors by route and error type',
  labelNames: ['route', 'error_type'],
  registers: [register],
})

export const subscriptionPaymentsTotal = new prom.Counter({
  name: 'snapcal_subscription_payments_total',
  help: 'Subscription payments by provider and status',
  labelNames: ['provider', 'status'],
  registers: [register],
})

export const activeSubscriptionsGauge = new prom.Gauge({
  name: 'snapcal_active_subscriptions',
  help: 'Number of currently active subscriptions',
  registers: [register],
})

export const aiProxyLatencyHistogram = new prom.Histogram({
  name: 'snapcal_ai_proxy_latency_seconds',
  help: 'Latency of AI agent proxy calls',
  labelNames: ['route'],
  buckets: [0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60],
  registers: [register],
})

export function registerMetricsEndpoint(app: any, path = '/metrics') {
  app.get(path, async (_req: unknown, reply: { header: (k: string, v: string) => void; send: (s: string) => void }) => {
    reply.header('Content-Type', register.contentType)
    reply.send(await register.metrics())
  })
}

export function requestMetricsHook(app: any) {
  app.addHook('onResponse', async (request: any, reply: any) => {
    const route = request.routerPath ?? request.url ?? 'unknown'
    const method = request.method ?? 'unknown'
    const status = reply.statusCode ?? 0
    apiRequestsTotal.inc({ method, route, status: String(status) })
    apiLatencyHistogram.observe({ method, route }, reply.elapsedTime / 1000)
    if (status >= 500) {
      apiErrorsTotal.inc({ route, error_type: 'server_error' })
    }
  })
}

export { register }
