import { z } from 'zod'

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  QR_HMAC_SECRET: z.string().min(32),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('*'),
  OBJECT_STORAGE_BUCKET: z.string().optional(),
  OBJECT_STORAGE_REGION: z.string().optional(),
  OBJECT_STORAGE_ACCESS_KEY: z.string().optional(),
  OBJECT_STORAGE_SECRET_KEY: z.string().optional(),
  OBJECT_STORAGE_ENDPOINT: z.string().optional(),
  OBJECT_STORAGE_PUBLIC_URL: z.string().optional(),
  STRESS_BYPASS_SECRET: z.string().default(''),
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_AI_API_KEY: z.string().optional(),
  VAPID_PUBLIC_KEY: z.string().min(1).optional(),
  VAPID_PRIVATE_KEY: z.string().min(1).optional(),
  VAPID_CONTACT_EMAIL: z.string().email().optional(),
})

const result = schema.safeParse(process.env)

if (!result.success) {
  console.error('Missing or invalid environment variables:')
  console.error(result.error.flatten().fieldErrors)
  process.exit(1)
}

if (!result.data.ANTHROPIC_API_KEY) {
  console.warn('[config] ANTHROPIC_API_KEY not set — golden points scoring will fail at runtime')
}

if (!result.data.GOOGLE_AI_API_KEY) {
  console.warn('[config] GOOGLE_AI_API_KEY not set — avatar generation will fail at runtime')
}

if (!result.data.VAPID_PUBLIC_KEY || !result.data.VAPID_PRIVATE_KEY) {
  console.warn('[config] VAPID keys not set — push notifications disabled')
}

export const config = result.data
export type Config = typeof config
