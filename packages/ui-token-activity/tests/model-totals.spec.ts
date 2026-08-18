import { describe, expect, it } from 'vitest'
import { aggregateModelTotals, buildModelTotalLabels, modelTotalKey } from '../src/client/model-totals.ts'
import type { TokenActivitySummaryDay } from '../src/client/contract.ts'

function day(date: string, models: Array<{ provider: string; model: string; tokens: number }>): TokenActivitySummaryDay {
  return {
    date,
    totalTokens: models.reduce((sum, model) => sum + model.tokens, 0),
    models,
  }
}

describe('aggregateModelTotals (总计栏)', () => {
  it('returns an empty list for no day records', () => {
    expect(aggregateModelTotals([])).toEqual([])
  })

  it('sums the same provider + model across multiple days', () => {
    const totals = aggregateModelTotals([
      day('2026-08-01', [{ provider: 'deepseek', model: 'deepseek-chat', tokens: 1000 }]),
      day('2026-08-02', [{ provider: 'deepseek', model: 'deepseek-chat', tokens: 2500 }]),
      day('2026-08-03', [{ provider: 'deepseek', model: 'deepseek-chat', tokens: 1500 }]),
    ])
    expect(totals).toEqual([{ provider: 'deepseek', model: 'deepseek-chat', tokens: 5000 }])
  })

  it('keeps the same model id under different providers separate', () => {
    const totals = aggregateModelTotals([
      day('2026-08-01', [
        { provider: 'openai', model: 'gpt-5.6', tokens: 3000 },
        { provider: 'deepseek', model: 'gpt-5.6', tokens: 2000 },
      ]),
    ])
    expect(totals).toEqual([
      { provider: 'openai', model: 'gpt-5.6', tokens: 3000 },
      { provider: 'deepseek', model: 'gpt-5.6', tokens: 2000 },
    ])
  })

  it('sorts tokens desc, then provider id, then model id (stable rule)', () => {
    const totals = aggregateModelTotals([
      day('2026-08-01', [
        { provider: 'b', model: 'm', tokens: 100 },
        { provider: 'a', model: 'm', tokens: 100 },
        { provider: 'a', model: 'm2', tokens: 900 },
        { provider: 'a', model: 'm3', tokens: 100 },
      ]),
    ])
    expect(totals.map(item => `${item.provider}/${item.model}/${item.tokens}`)).toEqual([
      'a/m2/900',
      'a/m/100',
      'a/m3/100',
      'b/m/100',
    ])
  })

  it('aggregates every model present on any day', () => {
    const totals = aggregateModelTotals([
      day('2026-08-01', [{ provider: 'deepseek', model: 'deepseek-reasoner', tokens: 8000 }]),
      day('2026-08-02', [{ provider: 'deepseek', model: 'deepseek-chat', tokens: 7000 }]),
    ])
    expect(totals).toHaveLength(2)
    expect(totals[0]).toEqual({ provider: 'deepseek', model: 'deepseek-reasoner', tokens: 8000 })
    expect(totals[1]).toEqual({ provider: 'deepseek', model: 'deepseek-chat', tokens: 7000 })
  })
})

describe('buildModelTotalLabels', () => {
  it('keeps a bare model id when the name is unique', () => {
    const totals = [{ provider: 'deepseek', model: 'deepseek-chat', tokens: 10 }]
    const labels = buildModelTotalLabels(totals)
    expect(labels.get(modelTotalKey('deepseek', 'deepseek-chat'))).toBe('deepseek-chat')
  })

  it('disambiguates with `Provider · Model` when the name repeats across providers', () => {
    const totals = [
      { provider: 'openai', model: 'gpt-5.6', tokens: 20 },
      { provider: 'deepseek', model: 'gpt-5.6', tokens: 10 },
    ]
    const labels = buildModelTotalLabels(totals)
    expect(labels.get(modelTotalKey('openai', 'gpt-5.6'))).toBe('openai · gpt-5.6')
    expect(labels.get(modelTotalKey('deepseek', 'gpt-5.6'))).toBe('deepseek · gpt-5.6')
  })

  it('returns an empty map for an empty list', () => {
    expect(buildModelTotalLabels([]).size).toBe(0)
  })
})
