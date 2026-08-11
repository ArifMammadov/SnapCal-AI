import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { env } from './env.js'

const s3Enabled = env.S3_ENDPOINT && env.S3_BUCKET && env.S3_ACCESS_KEY && env.S3_SECRET_KEY

const s3Client = s3Enabled
  ? new S3Client({
      endpoint: env.S3_ENDPOINT,
      region: 'us-east-1',
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY!,
        secretAccessKey: env.S3_SECRET_KEY!,
      },
      forcePathStyle: true,
    })
  : null

export function isS3Enabled() {
  return !!s3Client
}

export async function uploadFileToS3(
  key: string,
  body: Buffer | ReadableStream,
  contentType: string,
  contentLength?: number
): Promise<string> {
  if (!s3Client || !env.S3_BUCKET) {
    throw new Error('S3 is not configured')
  }

  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: env.S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      ACL: 'public-read',
    },
  })

  await upload.done()

  const endpoint = env.S3_ENDPOINT!.replace(/\/$/, '')
  return `${endpoint}/${env.S3_BUCKET}/${key}`
}
