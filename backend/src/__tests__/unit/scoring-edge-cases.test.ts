import { vi, describe, it, expect, beforeEach } from 'vitest'

// ── Hoist mock references so vi.mock factories can use them ──────────────────
const mocks = vi.hoisted(() => ({
  messagesCreate: vi.fn(),
}))

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mocks.messagesCreate },
  })),
}))

vi.mock('../../config', () => ({
  config: {
    ANTHROPIC_API_KEY: 'test-anthropic-key',
    JWT_SECRET: 'test-jwt-secret-that-is-long-enough',
  },
}))

// Use dynamic import so scoring.ts is loaded AFTER mocks are registered,
// bypassing any cached version loaded by setupFiles.
let scoreGoldenPoints: (text: string, questionText: string) => Promise<{
  aiScore: number
  aiFeedback: string
  status: string
  pointsAwarded: number
}>

beforeEach(async () => {
  mocks.messagesCreate.mockReset()
  vi.resetModules()
  const mod = await import('../../lib/scoring')
  scoreGoldenPoints = mod.scoreGoldenPoints
})

const QUESTION = 'How is AI transforming the title & escrow industry?'
const SAMPLE_TEXT = 'A lengthy professional response about the industry.'

function makeResponse(scores: {
  specificity: number
  relevance: number
  depth: number
  authenticity: number
}) {
  const total = scores.specificity + scores.relevance + scores.depth + scores.authenticity
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({ scores, total, feedback: 'Good specificity in your response.' }),
    }],
  }
}

describe('scoreGoldenPoints — API response parsing', () => {
  it('parses valid JSON and maps scores correctly', async () => {
    mocks.messagesCreate.mockResolvedValue(makeResponse({ specificity: 20, relevance: 20, depth: 20, authenticity: 20 }))
    const result = await scoreGoldenPoints(SAMPLE_TEXT, QUESTION)
    expect(result.aiScore).toBe(80)
    expect(result.pointsAwarded).toBe(75)
    expect(result.status).toBe('ai_scored')
    expect(result.aiFeedback).toBe('Good specificity in your response.')
  })

  it('strips markdown json fences before parsing', async () => {
    const raw = '```json\n' + JSON.stringify({
      scores: { specificity: 22, relevance: 22, depth: 22, authenticity: 22 },
      total: 88,
      feedback: 'Excellent specificity.',
    }) + '\n```'
    mocks.messagesCreate.mockResolvedValue({ content: [{ type: 'text', text: raw }] })
    const result = await scoreGoldenPoints(SAMPLE_TEXT, QUESTION)
    expect(result.aiScore).toBe(88)
    expect(result.pointsAwarded).toBe(75)
  })

  it('strips plain ``` fences before parsing', async () => {
    const raw = '```\n' + JSON.stringify({
      scores: { specificity: 24, relevance: 24, depth: 24, authenticity: 24 },
      total: 96,
      feedback: 'Outstanding.',
    }) + '\n```'
    mocks.messagesCreate.mockResolvedValue({ content: [{ type: 'text', text: raw }] })
    const result = await scoreGoldenPoints(SAMPLE_TEXT, QUESTION)
    expect(result.aiScore).toBe(96)
    expect(result.pointsAwarded).toBe(100)
  })

  it('throws on malformed JSON response', async () => {
    mocks.messagesCreate.mockResolvedValue({ content: [{ type: 'text', text: 'not json at all {{}}' }] })
    await expect(scoreGoldenPoints(SAMPLE_TEXT, QUESTION)).rejects.toThrow('Failed to parse AI scoring response')
  })

  it('throws when response is missing scores object', async () => {
    mocks.messagesCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify({ total: 80, feedback: 'ok' }) }],
    })
    await expect(scoreGoldenPoints(SAMPLE_TEXT, QUESTION)).rejects.toThrow('AI response missing scores object')
  })

  it('throws when content block is not text type', async () => {
    mocks.messagesCreate.mockResolvedValue({ content: [{ type: 'image' }] })
    await expect(scoreGoldenPoints(SAMPLE_TEXT, QUESTION)).rejects.toThrow('Unexpected response format')
  })

  it('throws when content array is empty', async () => {
    mocks.messagesCreate.mockResolvedValue({ content: [] })
    await expect(scoreGoldenPoints(SAMPLE_TEXT, QUESTION)).rejects.toThrow('Unexpected response format')
  })
})

describe('scoreGoldenPoints — dimension clamping', () => {
  it('clamps dimension scores over 25 to 25 before summing', async () => {
    mocks.messagesCreate.mockResolvedValue(makeResponse({ specificity: 30, relevance: 25, depth: 25, authenticity: 25 }))
    const result = await scoreGoldenPoints(SAMPLE_TEXT, QUESTION)
    // specificity clamped from 30 → 25, total = 25+25+25+25 = 100
    expect(result.aiScore).toBe(100)
    expect(result.pointsAwarded).toBe(100)
  })

  it('clamps negative dimension scores to 0 before summing', async () => {
    mocks.messagesCreate.mockResolvedValue(makeResponse({ specificity: -5, relevance: 25, depth: 25, authenticity: 25 }))
    const result = await scoreGoldenPoints(SAMPLE_TEXT, QUESTION)
    // specificity clamped from -5 → 0, total = 0+25+25+25 = 75
    expect(result.aiScore).toBe(75)
    expect(result.pointsAwarded).toBe(75)
  })

  it('uses fallback feedback when feedback field is empty string', async () => {
    const payload = { scores: { specificity: 20, relevance: 20, depth: 20, authenticity: 20 }, total: 80, feedback: '' }
    mocks.messagesCreate.mockResolvedValue({ content: [{ type: 'text', text: JSON.stringify(payload) }] })
    const result = await scoreGoldenPoints(SAMPLE_TEXT, QUESTION)
    expect(result.aiFeedback).toBe("Thanks for sharing your thoughts!")
  })

  it('uses fallback feedback when feedback field is missing', async () => {
    const payload = { scores: { specificity: 20, relevance: 20, depth: 20, authenticity: 20 }, total: 80 }
    mocks.messagesCreate.mockResolvedValue({ content: [{ type: 'text', text: JSON.stringify(payload) }] })
    const result = await scoreGoldenPoints(SAMPLE_TEXT, QUESTION)
    expect(result.aiFeedback).toBe("Thanks for sharing your thoughts!")
  })
})

describe('scoreGoldenPoints — status and points thresholds', () => {
  it.each([
    [{ specificity: 0, relevance: 0, depth: 0, authenticity: 0 }, 0, 0, 'rejected'],
    [{ specificity: 7, relevance: 7, depth: 7, authenticity: 7 }, 28, 0, 'rejected'],
    [{ specificity: 8, relevance: 7, depth: 7, authenticity: 8 }, 30, 25, 'ai_scored'],
    [{ specificity: 13, relevance: 12, depth: 12, authenticity: 13 }, 50, 50, 'ai_scored'],
    [{ specificity: 19, relevance: 18, depth: 19, authenticity: 19 }, 75, 75, 'ai_scored'],
    [{ specificity: 23, relevance: 22, depth: 23, authenticity: 22 }, 90, 100, 'ai_scored'],
  ] as [{ specificity: number; relevance: number; depth: number; authenticity: number }, number, number, string][])(
    'scores %j → aiScore=%i, points=%i, status=%s',
    async (scores, expectedAiScore, expectedPoints, expectedStatus) => {
      mocks.messagesCreate.mockResolvedValue(makeResponse(scores))
      const result = await scoreGoldenPoints(SAMPLE_TEXT, QUESTION)
      expect(result.aiScore).toBe(expectedAiScore)
      expect(result.pointsAwarded).toBe(expectedPoints)
      expect(result.status).toBe(expectedStatus)
    },
  )
})
