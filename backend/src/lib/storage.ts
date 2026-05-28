import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { Readable } from 'stream'
import { config } from '../config'

let _client: S3Client | null = null

function getClient(): S3Client {
  if (_client) return _client
  if (
    !config.OBJECT_STORAGE_ENDPOINT ||
    !config.OBJECT_STORAGE_ACCESS_KEY ||
    !config.OBJECT_STORAGE_SECRET_KEY
  ) {
    throw new Error('Object storage env vars are not configured')
  }
  _client = new S3Client({
    region: config.OBJECT_STORAGE_REGION ?? 'auto',
    endpoint: config.OBJECT_STORAGE_ENDPOINT,
    credentials: {
      accessKeyId: config.OBJECT_STORAGE_ACCESS_KEY,
      secretAccessKey: config.OBJECT_STORAGE_SECRET_KEY,
    },
  })
  return _client
}

function bucket(): string {
  if (!config.OBJECT_STORAGE_BUCKET) throw new Error('OBJECT_STORAGE_BUCKET is not configured')
  return config.OBJECT_STORAGE_BUCKET
}

export async function uploadBuffer(
  key: string,
  body: Buffer,
  contentType: string,
  cacheControl?: string,
): Promise<void> {
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
      ...(cacheControl && { CacheControl: cacheControl }),
    }),
  )
}

export async function downloadBuffer(key: string): Promise<Buffer> {
  const res = await getClient().send(new GetObjectCommand({ Bucket: bucket(), Key: key }))
  if (!res.Body) throw new Error(`Empty body for key: ${key}`)
  const chunks: Buffer[] = []
  for await (const chunk of res.Body as Readable) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

export async function deleteObject(key: string): Promise<void> {
  await getClient().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }))
}

export function publicUrl(key: string): string {
  if (!config.OBJECT_STORAGE_PUBLIC_URL) throw new Error('OBJECT_STORAGE_PUBLIC_URL is not configured')
  return `${config.OBJECT_STORAGE_PUBLIC_URL.replace(/\/$/, '')}/${key}`
}
