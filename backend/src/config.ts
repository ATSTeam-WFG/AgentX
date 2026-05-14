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
  STRESS_BYPASS_SECRET: z.string().default(''),
})

const result = schema.safeParse(process.env)

if (!result.success) {
  console.error('Missing or invalid environment variables:')
  console.error(result.error.flatten().fieldErrors)
  process.exit(1)
}

export const config = result.data
export type Config = typeof config
