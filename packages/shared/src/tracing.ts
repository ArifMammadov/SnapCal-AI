import { NodeSDK } from '@opentelemetry/sdk-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION, ATTR_DEPLOYMENT_ENVIRONMENT_NAME } from '@opentelemetry/semantic-conventions'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http'
import { PrismaInstrumentation } from '@prisma/instrumentation'
import { PinoInstrumentation } from '@opentelemetry/instrumentation-pino'
import { env } from './env.js'

let sdk: NodeSDK | undefined

export function initTracing(serviceName: string, serviceVersion = '1.0.0') {
  if (sdk) return sdk
  if (env.NODE_ENV === 'test') return undefined

  const exporter = new OTLPTraceExporter({
    url: env.OTEL_EXPORTER_OTLP_ENDPOINT,
    headers: env.OTEL_EXPORTER_OTLP_HEADERS,
  })

  sdk = new NodeSDK({
    traceExporter: exporter,
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: serviceName,
      [ATTR_SERVICE_VERSION]: serviceVersion,
      [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: env.NODE_ENV,
    }),
    instrumentations: [
      new HttpInstrumentation({
        headersToSpanAttributes: {
          client: { requestHeaders: ['x-request-id', 'x-snapcal-secret', 'user-agent'] },
          server: { requestHeaders: ['x-request-id'], responseHeaders: ['x-request-id'] },
        },
      }),
      new PrismaInstrumentation(),
      new PinoInstrumentation(),
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
  })

  sdk.start()
  return sdk
}

export async function shutdownTracing(): Promise<void> {
  if (!sdk) return
  await sdk.shutdown()
  sdk = undefined
}
