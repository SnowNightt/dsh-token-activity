import { describe, expect, it } from 'vitest'
import type { TokenActivityProjection } from '../src/core/fold.ts'
import { TokenActivityAggregate } from '../src/aggregate.ts'

const day = (tokens: number): TokenActivityProjection['days'][string] => ({
  totalTokens: tokens,
  models: tokens > 0 ? [{ provider: 'openai', model: 'gpt-5.6', tokens }] : [],
})

function projection(days: Record<string, number>, activeMs = 0): TokenActivityProjection {
  return {
    days: Object.fromEntries(Object.entries(days).map(([k, v]) => [k, day(v)])),
    totalTokens: Object.values(days).reduce((a, b) => a + b, 0),
    activeMs,
    unreportedCalls: 0,
  }
}

describe('TokenActivityAggregate', () => {
  const now = Date.UTC(2026, 7, 14, 12) // 2026-08-14 UTC

  it('merges sessions and removes deleted ones (AC-12)', () => {
    const aggregate = new TokenActivityAggregate('UTC')
    aggregate.setSession('s1', projection({ '2026-08-14': 100 }))
    aggregate.setSession('s2', projection({ '2026-08-13': 50, '2026-08-14': 200 }))

    let summary = aggregate.buildSummary(now, 3)
    expect(summary.metrics.totalTokens).toBe(350)
    expect(summary.metrics.peakDailyTokens).toBe(300)

    // Deleting s2 removes its exclusive tokens everywhere.
    aggregate.deleteSession('s2')
    summary = aggregate.buildSummary(now, 3)
    expect(summary.metrics.totalTokens).toBe(100)
    expect(summary.metrics.peakDailyTokens).toBe(100)
    expect(summary.days.find(d => d.date === '2026-08-13')).toBeUndefined()
  })

  it('only lists active days inside the range', () => {
    const aggregate = new TokenActivityAggregate('UTC')
    aggregate.setSession('s1', projection({ '2026-08-14': 100, '2025-01-01': 999 }))
    const summary = aggregate.buildSummary(now, 365)
    const dates = summary.days.map(d => d.date)
    expect(dates).toContain('2026-08-14')
    expect(dates).not.toContain('2025-01-01') // outside the 365-day window
    // Metrics still cover all history.
    expect(summary.metrics.totalTokens).toBe(1099)
  })

  it('computes range from/to around today', () => {
    const aggregate = new TokenActivityAggregate('UTC')
    const summary = aggregate.buildSummary(now, 365)
    expect(summary.range.to).toBe('2026-08-14')
    expect(summary.range.from).toBe('2025-08-15')
  })

  it('reports backfill state verbatim', () => {
    const aggregate = new TokenActivityAggregate('UTC')
    aggregate.setBackfill({ state: 'running', completedSessions: 3, totalSessions: 10, failedSessions: 1 })
    expect(aggregate.buildSummary(now).backfill.state).toBe('running')
    expect(aggregate.buildSummary(now).backfill.failedSessions).toBe(1)
  })
})
