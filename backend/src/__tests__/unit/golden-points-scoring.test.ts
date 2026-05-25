import { describe, it, expect } from 'vitest'

// Copied from src/lib/scoring.ts — pure-logic tests, no API, no DB.
function stripCodeFences(raw: string): string {
  return raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(n)))
}

function mapScoreToPoints(aiScore: number): number {
  if (aiScore >= 90) return 100
  if (aiScore >= 75) return 75
  if (aiScore >= 50) return 50
  if (aiScore >= 30) return 25
  return 0
}

function deriveStatus(aiScore: number): 'rejected' | 'ai_scored' {
  if (aiScore < 30) return 'rejected'
  return 'ai_scored'
}

describe('mapScoreToPoints', () => {
  it.each([
    // tier: 0–29 → 0 pts
    [0,   0],
    [1,   0],
    [29,  0],
    // tier: 30–49 → 25 pts
    [30,  25],
    [40,  25],
    [49,  25],
    // tier: 50–74 → 50 pts
    [50,  50],
    [60,  50],
    [74,  50],
    // tier: 75–89 → 75 pts
    [75,  75],
    [80,  75],
    [89,  75],
    // tier: 90–100 → 100 pts
    [90,  100],
    [95,  100],
    [100, 100],
  ] as [number, number][])('score %i → %i points', (score, expected) => {
    expect(mapScoreToPoints(score)).toBe(expected)
  })
})

describe('deriveStatus', () => {
  it.each([
    [0,   'rejected'],
    [29,  'rejected'],
    [30,  'ai_scored'],
    [75,  'ai_scored'],
    [100, 'ai_scored'],
  ] as [number, string][])('score %i → %s', (score, expected) => {
    expect(deriveStatus(score)).toBe(expected)
  })
})

describe('clamp', () => {
  it('clamps above max to max', () => expect(clamp(30, 0, 25)).toBe(25))
  it('clamps below min to min', () => expect(clamp(-5, 0, 25)).toBe(0))
  it('passes through in-range value unchanged', () => expect(clamp(15, 0, 25)).toBe(15))
  it('rounds floats to nearest integer', () => {
    expect(clamp(12.4, 0, 25)).toBe(12)
    expect(clamp(12.5, 0, 25)).toBe(13)
  })
  it('accepts boundary values as-is', () => {
    expect(clamp(0, 0, 25)).toBe(0)
    expect(clamp(25, 0, 25)).toBe(25)
  })
})

describe('server-side total recomputation', () => {
  it('sums four clamped dimensions correctly', () => {
    const s = { specificity: 20, relevance: 18, depth: 15, authenticity: 22 }
    const total = clamp(s.specificity, 0, 25) + clamp(s.relevance, 0, 25) +
                  clamp(s.depth, 0, 25)        + clamp(s.authenticity, 0, 25)
    expect(total).toBe(75)
    expect(mapScoreToPoints(total)).toBe(75)
    expect(deriveStatus(total)).toBe('ai_scored')
  })

  it('clamps out-of-range dimensions before summing', () => {
    const s = { specificity: 30, relevance: -5, depth: 25, authenticity: 25 }
    const total = clamp(s.specificity, 0, 25) + clamp(s.relevance, 0, 25) +
                  clamp(s.depth, 0, 25)        + clamp(s.authenticity, 0, 25)
    expect(total).toBe(75) // 25 + 0 + 25 + 25
  })

  it('all zeros → 0 pts, rejected', () => {
    expect(mapScoreToPoints(0)).toBe(0)
    expect(deriveStatus(0)).toBe('rejected')
  })

  it('all 25s → 100 pts, ai_scored', () => {
    const s = { specificity: 25, relevance: 25, depth: 25, authenticity: 25 }
    const total = clamp(s.specificity, 0, 25) + clamp(s.relevance, 0, 25) +
                  clamp(s.depth, 0, 25)        + clamp(s.authenticity, 0, 25)
    expect(total).toBe(100)
    expect(mapScoreToPoints(total)).toBe(100)
    expect(deriveStatus(total)).toBe('ai_scored')
  })
})

describe('markdown code fence stripping', () => {
  it('strips ```json fence', () => {
    const raw = '```json\n{"scores":{"specificity":20}}\n```'
    expect(stripCodeFences(raw)).toBe('{"scores":{"specificity":20}}')
  })

  it('strips plain ``` fence', () => {
    const raw = '```\n{"scores":{}}\n```'
    expect(stripCodeFences(raw)).toBe('{"scores":{}}')
  })

  it('passes through plain JSON unchanged', () => {
    const raw = '{"scores":{"specificity":20}}'
    expect(stripCodeFences(raw)).toBe(raw)
  })

  it('trims surrounding whitespace', () => {
    const raw = '  \n```json\n{"a":1}\n```\n  '
    expect(stripCodeFences(raw)).toBe('{"a":1}')
  })
})
