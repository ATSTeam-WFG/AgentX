import { GoogleGenAI } from '@google/genai'
import { prisma } from '../db'
import { config } from '../config'
import { downloadBuffer, uploadBuffer, deleteObject, publicUrl } from '../lib/storage'
import { sendPushToUser } from '../lib/push'
import { invalidateLeaderboardCache } from '../lib/leaderboard-cache'

const SYSTEM_PROMPT = `TASK: Composite the uploaded person into the uploaded ES26 ATS backdrop as a photorealistic executive portrait.

HARD CONSTRAINTS (must not violate):
1. Preserve facial identity exactly — bone structure, eye shape, skin tone, distinguishing features of the uploaded person.
2. Preserve the ATS backdrop pixel-for-pixel. Do not regenerate, restyle, or alter the background.

SUBJECT TREATMENT:
- Photorealistic rendering, not stylized. Skin texture, fabric weave, and hair detail should read as photographic.
- Wardrobe: tailored charcoal blazer, crisp white open-collar shirt, no tie. Polished but not corporate-stiff.
- Pose: confident, three-quarter turn toward camera, relaxed shoulders.

INTEGRATION:
- Match the backdrop's color temperature and key light direction.
- Add subtle rim lighting consistent with the scene's ambient glow.
- Cinematic reflections in eyes and on skin where appropriate.
- Clean, soft edge blending — no cutout halo.

REFERENCE: high-end live portrait captured at a futuristic executive summit. Premium and confident, not cartoonish.`

const USER_TURN_TEXT =
  'The first image is the subject (preserve facial identity). ' +
  'The second image is the ES26 ATS backdrop (preserve exactly). ' +
  'Composite the subject into the backdrop per the system instructions.'

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

  // 2. Download backdrop from R2
  const backdropBuffer = await downloadBuffer(`backdrops/backdrop-${backdropId}.jpg`)
  const backdropBase64 = backdropBuffer.toString('base64')

  // 3. Call Gemini image generation
  console.log(`[avatar] calling Gemini for job ${jobId}, backdrop ${backdropId}`)
  const ai = new GoogleGenAI({ apiKey: config.GOOGLE_AI_API_KEY })

  const result = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: selfieMime as 'image/jpeg' | 'image/png', data: selfieBase64 } },
          { inlineData: { mimeType: 'image/jpeg', data: backdropBase64 } },
          { text: USER_TURN_TEXT },
        ],
      },
    ],
    config: {
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      imageConfig: { aspectRatio: '3:4', imageSize: '2K' },
      responseModalities: ['IMAGE', 'TEXT'],
    },
  })

  const parts = result.candidates?.[0]?.content?.parts ?? []
  for (const p of parts) {
    if ((p as { text?: string }).text) {
      console.log('[avatar] Gemini text:', (p as { text: string }).text)
    }
  }

  const imagePart = parts.find(
    (p: { inlineData?: unknown }) => p.inlineData,
  ) as { inlineData: { data: string; mimeType: string } } | undefined

  console.log(`[avatar] Gemini response: ${parts.length} part(s), has image: ${!!imagePart}`)
  if (!imagePart?.inlineData?.data) {
    throw new Error('Gemini returned no image in response')
  }

  // 4. Upload generated avatar to R2
  const userRecord = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } })
  const nameSlug = (userRecord?.name ?? 'unknown')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const avatarKey = `avatars/${nameSlug}-${userId.slice(0, 6)}.jpg`
  const imageBuffer = Buffer.from(imagePart.inlineData.data, 'base64')
  await uploadBuffer(avatarKey, imageBuffer, 'image/jpeg', 'public, max-age=31536000, immutable')
  const avatarUrl = publicUrl(avatarKey)

  // 5. Persist avatar URL, award 150 pts, mark job done
  // Guard against re-awarding on crash+retry: if avatarUrl is already set the points were
  // already credited in a prior attempt's committed transaction, so skip the increment.
  await prisma.$transaction(async (tx) => {
    const current = await tx.user.findUnique({ where: { id: userId }, select: { avatarUrl: true } })
    const alreadyAwarded = !!current?.avatarUrl

    await tx.user.update({ where: { id: userId }, data: { avatarUrl } })

    if (!alreadyAwarded) {
      await tx.userScore.upsert({
        where: { userId },
        update: { totalPoints: { increment: 150 }, activitiesCompleted: { increment: 1 } },
        create: { userId, totalPoints: 150, activitiesCompleted: 1 },
      })
    }

    await tx.job.update({
      where: { id: jobId },
      data: { status: 'done', completedAt: new Date() },
    })
  })

  invalidateLeaderboardCache()

  // 6. Delete selfie (no longer needed)
  await deleteObject(selfieKey).catch(() => {})

  // 7. Push notification (fire-and-forget, delayed 3s)
  setTimeout(() => {
    sendPushToUser(userId, {
      title: 'Your avatar is ready!',
      body: 'Tap to view your AI-generated summit avatar.',
      url: '/activities/avatar',
    }).catch(() => {})
  }, 3_000)
}
