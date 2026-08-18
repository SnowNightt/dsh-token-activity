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
  it('renders 万/亿 values with two decimals and exact integers in a11y names', () => {
    const { container } = render(<MetricCards metrics={metrics} locale="zh-CN" t={makeT(zh)} />)
    expect(screen.getByText('10.31亿')).toBeTruthy()
    expect(screen.getByText('21.00亿')).toBeTruthy()
    expect(screen.getByText('5分钟')).toBeTruthy()
    expect(screen.getByText('12天')).toBeTruthy()
    expect(screen.getByRole('status', { name: '最长聊天时长: 5分钟' })).toBeTruthy()
    expect(screen.getByRole('status', { name: '最长连续天数: 12天' })).toBeTruthy()
    expect(screen.queryByText('当前连续')).toBeNull()
    expect(screen.getAllByRole('status')).toHaveLength(4)
    const totalCard = container.querySelector('[aria-label*="1,031,000,000"]')
    expect(totalCard).toBeTruthy()
  })

  it('renders the duration and streak cards in English (totals keep 万/亿 units)', () => {
    render(<MetricCards metrics={metrics} locale="en-US" t={makeT(en)} />)
    expect(screen.getByText('10.31亿')).toBeTruthy()
    expect(screen.getByText('21.00亿')).toBeTruthy()
    expect(screen.getByText('5m')).toBeTruthy()
    expect(screen.getByText('12d')).toBeTruthy()
    expect(screen.getByRole('status', { name: 'Longest chat duration: 5m' })).toBeTruthy()
    expect(screen.getByRole('status', { name: 'Longest streak days: 12d' })).toBeTruthy()
  })

  it('renders a zero duration and zero streak for no activity', () => {
    render(<MetricCards metrics={{ ...metrics, longestActiveChatMs: 0, longestStreakDays: 0 }} locale="zh-CN" t={makeT(zh)} />)
    expect(screen.getByText('0分钟')).toBeTruthy()
    expect(screen.getByRole('status', { name: '最长连续天数: 0天' })).toBeTruthy()
  })
})
