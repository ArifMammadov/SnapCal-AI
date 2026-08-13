const ALLOWED_HOSTS = [
  /^[\w-]+\.s3[\w.-]*\.amazonaws\.com$/i,
  /^[\w-]+\.r2\.cloudflarestorage\.com$/i,
  /^[\w-]+\.storage\.googleapis\.com$/i,
  /^snapcal\.health$/i,
  /^[\w-]+\.snapcal\.health$/i,
  /^t\.me\/i\/file\/\S+$/i,
]

const BLOCKED_PATTERNS = [
  /^https?:\/\/localhost/i,
  /^https?:\/\/127\./i,
  /^https?:\/\/10\./i,
  /^https?:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\./i,
  /^https?:\/\/192\.168\./i,
  /^https?:\/\/169\.254\./i,
  /^https?:\/\/0\./i,
  /^file:\/\//i,
  /^ftp:\/\//i,
  /^http:\/\/169\.254\.169\.254/i, // AWS metadata
  /metadata\.google\.internal/i,
]

export function isAllowedImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false
    if (BLOCKED_PATTERNS.some((p) => p.test(parsed.href))) return false
    const hostname = parsed.hostname.toLowerCase()
    if (ALLOWED_HOSTS.some((p) => p.test(hostname))) return true
    return false
  } catch {
    return false
  }
}

export async function validateImageUrlHead(url: string): Promise<{ ok: true; contentLength?: number } | { ok: false; reason: string }> {
  try {
    const { default: axios } = await import('axios')
    const response = await axios.head(url, {
      timeout: 5000,
      maxRedirects: 2,
      validateStatus: (s) => s < 400,
    })

    const contentType = String(response.headers['content-type'] ?? '')
    if (!contentType.startsWith('image/')) {
      return { ok: false, reason: 'URL does not point to an image' }
    }

    const contentLength = Number(response.headers['content-length'])
    if (contentLength && contentLength > 10 * 1024 * 1024) {
      return { ok: false, reason: 'Image exceeds 10MB limit' }
    }

    return { ok: true, contentLength }
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : 'HEAD request failed' }
  }
}
