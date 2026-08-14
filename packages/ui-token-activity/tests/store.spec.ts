import { describe, expect, it, vi } from 'vitest'
import { TokenActivityStore } from '../src/client/store.ts'
import type { TokenActivitySummary } from '../src/client/contract.ts'

function summary(backfillState: TokenActivitySummary['backfill']['state'] = 'complete'): TokenActivitySummary {
  return {
    timeZone: 'UTC',
    generatedAt: 0,
    range: { from: '2025-08-15', to: '2026-08-14' },
    metrics: {
      totalTokens: 100,
      peakDailyTokens: 100,
      longestActiveChatMs: 0,
      currentStreakDays: 0,
      longestStreakDays: 0,
      unreportedCalls: 0,
    },
    days: [{ date: '2026-08-14', totalTokens: 100, models: [{ provider: 'openai', model: 'gpt-5.6', tokens: 100 }] }],
    backfill: { state: backfillState, completedSessions: 0, totalSessions: 0, failedSessions: 0 },
  }
}

describe('TokenActivityStore (FR-06)', () => {
  it('loads to ready', async () => {
    const store = new TokenActivityStore({ fetchSummary: async () => summary() })
    expect(store.getSnapshot().kind).toBe('loading')
    await store.load()
    expect(store.getSnapshot().kind).toBe('ready')
  })

  it('captures failures without throwing', async () => {
    const store = new TokenActivityStore({ fetchSummary: async () => { throw new Error('boom') } })
    await store.load()
    expect(store.getSnapshot()).toMatchObject({ kind: 'error', message: 'boom' })
  })

  it('retries without reloading the page', async () => {
    let calls = 0
    const store = new TokenActivityStore({
      fetchSummary: async () => {
        calls += 1
        if (calls === 1) throw new Error('first fails')
        return summary()
      },
    })
    await store.load()
    expect(store.getSnapshot().kind).toBe('error')
    store.retry()
    expect(store.getSnapshot().kind).toBe('loading')
    await vi.waitFor(() => expect(store.getSnapshot().kind).toBe('ready'))
    expect(calls).toBe(2)
  })

  it('polls while a backfill is running', async () => {
    vi.useFakeTimers()
    const states: Array<string> = ['running', 'running', 'complete']
    let calls = 0
    const store = new TokenActivityStore({
      pollIntervalMs: 1500,
      fetchSummary: async () => {
        const state = states[Math.min(calls, states.length - 1)]
        calls += 1
        return summary(state as 'running' | 'complete')
      },
    })
    await store.load()
    expect(store.getSnapshot()).toMatchObject({ kind: 'ready' })
    const first = store.getSnapshot()
    expect(first.kind === 'ready' && first.summary.backfill.state).toBe('running')
    await vi.advanceTimersByTimeAsync(1500)
    await vi.advanceTimersByTimeAsync(1500)
    const snap = store.getSnapshot()
    expect(snap.kind === 'ready' && snap.summary.backfill.state).toBe('complete')
    store.dispose()
    vi.useRealTimers()
  })
})
