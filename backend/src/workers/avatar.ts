import { readFileSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { GoogleGenAI } from '@google/genai'
import { prisma } from '../db'
import { config } from '../config'
import { downloadBuffer, uploadBuffer, deleteObject, publicUrl } from '../lib/storage'
import { sendPushToUser } from '../lib/push'

const AVATAR_PROMPT = `Using the uploaded ES26 ATS backdrop exactly as-is, create a highly realistic executive avatar version of the uploaded person.
The final result should feel similar to a premium Snapchat Bitmoji experience, but much more realistic and professional.
Keep the original ATS futuristic city background unchanged.
The subject should appear naturally integrated into the scene with:

- realistic lighting
- cinematic reflections
- clean edge blending
- subtle futuristic atmosphere

Maintain strong facial resemblance and identity accuracy.
Outfit should be modern business-professional with luxury realtor energy.
Slight stylization is okay, but realism should dominate.
The final image should look like a high-end AI-generated event portrait created live at a futuristic executive summit.`

export async function handleAvatarGeneration(jobId: string, payload: Record<string, unknown>) {
  const { selfieKey, backdropId, userId } = payload as {
    selfieKey: string
    backdropId: string
    userId: string
  }

  if (!config.GOOGLE_AI_API_KEY) {
    throw new Error('GOOGLE_AI_API_KEY is not configured')
  }

  // 1. Download selfie from R2
  const selfieBuffer = await downloadBuffer(selfieKey)
  const selfieBase64 = selfieBuffer.toString('base64')
  const selfieExt = selfieKey.endsWith('.png') ? 'png' : 'jpg'
  const selfieMime = selfieExt === 'png' ? 'image/png' : 'image/jpeg'

  // 2. Read backdrop from disk
  const backdropPath = join(process.cwd(), 'assets', 'backdrops', `backdrop${backdropId}.png`)
  const backdropBuffer = readFileSync(backdropPath)
  const backdropBase64 = backdropBuffer.toString('base64')

  // 3. Call Gemini image generation
  const ai = new GoogleGenAI({ apiKey: config.GOOGLE_AI_API_KEY })

  const result = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: selfieMime as 'image/jpeg' | 'image/png', data: selfieBase64 } },
          { inlineData: { mimeType: 'image/png', data: backdropBase64 } },
          { text: AVATAR_PROMPT },
        ],
      },
    ],
    config: { responseModalities: ['IMAGE'] },
  })

  const imagePart = result.candidates?.[0]?.content?.parts?.find(
    (p: { inlineData?: unknown }) => p.inlineData,
  ) as { inlineData: { data: string; mimeType: string } } | undefined

  if (!imagePart?.inlineData?.data) {
    throw new Error('Gemini returned no image in response')
  }

  // 4. Upload generated avatar to R2
  const avatarKey = `avatars/${userId}/${randomUUID()}.jpg`
  const imageBuffer = Buffer.from(imagePart.inlineData.data, 'base64')
  await uploadBuffer(avatarKey, imageBuffer, 'image/jpeg')
  const avatarUrl = publicUrl(avatarKey)

  // 5. Persist avatar URL + mark job done
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { avatarUrl } })
    await tx.job.update({
      where: { id: jobId },
      data: { status: 'done', completedAt: new Date() },
    })
  })

  // 6. Delete selfie (no longer needed)
  await deleteObject(selfieKey).catch(() => {})

  // 7. Push notification (fire-and-forget, delayed 3s)
  setTimeout(() => {
    sendPushToUser(userId, {
      title: 'Your avatar is ready!',
      body: 'Tap to view your AI-generated summit avatar.',
      url: '/activities/avatar-studio',
    }).catch(() => {})
  }, 3_000)
}
