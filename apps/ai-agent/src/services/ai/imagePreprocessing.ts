import sharp from 'sharp'
import axios from 'axios'
import { logger } from '@snapcal/shared'

export interface PreprocessResult {
  buffer: Buffer
  mimeType: string
  width: number
  height: number
  originalSizeBytes: number
  finalSizeBytes: number
}

const MAX_DIMENSION = 1280
const JPEG_QUALITY = 85
const MAX_FILE_BYTES = 10 * 1024 * 1024

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export async function preprocessImageFromUrl(imageUrl: string): Promise<PreprocessResult> {
  const start = Date.now()
  try {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 15000,
      maxRedirects: 3,
      headers: { Accept: 'image/*' },
    })

    const originalBuffer = Buffer.from(response.data as ArrayBuffer)
    if (originalBuffer.length > MAX_FILE_BYTES) {
      throw new Error(`Image exceeds ${MAX_FILE_BYTES / 1024 / 1024}MB`)
    }

    const mimeType = response.headers['content-type'] as string
    if (mimeType && !ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new Error(`Unsupported image type: ${mimeType}`)
    }

    const pipeline = sharp(originalBuffer, {
      failOnError: false,
      limitInputPixels: 32_000_000,
    })
      .rotate() // auto-orient from EXIF
      .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: sharp.fit.inside, withoutEnlargement: false })

    const { data, info } = await pipeline
      .jpeg({ quality: JPEG_QUALITY, progressive: true, force: false })
      .toBuffer({ resolveWithObject: true })

    logger.info(
      {
        url: imageUrl,
        originalSize: originalBuffer.length,
        finalSize: data.length,
        width: info.width,
        height: info.height,
        ms: Date.now() - start,
      },
      'image preprocessed',
    )

    return {
      buffer: data,
      mimeType: info.format === 'png' ? 'image/png' : info.format === 'webp' ? 'image/webp' : 'image/jpeg',
      width: info.width,
      height: info.height,
      originalSizeBytes: originalBuffer.length,
      finalSizeBytes: data.length,
    }
  } catch (err) {
    logger.warn({ err, url: imageUrl }, 'image preprocessing failed, passing through')
    // If sharp fails, return original-ish so caller can still try vision
    const buf = await fetchOriginalFallback(imageUrl)
    return {
      buffer: buf,
      mimeType: 'image/jpeg',
      width: 0,
      height: 0,
      originalSizeBytes: buf.length,
      finalSizeBytes: buf.length,
    }
  }
}

async function fetchOriginalFallback(imageUrl: string): Promise<Buffer> {
  const { data } = await axios.get(imageUrl, {
    responseType: 'arraybuffer',
    timeout: 15000,
    maxRedirects: 3,
  })
  return Buffer.from(data as ArrayBuffer)
}
