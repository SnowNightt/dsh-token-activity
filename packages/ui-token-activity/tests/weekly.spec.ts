import { describe, expect, it } from 'vitest'
import {
  aggregateWeekModels,
  buildWeeklyBuckets,
  buildWeeklyGrid,
  mondayKeyOf,
  sundayKeyOf,
} from '../src/client/core/weekly.ts'
import type { TokenActivitySummaryDay } from '../src/client/contract.ts'

function day(date: string, totalTokens: number, models: Array<{ provider: string; model: string; tokens: number }>): TokenActivitySummaryDay {
  return { date, totalTokens, models }
}

describe('mondayKeyOf / sundayKeyOf', () => {
  it('keeps a Monday unchanged', () => {
    expect(mondayKeyOf('2026-08-10')).toBe('2026-08-10')
  })

  it('walks other weekdays back to Monday', () => {
    expect(mondayKeyOf('2026-08-14')).toBe('2026-08-10') // Friday
    expect(mondayKeyOf('2026-08-16')).toBe('2026-08-10') // Sunday
  })

  it('handles month and year boundaries', () => {
    expect(mondayKeyOf('2026-09-01')).toBe('2026-08-31') // Sep 1 2026 is a Tuesday
    expect(mondayKeyOf('2026-01-01')).toBe('2025-12-29') // Jan 1 2026 is a Thursday
  })

  it('computes the Sunday ending a week', () => {
    expect(sundayKeyOf('2026-08-10')).toBe('2026-08-16')
  })
})

describe('buildWeeklyBuckets (US-02)', () => {
  it('sums multiple days of the same week into one bucket', () => {
    const dayKeys = ['2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14']
    const dayTotals = new Map([
      ['2026-08-10', 100],
      ['2026-08-11', 200],
      ['2026-08-12', 300],
      ['2026-08-13', 400],
      ['2026-08-14', 500],
    ])
    const buckets = buildWeeklyBuckets(dayKeys, dayTotals, new Map())
    expect(buckets).toHaveLength(1)
    expect(buckets[0]!.weekStart).toBe('2026-08-10')
    expect(buckets[0]!.weekEnd).toBe('2026-08-16')
    expect(buckets[0]!.actualStart).toBe('2026-08-10')
    expect(buckets[0]!.actualEnd).toBe('2026-08-14')
    expect(buckets[0]!.totalTokens).toBe(1500)
  })

  it('groups a cross-month week under its Monday (Aug 31 2026)', () => {
    const dayKeys = ['2026-08-31', '2026-09-01', '2026-09-02']
    const dayTotals = new Map([
      ['2026-08-31', 10],
      ['2026-09-01', 20],
      ['2026-09-02', 30],
    ])
    const buckets = buildWeeklyBuckets(dayKeys, dayTotals, new Map())
    expect(buckets).toHaveLength(1)
    expect(buckets[0]!.weekStart).toBe('2026-08-31')
    expect(buckets[0]!.weekEnd).toBe('2026-09-06')
    expect(buckets[0]!.totalTokens).toBe(60)
  })

  it('groups a cross-year week (Dec 29 2025 – Jan 4 2026)', () => {
    const dayKeys = ['2025-12-29', '2025-12-30', '2026-01-01']
    const buckets = buildWeeklyBuckets(dayKeys, new Map(), new Map())
    expect(buckets).toHaveLength(1)
    expect(buckets[0]!.weekStart).toBe('2025-12-29')
    expect(buckets[0]!.weekEnd).toBe('2026-01-04')
    expect(buckets[0]!.actualStart).toBe('2025-12-29')
    expect(buckets[0]!.actualEnd).toBe('2026-01-01')
  })

  it('reports the actual covered start/end for a window-edge partial week', () => {
    // Window starts on Wednesday: the first bucket covers only Wed–Fri.
    const dayKeys = ['2026-08-12', '2026-08-13', '2026-08-14']
    const buckets = buildWeeklyBuckets(dayKeys, new Map(), new Map())
    expect(buckets).toHaveLength(1)
    expect(buckets[0]!.weekStart).toBe('2026-08-10') // natural Monday
    expect(buckets[0]!.actualStart).toBe('2026-08-12') // covered start
    expect(buckets[0]!.actualEnd).toBe('2026-08-14')
    expect(buckets[0]!.totalTokens).toBe(0)
  })

  it('yields a zero-token bucket for an inactive week', () => {
    const buckets = buildWeeklyBuckets(['2026-08-10', '2026-08-11'], new Map(), new Map())
    expect(buckets[0]!.totalTokens).toBe(0)
    expect(buckets[0]!.models).toEqual([])
  })

  it('splits consecutive weeks into separate buckets', () => {
    const dayKeys = ['2026-08-10', '2026-08-11', '2026-08-17', '2026-08-18']
    const buckets = buildWeeklyBuckets(dayKeys, new Map(), new Map())
    expect(buckets.map(bucket => bucket.weekStart)).toEqual(['2026-08-10', '2026-08-17'])
  })

  it('aggregates per-day model detail into the week bucket', () => {
    const dayKeys = ['2026-08-10', '2026-08-11']
    const byDate = new Map([
      ['2026-08-10', day('2026-08-10', 300, [
        { provider: 'openai', model: 'gpt-5.6', tokens: 100 },
        { provider: 'deepseek-official', model: 'deepseek-v4-pro', tokens: 200 },
      ])],
      ['2026-08-11', day('2026-08-11', 100, [
        { provider: 'openai', model: 'gpt-5.6', tokens: 100 },
      ])],
    ])
    const dayTotals = new Map([['2026-08-10', 300], ['2026-08-11', 100]])
    const buckets = buildWeeklyBuckets(dayKeys, dayTotals, byDate)
    expect(buckets[0]!.totalTokens).toBe(400)
    expect(buckets[0]!.models).toEqual([
      { provider: 'deepseek-official', model: 'deepseek-v4-pro', tokens: 200 },
      { provider: 'openai', model: 'gpt-5.6', tokens: 200 },
    ])
  })

  it('returns an empty list for an empty window', () => {
    expect(buildWeeklyBuckets([], new Map(), new Map())).toEqual([])
  })
})

describe('aggregateWeekModels (US-03)', () => {
  it('sums the same provider+model across days', () => {
    const merged = aggregateWeekModels([
      { provider: 'openai', model: 'gpt-5.6', tokens: 100 },
      { provider: 'openai', model: 'gpt-5.6', tokens: 200 },
      { provider: 'deepseek-official', model: 'deepseek-v4-pro', tokens: 50 },
    ])
    expect(merged).toEqual([
      { provider: 'openai', model: 'gpt-5.6', tokens: 300 },
      { provider: 'deepseek-official', model: 'deepseek-v4-pro', tokens: 50 },
    ])
  })

  it('sorts by tokens desc, then provider, then model (stable rule)', () => {
    const merged = aggregateWeekModels([
      { provider: 'b', model: 'm', tokens: 10 },
      { provider: 'a', model: 'm', tokens: 10 },
      { provider: 'a', model: 'n', tokens: 10 },
      { provider: 'x', model: 'z', tokens: 30 },
    ])
    expect(merged.map(model => `${model.provider}/${model.model}`)).toEqual(['x/z', 'a/m', 'a/n', 'b/m'])
  })

  it('keeps distinct provider+model pairs separate', () => {
    const merged = aggregateWeekModels([
      { provider: 'openai', model: 'gpt-5.6', tokens: 10 },
      { provider: 'gateway', model: 'gpt-5.6', tokens: 20 },
    ])
    expect(merged).toHaveLength(2)
    expect(merged[0]).toEqual({ provider: 'gateway', model: 'gpt-5.6', tokens: 20 })
    expect(merged[1]).toEqual({ provider: 'openai', model: 'gpt-5.6', tokens: 10 })
  })

  it('returns an empty list for a zero-usage week', () => {
    expect(aggregateWeekModels([])).toEqual([])
  })
})

describe('buildWeeklyGrid', () => {
  it('labels months by the week-start month', () => {
    const buckets = buildWeeklyBuckets(['2026-08-10', '2026-08-17', '2026-09-07'], new Map(), new Map())
    const grid = buildWeeklyGrid(buckets, (year, monthIndex) => `${year}-${monthIndex}`)
    expect(grid.cells).toHaveLength(3)
    expect(grid.monthLabels).toEqual([
      { week: 0, label: '2026-7' },
      { week: 2, label: '2026-8' },
    ])
  })

  it('attributes a cross-month week to its start month', () => {
    const buckets = buildWeeklyBuckets(['2026-08-31', '2026-09-01'], new Map(), new Map())
    const grid = buildWeeklyGrid(buckets, (year, monthIndex) => `${year}-${monthIndex}`)
    expect(grid.monthLabels).toEqual([{ week: 0, label: '2026-7' }])
  })

  it('returns an empty grid for an empty input', () => {
    expect(buildWeeklyGrid([], () => '')).toEqual({ cells: [], monthLabels: [] })
  })
})
