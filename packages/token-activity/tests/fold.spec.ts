import { describe, expect, it } from 'vitest'
import type { FoldEvent, TokenActivityProjection } from '../src/core/fold.ts'
import { foldTokenActivity, initFoldState, viewFoldState } from '../src/core/fold.ts'
import {
  assistantMessage,
  requestHeader,
  stepEnd,
  stepStart,
  turnEnd,
  turnStart,
  usage,
  usageChunk,
} from './helpers.ts'

const TZ = 'Asia/Shanghai'

/** Fold a sequence and return the final wire projection. */
function fold(events: FoldEvent[], timeZone = TZ): TokenActivityProjection {
  let state = initFoldState()
  for (const event of events) state = foldTokenActivity(state, event, timeZone)
  return viewFoldState(state)
}

describe('activity tokens (AC-04)', () => {
  it('sums disjoint buckets and never adds reasoning again', () => {
    const events: FoldEvent[] = [
      requestHeader(0, 'openai', 'gpt-5.6'),
      stepStart(1, 1, Date.UTC(2026, 7, 14, 10)),
      usageChunk(1, 1, usage(1000, 500, 4000, 500, 200)),
      stepEnd(1, 1, Date.UTC(2026, 7, 14, 10, 0, 5)),
    ]
    expect(fold(events).totalTokens).toBe(6000)
  })
})

describe('usage dedup and replacement (AC-03, §6.2)', () => {
  it('final message replaces an earlier chunk', () => {
    const events: FoldEvent[] = [
      requestHeader(0, 'openai', 'gpt-5.6'),
      stepStart(1, 1, Date.UTC(2026, 7, 14, 10)),
      usageChunk(1, 1, usage(8000, 0)),
      assistantMessage(1, 1, usage(10000, 0), 'openai', 'gpt-5.6'),
      stepEnd(1, 1, Date.UTC(2026, 7, 14, 10, 0, 5)),
    ]
    expect(fold(events).totalTokens).toBe(10000)
  })

  it('an identical repeat sample does not change the state', () => {
    let state = initFoldState()
    const prefix: FoldEvent[] = [
      requestHeader(0, 'openai', 'gpt-5.6'),
      stepStart(1, 1, Date.UTC(2026, 7, 14, 10)),
      usageChunk(1, 1, usage(8000, 0)),
    ]
    for (const event of prefix) state = foldTokenActivity(state, event, TZ)
    const before = state
    const after = foldTokenActivity(state, usageChunk(1, 1, usage(8000, 0)), TZ)
    expect(after).toBe(before)
  })

  it('a failed request keeps the usage chunk it already recorded', () => {
    const events: FoldEvent[] = [
      requestHeader(0, 'openai', 'gpt-5.6'),
      stepStart(1, 1, Date.UTC(2026, 7, 14, 10)),
      usageChunk(1, 1, usage(8000, 0)),
      stepEnd(1, 1, Date.UTC(2026, 7, 14, 10, 0, 5)),
    ]
    expect(fold(events).totalTokens).toBe(8000)
  })

  it('a final message without usage keeps the earlier chunk', () => {
    const events: FoldEvent[] = [
      requestHeader(0, 'openai', 'gpt-5.6'),
      stepStart(1, 1, Date.UTC(2026, 7, 14, 10)),
      usageChunk(1, 1, usage(8000, 0)),
      assistantMessage(1, 1, undefined, 'openai', 'gpt-5.6'),
      stepEnd(1, 1, Date.UTC(2026, 7, 14, 10, 0, 5)),
    ]
    expect(fold(events).totalTokens).toBe(8000)
  })
})

describe('provider/model identity (§6.3)', () => {
  it('uses message.source when a final message exists', () => {
    const events: FoldEvent[] = [
      requestHeader(0, 'gateway', 'gpt-5.6'),
      stepStart(1, 1, Date.UTC(2026, 7, 14, 10)),
      usageChunk(1, 1, usage(1000, 0)),
      assistantMessage(1, 1, usage(2000, 0), 'openai', 'gpt-5.6'),
      stepEnd(1, 1, Date.UTC(2026, 7, 14, 10, 0, 5)),
    ]
    const projection = fold(events)
    const models = projection.days['2026-08-14']!.models
    expect(models).toHaveLength(1)
    expect(models[0]!.provider).toBe('openai')
  })

  it('uses the request header for a chunk-only sample', () => {
    const events: FoldEvent[] = [
      requestHeader(0, 'deepseek-official', 'deepseek-v4-pro'),
      stepStart(1, 1, Date.UTC(2026, 7, 14, 10)),
      usageChunk(1, 1, usage(500, 100)),
      stepEnd(1, 1, Date.UTC(2026, 7, 14, 10, 0, 5)),
    ]
    const models = fold(events).days['2026-08-14']!.models
    expect(models[0]!.provider).toBe('deepseek-official')
    expect(models[0]!.model).toBe('deepseek-v4-pro')
  })

  it('skips a usage sample with no resolvable provider/model', () => {
    const events: FoldEvent[] = [
      stepStart(1, 1, Date.UTC(2026, 7, 14, 10)),
      usageChunk(1, 1, usage(500, 100)),
      stepEnd(1, 1, Date.UTC(2026, 7, 14, 10, 0, 5)),
    ]
    const projection = fold(events)
    expect(projection.totalTokens).toBe(0)
    expect(Object.keys(projection.days)).toHaveLength(0)
  })
})

describe('cross-model aggregation and disambiguation (AC-01, AC-02)', () => {
  it('merges two models in one day and sorts by tokens desc', () => {
    const events: FoldEvent[] = [
      requestHeader(0, 'openai', 'gpt-5.6'),
      stepStart(1, 1, Date.UTC(2026, 7, 14, 10)),
      usageChunk(1, 1, usage(10000, 0)),
      stepEnd(1, 1, Date.UTC(2026, 7, 14, 10, 0, 5)),
      requestHeader(10, 'deepseek-official', 'deepseek-v4-pro'),
      stepStart(1, 2, Date.UTC(2026, 7, 14, 11)),
      usageChunk(1, 2, usage(20000, 0)),
      stepEnd(1, 2, Date.UTC(2026, 7, 14, 11, 0, 5)),
    ]
    const day = fold(events).days['2026-08-14']!
    expect(day.totalTokens).toBe(30000)
    expect(day.models).toEqual([
      { provider: 'deepseek-official', model: 'deepseek-v4-pro', tokens: 20000 },
      { provider: 'openai', model: 'gpt-5.6', tokens: 10000 },
    ])
  })

  it('keeps same-named models from different providers distinct', () => {
    const events: FoldEvent[] = [
      requestHeader(0, 'openai', 'gpt-5.6'),
      stepStart(1, 1, Date.UTC(2026, 7, 14, 10)),
      usageChunk(1, 1, usage(10000, 0)),
      stepEnd(1, 1, Date.UTC(2026, 7, 14, 10, 0, 5)),
      requestHeader(10, 'gateway', 'gpt-5.6'),
      stepStart(1, 2, Date.UTC(2026, 7, 14, 11)),
      usageChunk(1, 2, usage(5000, 0)),
      stepEnd(1, 2, Date.UTC(2026, 7, 14, 11, 0, 5)),
    ]
    const day = fold(events).days['2026-08-14']!
    expect(day.models).toHaveLength(2)
    const providers = day.models.map(m => m.provider).sort()
    expect(providers).toEqual(['gateway', 'openai'])
  })
})

describe('date attribution (AC-06)', () => {
  const instant = Date.UTC(2026, 7, 14, 16, 30) // 2026-08-14 16:30 UTC

  it('assigns to the next local day under Asia/Shanghai', () => {
    const events: FoldEvent[] = [
      requestHeader(0, 'openai', 'gpt-5.6'),
      stepStart(1, 1, instant),
      usageChunk(1, 1, usage(1000, 0)),
      stepEnd(1, 1, instant + 5000),
    ]
    expect(Object.keys(fold(events, 'Asia/Shanghai').days)).toEqual(['2026-08-15'])
  })

  it('assigns to the UTC day under UTC', () => {
    const events: FoldEvent[] = [
      requestHeader(0, 'openai', 'gpt-5.6'),
      stepStart(1, 1, instant),
      usageChunk(1, 1, usage(1000, 0)),
      stepEnd(1, 1, instant + 5000),
    ]
    expect(Object.keys(fold(events, 'UTC').days)).toEqual(['2026-08-14'])
  })
})

describe('unreported usage (AC-05, §4.6)', () => {
  it('counts a completed step with no usage and adds no tokens', () => {
    const events: FoldEvent[] = [
      requestHeader(0, 'openai', 'gpt-5.6'),
      stepStart(1, 1, Date.UTC(2026, 7, 14, 10)),
      assistantMessage(1, 1, undefined, 'openai', 'gpt-5.6'),
      stepEnd(1, 1, Date.UTC(2026, 7, 14, 10, 0, 5)),
    ]
    const projection = fold(events)
    expect(projection.totalTokens).toBe(0)
    expect(projection.unreportedCalls).toBe(1)
  })

  it('does not count a step that reported a chunk', () => {
    const events: FoldEvent[] = [
      requestHeader(0, 'openai', 'gpt-5.6'),
      stepStart(1, 1, Date.UTC(2026, 7, 14, 10)),
      usageChunk(1, 1, usage(1000, 0)),
      stepEnd(1, 1, Date.UTC(2026, 7, 14, 10, 0, 5)),
    ]
    expect(fold(events).unreportedCalls).toBe(0)
  })
})

describe('turn activity duration (AC-09, §4.5)', () => {
  it('sums complete turn durations and ignores inter-turn idle time', () => {
    const events: FoldEvent[] = [
      turnStart(1, Date.UTC(2026, 7, 14, 10, 0, 0)),
      turnEnd(1, Date.UTC(2026, 7, 14, 10, 2, 0)), // 2 minutes
      turnStart(2, Date.UTC(2026, 7, 14, 11, 0, 0)), // 1 hour idle later
      turnEnd(2, Date.UTC(2026, 7, 14, 11, 3, 0)), // 3 minutes
    ]
    expect(fold(events).activeMs).toBe(5 * 60_000)
  })

  it('ignores an unmatched turn/end', () => {
    const events: FoldEvent[] = [
      turnStart(1, Date.UTC(2026, 7, 14, 10, 0, 0)),
      turnEnd(2, Date.UTC(2026, 7, 14, 10, 5, 0)), // wrong turn id
    ]
    expect(fold(events).activeMs).toBe(0)
  })
})

describe('empty and unhandled events', () => {
  it('returns the same reference for unhandled events', () => {
    const state = initFoldState()
    const event = { type: 'tool/call', time: 0, data: {} } as unknown as FoldEvent
    expect(foldTokenActivity(state, event, TZ)).toBe(state)
  })

  it('produces an empty projection for an empty log', () => {
    expect(fold([])).toEqual({ days: {}, totalTokens: 0, activeMs: 0, unreportedCalls: 0 })
  })
})
