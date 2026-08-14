import { describe, expect, it } from 'vitest'
import { unwrapSummaryResult } from '../src/client/summary-remote.ts'
import type { TokenActivitySummary } from '../src/client/contract.ts'

const value: TokenActivitySummary = {
  timeZone: 'UTC',
  generatedAt: 0,
  range: { from: '2026-08-14', to: '2026-08-14' },
  metrics: {
    totalTokens: 0,
    peakDailyTokens: 0,
    longestActiveChatMs: 0,
    currentStreakDays: 0,
    longestStreakDays: 0,
    unreportedCalls: 0,
  },
  days: [],
  backfill: { state: 'complete', completedSessions: 0, totalSessions: 0, failedSessions: 0 },
}

describe('unwrapSummaryResult', () => {
  it('returns a successful summary', () => {
    expect(unwrapSummaryResult({ ok: true, value })).toBe(value)
  })

  it('throws a useful message for a carrier failure', () => {
    expect(() => unwrapSummaryResult({
      ok: false,
      error: { code: 'service-unavailable', message: 'not mounted', details: {} },
    })).toThrow('tokenActivity.summary failed: service-unavailable: not mounted')
  })
})
