import { describe, expect, it } from 'vitest'
import { buildTooltipContent, buildWeeklyTooltipContent } from '../src/client/tooltip-model.ts'
import type { WeeklyBucket } from '../src/client/core/weekly.ts'

describe('buildTooltipContent (FR-05, §4.2)', () => {
  it('renders date, total, and sorted model rows', () => {
    const content = buildTooltipContent('2026-08-14', {
      date: '2026-08-14',
      totalTokens: 30000,
      models: [
        { provider: 'openai', model: 'gpt-5.6', tokens: 10000 },
        { provider: 'deepseek-official', model: 'deepseek-v4-pro', tokens: 20000 },
      ],
    }, 'zh-CN')
    expect(content.date).toBe('2026年8月14日')
    expect(content.total).toBe('总计 30,000 tokens')
    expect(content.rows.map(r => r.label)).toEqual(['deepseek-v4-pro', 'gpt-5.6'])
    expect(content.rows.map(r => r.tokens)).toEqual(['20,000', '10,000'])
  })

  it('disambiguates same-named models from different providers', () => {
    const content = buildTooltipContent('2026-08-14', {
      date: '2026-08-14',
      totalTokens: 15000,
      models: [
        { provider: 'openai', model: 'gpt-5.6', tokens: 10000 },
        { provider: 'gateway', model: 'gpt-5.6', tokens: 5000 },
      ],
    }, 'en-US')
    expect(content.rows.map(r => r.label)).toEqual(['openai · gpt-5.6', 'gateway · gpt-5.6'])
  })

  it('does not disambiguate a unique model name', () => {
    const content = buildTooltipContent('2026-08-14', {
      date: '2026-08-14',
      totalTokens: 10000,
      models: [{ provider: 'openai', model: 'gpt-5.6', tokens: 10000 }],
    }, 'en-US')
    expect(content.rows[0]!.label).toBe('gpt-5.6')
    expect(content.rows[0]!.provider).toBe('openai')
  })

  it('shows 0 tokens with no model list for an inactive day', () => {
    const content = buildTooltipContent('2026-08-14', undefined, 'zh-CN')
    expect(content.date).toBe('2026年8月14日')
    expect(content.total).toBe('总计 0 tokens')
    expect(content.rows).toEqual([])
  })

  it('keeps the full model list (no Top-N merging)', () => {
    const models = Array.from({ length: 40 }, (_, i) => ({ provider: 'openai', model: `m-${i}`, tokens: 40 - i }))
    const content = buildTooltipContent('2026-08-14', { date: '2026-08-14', totalTokens: 820, models }, 'en-US')
    expect(content.rows).toHaveLength(40)
  })
})

describe('buildWeeklyTooltipContent (US-03)', () => {
  const week: WeeklyBucket = {
    weekStart: '2026-04-06',
    weekEnd: '2026-04-12',
    actualStart: '2026-04-06',
    actualEnd: '2026-04-12',
    totalTokens: 30000,
    models: [
      { provider: 'openai', model: 'gpt-5.6', tokens: 10000 },
      { provider: 'deepseek-official', model: 'deepseek-v4-pro', tokens: 20000 },
    ],
  }

  it('renders the week range, week total, and sorted aggregated models', () => {
    const content = buildWeeklyTooltipContent(week, 'zh-CN')
    expect(content.date).toBe('2026年4月6日 – 4月12日')
    expect(content.total).toBe('本周使用 Token：30,000')
    expect(content.rows.map(row => row.label)).toEqual(['deepseek-v4-pro', 'gpt-5.6'])
    expect(content.rows.map(row => row.tokens)).toEqual(['20,000', '10,000'])
  })

  it('renders English copy', () => {
    const content = buildWeeklyTooltipContent(week, 'en-US')
    expect(content.date).toBe('April 6, 2026 – April 12')
    expect(content.total).toBe('Tokens this week: 30,000')
  })

  it('shows the actual covered range for a window-edge partial week', () => {
    const edge: WeeklyBucket = {
      ...week,
      weekStart: '2026-08-10',
      weekEnd: '2026-08-16',
      actualStart: '2026-08-12',
      actualEnd: '2026-08-14',
      totalTokens: 0,
      models: [],
    }
    const content = buildWeeklyTooltipContent(edge, 'en-US')
    expect(content.date).toBe('August 12, 2026 – August 14')
    expect(content.total).toBe('Tokens this week: 0')
    expect(content.rows).toEqual([])
  })

  it('shows 0 tokens and no model rows for a zero-usage week', () => {
    const content = buildWeeklyTooltipContent({ ...week, totalTokens: 0, models: [] }, 'zh-CN')
    expect(content.total).toBe('本周使用 Token：0')
    expect(content.rows).toEqual([])
  })

  it('disambiguates same-named models from different providers', () => {
    const content = buildWeeklyTooltipContent({
      ...week,
      models: [
        { provider: 'openai', model: 'gpt-5.6', tokens: 10 },
        { provider: 'gateway', model: 'gpt-5.6', tokens: 20 },
      ],
    }, 'en-US')
    expect(content.rows.map(row => row.label)).toEqual(['gateway · gpt-5.6', 'openai · gpt-5.6'])
  })
})
