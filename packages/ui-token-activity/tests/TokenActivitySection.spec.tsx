// @vitest-environment jsdom
import { render, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TokenActivityStore } from '../src/client/store.ts'
import { TokenActivitySection } from '../src/client/TokenActivitySection.tsx'
import type { LocaleFace } from '../src/client/TokenActivitySection.tsx'
import type { TokenActivityKey, TokenActivityTranslate } from '../src/client/locales.ts'
import type { TokenActivitySummary } from '../src/client/contract.ts'

function summary(): TokenActivitySummary {
  return {
    timeZone: 'UTC',
    generatedAt: 0,
    range: { from: '2026-08-08', to: '2026-08-14' },
    metrics: {
      totalTokens: 100,
      peakDailyTokens: 100,
      longestActiveChatMs: 0,
      currentStreakDays: 1,
      longestStreakDays: 1,
      unreportedCalls: 0,
    },
    days: [{ date: '2026-08-14', totalTokens: 100, models: [{ provider: 'openai', model: 'gpt-5.6', tokens: 100 }] }],
    backfill: { state: 'complete', completedSessions: 0, totalSessions: 0, failedSessions: 0 },
  }
}

function makeT(): TokenActivityTranslate {
  return (key: TokenActivityKey) => key
}

function makeLocale(): LocaleFace {
  const listeners = new Set<() => void>()
  return {
    getSnapshot: () => ({ active: 'zh-CN' }),
    subscribe: (listener) => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
  }
}

describe('TokenActivitySection (view-refresh)', () => {
  it('refreshes the store every time the section is viewed (mounted)', async () => {
    const fetchSummary = vi.fn(async () => summary())
    const store = new TokenActivityStore({ fetchSummary })
    await store.load()
    expect(fetchSummary).toHaveBeenCalledTimes(1)

    const props = { store, t: makeT(), locale: makeLocale() }
    const view = render(<TokenActivitySection key="view-1" {...props} />)
    await waitFor(() => expect(fetchSummary).toHaveBeenCalledTimes(2))

    // Viewing again (re-mount with a new key) triggers another refresh.
    view.rerender(<TokenActivitySection key="view-2" {...props} />)
    await waitFor(() => expect(fetchSummary).toHaveBeenCalledTimes(3))

    view.unmount()
  })
})
