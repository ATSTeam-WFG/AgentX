import { describe, it, expect } from 'vitest'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function scoreTrivia(correctCount: number, pointsPerQuestion: number): number {
  return correctCount * pointsPerQuestion
}

describe('trivia scoring formula', () => {
  it('all correct: full points', () => {
    expect(scoreTrivia(20, 10)).toBe(200)
  })

  it('half correct: half points', () => {
    expect(scoreTrivia(10, 10)).toBe(100)
  })

  it('none correct: zero points', () => {
    expect(scoreTrivia(0, 10)).toBe(0)
  })

  it('one correct: exactly one question worth of points', () => {
    expect(scoreTrivia(1, 10)).toBe(10)
  })

  it('custom pointsPerQuestion', () => {
    expect(scoreTrivia(5, 20)).toBe(100)
  })
})

describe('Fisher-Yates shuffle', () => {
  it('preserves all elements', () => {
    const input = Array.from({ length: 20 }, (_, i) => `q-${i}`)
    const result = shuffle(input)
    expect(result).toHaveLength(20)
    expect(new Set(result)).toEqual(new Set(input))
  })

  it('slice to 20 produces exactly 20 elements when bank has 20', () => {
    const input = Array.from({ length: 20 }, (_, i) => i)
    expect(shuffle(input).slice(0, 20)).toHaveLength(20)
  })

  it('does not mutate the original array', () => {
    const input = [1, 2, 3, 4, 5]
    const copy = [...input]
    shuffle(input)
    expect(input).toEqual(copy)
  })

  it('produces different orderings (probabilistic — fails ~1/120 times on 5-elem array)', () => {
    const input = [1, 2, 3, 4, 5]
    const results = new Set(Array.from({ length: 20 }, () => shuffle(input).join(',')))
    expect(results.size).toBeGreaterThan(1)
  })
})
