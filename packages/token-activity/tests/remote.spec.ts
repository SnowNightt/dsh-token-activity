import { describe, expect, it } from 'vitest'
import TYPERT_REMOTE from '../src/remote.ts'
import { TYPERT } from '../src/typert.host.ts'
import type { TokenActivitySummary } from '../src/types.ts'

function summary(): TokenActivitySummary {
  return {
    timeZone: 'Asia/Shanghai',
    generatedAt: 1,
    range: { from: '2026-08-13', to: '2026-08-14' },
    metrics: {
      totalTokens: 30,
      peakDailyTokens: 30,
      longestActiveChatMs: 1_000,
      currentStreakDays: 1,
      longestStreakDays: 1,
      unreportedCalls: 0,
    },
    days: [{
      date: '2026-08-14',
      totalTokens: 30,
      models: [{ provider: 'deepseek', model: 'deepseek-chat', tokens: 30 }],
    }],
    backfill: {
      state: 'complete',
      completedSessions: 1,
      totalSessions: 1,
      failedSessions: 0,
    },
  }
}

describe('tokenActivity Remote contribution', () => {
  it('publishes a strict Host manifest through the same descriptors', () => {
    expect(TYPERT).toMatchObject({
      package: '@snownightt/dsh-token-activity',
      face: 'host',
      schemas: [],
      model: { services: [], events: [], objects: [] },
    })
    expect(TYPERT.invocations).toBe(TYPERT_REMOTE.descriptors)
  })

  it('publishes the summary endpoint under the expected namespace', () => {
    expect(TYPERT_REMOTE.package).toBe('@snownightt/dsh-token-activity')
    expect(TYPERT_REMOTE.descriptors).toHaveLength(1)
    expect(TYPERT_REMOTE.descriptors[0]).toMatchObject({
      service: 'tokenActivity',
      namespace: 'tokenActivity',
      method: 'summary',
      invocation: { kind: 'direct' },
      parameters: [],
    })
  })

  it('accepts a complete summary and rejects an invalid backfill state', () => {
    const descriptor = TYPERT_REMOTE.descriptors[0]!
    const codec = descriptor.result
    expect(codec.mode).toBe('strict')
    if (codec.mode !== 'strict') throw new Error('expected a strict result codec')
    expect(codec.schema.parse(summary())).toEqual(summary())
    expect(() => codec.schema.parse({
      ...summary(),
      backfill: { ...summary().backfill, state: 'broken' },
    })).toThrow()
  })
})
