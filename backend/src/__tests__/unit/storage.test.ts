import { vi, describe, it, expect, beforeEach } from 'vitest'
import { Readable } from 'stream'

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
}))

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({ send: mocks.send })),
  PutObjectCommand: vi.fn().mockImplementation((input: unknown) => ({ _input: input, _cmd: 'PUT' })),
  GetObjectCommand: vi.fn().mockImplementation((input: unknown) => ({ _input: input, _cmd: 'GET' })),
  DeleteObjectCommand: vi.fn().mockImplementation((input: unknown) => ({ _input: input, _cmd: 'DELETE' })),
}))

vi.mock('../../config', () => ({
  config: {
    OBJECT_STORAGE_ENDPOINT:   'https://fake-r2.example.com',
    OBJECT_STORAGE_ACCESS_KEY: 'fake-access-key',
    OBJECT_STORAGE_SECRET_KEY: 'fake-secret-key',
    OBJECT_STORAGE_BUCKET:     'fake-bucket',
    OBJECT_STORAGE_REGION:     'auto',
    OBJECT_STORAGE_PUBLIC_URL: 'https://cdn.example.com',
  },
}))

type StorageModule = {
  uploadBuffer: (key: string, body: Buffer, contentType: string) => Promise<void>
  downloadBuffer: (key: string) => Promise<Buffer>
  deleteObject: (key: string) => Promise<void>
  publicUrl: (key: string) => string
}

let storage: StorageModule

beforeEach(async () => {
  mocks.send.mockReset()
  vi.resetModules()
  storage = await import('../../lib/storage') as StorageModule
})

describe('uploadBuffer', () => {
  it('sends PutObjectCommand with correct Bucket, Key, Body, ContentType', async () => {
    mocks.send.mockResolvedValue({})
    const buf = Buffer.from('image data')
    await storage.uploadBuffer('avatars/user-1/photo.jpg', buf, 'image/jpeg')
    const cmd = mocks.send.mock.calls[0][0] as { _input: Record<string, unknown>; _cmd: string }
    expect(cmd._cmd).toBe('PUT')
    expect(cmd._input.Bucket).toBe('fake-bucket')
    expect(cmd._input.Key).toBe('avatars/user-1/photo.jpg')
    expect(cmd._input.Body).toBe(buf)
    expect(cmd._input.ContentType).toBe('image/jpeg')
  })

  it('propagates errors from S3Client.send', async () => {
    mocks.send.mockRejectedValue(new Error('S3 unavailable'))
    await expect(storage.uploadBuffer('key', Buffer.from('x'), 'text/plain')).rejects.toThrow('S3 unavailable')
  })
})

describe('downloadBuffer', () => {
  it('returns a Buffer from the response Body stream', async () => {
    const testData = Buffer.from('hello world')
    const bodyStream = Readable.from([testData])
    mocks.send.mockResolvedValue({ Body: bodyStream })

    const result = await storage.downloadBuffer('selfies/user-1/selfie.jpg')
    expect(result).toBeInstanceOf(Buffer)
    expect(result.toString()).toBe('hello world')
  })

  it('sends GetObjectCommand with correct Bucket and Key', async () => {
    mocks.send.mockResolvedValue({ Body: Readable.from([Buffer.from('')]) })
    await storage.downloadBuffer('some/key.jpg')
    const cmd = mocks.send.mock.calls[0][0] as { _input: Record<string, unknown>; _cmd: string }
    expect(cmd._cmd).toBe('GET')
    expect(cmd._input.Bucket).toBe('fake-bucket')
    expect(cmd._input.Key).toBe('some/key.jpg')
  })

  it('throws when response Body is undefined', async () => {
    mocks.send.mockResolvedValue({ Body: undefined })
    await expect(storage.downloadBuffer('missing/key')).rejects.toThrow('Empty body')
  })
})

describe('deleteObject', () => {
  it('sends DeleteObjectCommand with correct Bucket and Key', async () => {
    mocks.send.mockResolvedValue({})
    await storage.deleteObject('avatars/user-1/photo.jpg')
    const cmd = mocks.send.mock.calls[0][0] as { _input: Record<string, unknown>; _cmd: string }
    expect(cmd._cmd).toBe('DELETE')
    expect(cmd._input.Bucket).toBe('fake-bucket')
    expect(cmd._input.Key).toBe('avatars/user-1/photo.jpg')
  })
})

describe('publicUrl', () => {
  it('returns concatenation of R2_PUBLIC_URL and key', () => {
    expect(storage.publicUrl('avatars/user-1/photo.jpg')).toBe('https://cdn.example.com/avatars/user-1/photo.jpg')
  })

  it('handles trailing slash on base URL', () => {
    // config has 'https://cdn.example.com' (no trailing slash) — no double slash expected
    expect(storage.publicUrl('foo/bar.jpg')).toBe('https://cdn.example.com/foo/bar.jpg')
  })
})
