import { describe, it, expect } from 'vitest'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function scoreTrivia(correctCount: number, totalCount: number, maxPoints: number): number {
  return Math.round((correctCount / totalCount) * maxPoints)
}

describe('trivia scoring formula', () => {
  it('all correct: full points', () => {
    expect(scoreTrivia(50, 50, 100)).toBe(100)
  })

  it('half correct: half points', () => {
    expect(scoreTrivia(25, 50, 100)).toBe(50)
  })

  it('none correct: zero points', () => {
    expect(scoreTrivia(0, 50, 100)).toBe(0)
  })

  it('1/3 correct rounds correctly', () => {
    expect(scoreTrivia(1, 3, 100)).toBe(33)
  })

  it('2/3 correct rounds correctly', () => {
    expect(scoreTrivia(2, 3, 100)).toBe(67)
  })
})

describe('Fisher-Yates shuffle', () => {
  it('preserves all elements', () => {
    const input = Array.from({ length: 60 }, (_, i) => `q-${i}`)
    const result = shuffle(input)
    expect(result).toHaveLength(60)
    expect(new Set(result)).toEqual(new Set(input))
  })

  it('slice to 50 produces exactly 50 elements', () => {
    const input = Array.from({ length: 60 }, (_, i) => i)
    expect(shuffle(input).slice(0, 50)).toHaveLength(50)
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
