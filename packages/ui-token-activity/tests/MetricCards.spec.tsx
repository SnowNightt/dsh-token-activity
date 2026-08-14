// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MetricCards } from '../src/client/MetricCards.tsx'
import { zh, en } from '../src/client/locales.ts'
import type { TokenActivityKey, TokenActivityTranslate } from '../src/client/locales.ts'
import type { TokenActivityMetrics } from '../src/client/contract.ts'

function makeT(dict: Record<TokenActivityKey, string>): TokenActivityTranslate {
  return (key, params) => {
    const template = dict[key]
    return params === undefined
      ? template
      : template.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? ''))
  }
}

const metrics: TokenActivityMetrics = {
  totalTokens: 1_031_000_000,
  peakDailyTokens: 2_100_000_000,
  longestActiveChatMs: 5 * 60_000,
  currentStreakDays: 5,
  longestStreakDays: 12,
  unreportedCalls: 0,
}

describe('MetricCards (FR-02)', () => {
  it('renders compact Chinese values with exact integers in a11y names', () => {
    const { container } = render(<MetricCards metrics={metrics} locale="zh-CN" t={makeT(zh)} />)
    expect(screen.getByText('10.31亿')).toBeTruthy()
    expect(screen.getByText('21亿')).toBeTruthy()
    expect(screen.getByText('5分钟')).toBeTruthy()
    expect(screen.getByText('5 天')).toBeTruthy()
    expect(screen.getByText('12 天')).toBeTruthy()
    const totalCard = container.querySelector('[aria-label*="1,031,000,000"]')
    expect(totalCard).toBeTruthy()
  })

  it('renders English units', () => {
    render(<MetricCards metrics={metrics} locale="en-US" t={makeT(en)} />)
    expect(screen.getByText('1.03B')).toBeTruthy()
    expect(screen.getByText('2.1B')).toBeTruthy()
  })
})
