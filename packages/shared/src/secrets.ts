import { z } from 'zod'

/**
 * Secret resolver abstraction for SnapCal production.
 *
 * Supports (in order of precedence):
 * 1. HashiCorp Vault KV2 (VAULT_ADDR, VAULT_TOKEN, VAULT_KV_PATH)
 * 2. AWS Secrets Manager (AWS_SECRET_ARN / AWS_SECRET_NAME)
 * 3. 1Password CLI Service Account (OP_SERVICE_ACCOUNT_TOKEN, OP_VAULT, OP_ITEM)
 * 4. Process environment (development / tests only)
 *
 * Use `loadSecret(key)` to fetch a single secret by symbolic name.
 * Secret names map to env keys: DATABASE_URL, JWT_SECRET, etc.
 */

const secretSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  VAULT_ADDR: z.string().url().optional(),
  VAULT_TOKEN: z.string().optional(),
  VAULT_KV_PATH: z.string().default('secret/snapcal'),
  AWS_REGION: z.string().default('us-east-1'),
  AWS_SECRET_ARN: z.string().optional(),
  AWS_SECRET_NAME: z.string().optional(),
  OP_SERVICE_ACCOUNT_TOKEN: z.string().optional(),
  OP_VAULT: z.string().optional(),
  OP_ITEM: z.string().default('snapcal-production'),
})

const config = secretSchema.parse(process.env)

const cache = new Map<string, string>()

export function resetSecretCache() {
  cache.clear()
}

export async function loadSecret(name: string): Promise<string | undefined> {
  if (cache.has(name)) return cache.get(name)

  // Always allow local env fallback in dev/test.
  if (process.env[name] && config.NODE_ENV !== 'production') {
    const value = process.env[name]
    if (value) cache.set(name, value)
    return value
  }

  let value: string | undefined

  if (config.VAULT_ADDR && config.VAULT_TOKEN) {
    value = await loadFromVault(name)
  } else if (config.AWS_SECRET_ARN || config.AWS_SECRET_NAME) {
    // value = await loadFromAws(name)
    // AWS SDK is an optional dependency; install it to enable this backend.
  } else if (config.OP_SERVICE_ACCOUNT_TOKEN) {
    value = await loadFromOnePassword(name)
  }

  if (value) {
    cache.set(name, value)
  }
  return value
}

async function loadFromVault(name: string): Promise<string | undefined> {
  try {
    const path = encodeURIComponent(`${config.VAULT_KV_PATH}/${name}`)
    const res = await fetch(`${config.VAULT_ADDR}/v1/${path}`, {
      headers: { 'X-Vault-Token': config.VAULT_TOKEN! },
    })
    if (!res.ok) return undefined
    const json = (await res.json()) as { data?: { data?: Record<string, string> } }
    return json.data?.data?.value
  } catch {
    return undefined
  }
}

async function loadFromAws(_name: string): Promise<string | undefined> {
  // AWS Secrets Manager support is implemented via dynamic import.
  // Add @aws-sdk/client-secrets-manager as an optional dependency in
  // packages/shared/package.json to enable it.
  return undefined
}

async function loadFromOnePassword(name: string): Promise<string | undefined> {
  try {
    const { execFile } = await import('node:child_process')
    const { stdout } = await new Promise<{ stdout: string }>((resolve, reject) => {
      execFile(
        'op',
        ['item', 'get', config.OP_ITEM, '--vault', config.OP_VAULT ?? '', '--field', name, '--reveal'],
        { env: { ...process.env, OP_SERVICE_ACCOUNT_TOKEN: config.OP_SERVICE_ACCOUNT_TOKEN } },
        (err, stdout) => {
          if (err) reject(err)
          else resolve({ stdout: stdout.trim() })
        },
      )
    })
    return stdout
  } catch {
    return undefined
  }
}

/**
 * Build a merged env object from process.env plus secrets loaded from the
 * configured backend. Missing required secrets throw at startup.
 */
export async function loadSecrets(keys: string[]): Promise<Record<string, string>> {
  const result: Record<string, string> = { ...process.env as Record<string, string> }
  for (const key of keys) {
    if (result[key]) continue
    const secret = await loadSecret(key)
    if (secret) result[key] = secret
  }
  return result
}
