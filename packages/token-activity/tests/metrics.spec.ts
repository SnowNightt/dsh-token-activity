import { describe, expect, it } from 'vitest'
import type { TokenActivityProjection } from '../src/core/fold.ts'
import { computeStreaks, mergeProjections, peakDailyTokens } from '../src/core/metrics.ts'

function projection(
  totalTokens: number,
  activeMs: number,
  unreportedCalls: number,
  days: Record<string, { totalTokens: number; models: { provider: string; model: string; tokens: number }[] }>,
): TokenActivityProjection {
  return { totalTokens, activeMs, unreportedCalls, days }
}

describe('mergeProjections', () => {
  it('sums totals and keeps per-model day buckets', () => {
    const merged = mergeProjections([
      projection(10, 100, 1, {
        '2026-08-14': { totalTokens: 10, models: [{ provider: 'openai', model: 'gpt-5.6', tokens: 10 }] },
      }),
      projection(20, 200, 2, {
        '2026-08-14': { totalTokens: 20, models: [{ provider: 'openai', model: 'gpt-5.6', tokens: 20 }] },
      }),
    ])
    expect(merged.totalTokens).toBe(30)
    expect(merged.unreportedCalls).toBe(3)
    expect(merged.longestActiveChatMs).toBe(200)
    expect(merged.days['2026-08-14']!.totalTokens).toBe(30)
  })
})

describe('peakDailyTokens', () => {
  it('finds the highest single-day total', () => {
    const merged = mergeProjections([
      projection(100, 0, 0, {
        '2026-08-12': { totalTokens: 40, models: [] },
        '2026-08-13': { totalTokens: 100, models: [] },
        '2026-08-14': { totalTokens: 5, models: [] },
      }),
    ])
    expect(peakDailyTokens(merged.days)).toBe(100)
  })
})

describe('computeStreaks (AC-08)', () => {
  const tz = 'Asia/Shanghai'

  it('current streak ends at today; longest is the max run anywhere', () => {
    const merged = mergeProjections([
      projection(0, 0, 0, {
        '2026-08-10': { totalTokens: 1, models: [] },
        '2026-08-11': { totalTokens: 1, models: [] },
        '2026-08-12': { totalTokens: 1, models: [] },
        '2026-08-13': { totalTokens: 1, models: [] },
        '2026-08-14': { totalTokens: 1, models: [] },
      }),
    ])
    const streaks = computeStreaks(merged.days, '2026-08-14', tz)
    expect(streaks.currentStreakDays).toBe(5)
    expect(streaks.longestStreakDays).toBe(5)
  })

  it('current streak is 0 when today is inactive', () => {
    const merged = mergeProjections([
      projection(0, 0, 0, {
        '2026-08-09': { totalTokens: 1, models: [] },
        '2026-08-10': { totalTokens: 1, models: [] },
      }),
    ])
    const streaks = computeStreaks(merged.days, '2026-08-14', tz)
    expect(streaks.currentStreakDays).toBe(0)
    expect(streaks.longestStreakDays).toBe(2)
  })

  it('longest streak spans across month boundaries', () => {
    const merged = mergeProjections([
      projection(0, 0, 0, {
        '2026-07-30': { totalTokens: 1, models: [] },
        '2026-07-31': { totalTokens: 1, models: [] },
        '2026-08-01': { totalTokens: 1, models: [] },
        '2026-08-02': { totalTokens: 1, models: [] },
      }),
    ])
    const streaks = computeStreaks(merged.days, '2026-08-02', tz)
    expect(streaks.longestStreakDays).toBe(4)
  })

  it('reports the historical longest (12) regardless of current (AC-08)', () => {
    const days: Record<string, { totalTokens: number; models: never[] }> = {}
    for (let i = 0; i < 12; i += 1) {
      days[`2026-01-${String(i + 1).padStart(2, '0')}`] = { totalTokens: 1, models: [] }
    }
    const merged = mergeProjections([projection(0, 0, 0, days)])
    const streaks = computeStreaks(merged.days, '2026-08-14', tz)
    expect(streaks.longestStreakDays).toBe(12)
    expect(streaks.currentStreakDays).toBe(0)
  })
})
