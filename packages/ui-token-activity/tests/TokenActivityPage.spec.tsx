// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TokenActivityPage } from '../src/client/TokenActivityPage.tsx'
import { zh } from '../src/client/locales.ts'
import type { TokenActivityKey, TokenActivityTranslate } from '../src/client/locales.ts'
import type { TokenActivitySummary } from '../src/client/contract.ts'
import type { StoreStatus } from '../src/client/store.ts'

function makeT(): TokenActivityTranslate {
  return (key, params) => {
    const template = zh[key]
    return params === undefined
      ? template
      : template.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? ''))
  }
}

function summary(overrides: Partial<TokenActivitySummary> = {}): TokenActivitySummary {
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
    ...overrides,
  }
}

describe('TokenActivityPage states (FR-06)', () => {
  it('shows the skeleton while loading', () => {
    render(<TokenActivityPage status={{ kind: 'loading' }} locale="zh-CN" t={makeT()} onRetry={() => {}} />)
    expect(screen.getByRole('status', { name: 'loading' })).toBeTruthy()
  })

  it('shows an error summary with retry, and retry does not reload the app', () => {
    const onRetry = vi.fn()
    render(<TokenActivityPage status={{ kind: 'error', message: 'boom' }} locale="zh-CN" t={makeT()} onRetry={onRetry} />)
    expect(screen.getByText('数据读取失败')).toBeTruthy()
    screen.getByText('重试').click()
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('shows the empty state for no data', () => {
    const empty = summary({ days: [], metrics: { ...summary().metrics, totalTokens: 0 } })
    render(<TokenActivityPage status={{ kind: 'ready', summary: empty }} locale="zh-CN" t={makeT()} onRetry={() => {}} />)
    expect(screen.getByText('暂无 Token 使用记录')).toBeTruthy()
    expect(screen.getByText('Token 活动')).toBeTruthy()
  })

  it('shows the backfill progress line while running', () => {
    const running = summary({ backfill: { state: 'running', completedSessions: 3, totalSessions: 10, failedSessions: 1 } })
    render(<TokenActivityPage status={{ kind: 'ready', summary: running }} locale="zh-CN" t={makeT()} onRetry={() => {}} />)
    expect(screen.getByText('正在索引历史会话：已完成 3 / 10')).toBeTruthy()
    expect(screen.getByText('已跳过 1 个无法读取的会话')).toBeTruthy()
  })

  it('shows the coverage hint when some calls did not report usage', () => {
    const withUnreported = summary({ metrics: { ...summary().metrics, unreportedCalls: 2 } })
    render(<TokenActivityPage status={{ kind: 'ready', summary: withUnreported }} locale="zh-CN" t={makeT()} onRetry={() => {}} />)
    expect(screen.getByText(/部分模型调用未报告/)).toBeTruthy()
  })

  it('defaults to the daily view with Daily selected', () => {
    render(<TokenActivityPage status={{ kind: 'ready', summary: summary() }} locale="zh-CN" t={makeT()} onRetry={() => {}} />)
    expect(screen.getByRole('button', { name: '每日' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: '每周' }).getAttribute('aria-pressed')).toBe('false')
    // The daily heatmap is shown (cell for the data day exists).
    expect(screen.getByRole('button', { name: /2026年8月14日: 100 tokens/ })).toBeTruthy()
  })

  it('switches to the weekly view and back without reloading', () => {
    render(<TokenActivityPage status={{ kind: 'ready', summary: summary() }} locale="zh-CN" t={makeT()} onRetry={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: '每周' }))
    expect(screen.getByRole('button', { name: '每周' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: '每日' }).getAttribute('aria-pressed')).toBe('false')
    // The week containing the data day is now a single weekly cell.
    const weekCell = screen.getByRole('button', { name: /2026年8月10日 – 8月14日: 100 tokens/ })
    expect(weekCell).toBeTruthy()
    expect(screen.queryByRole('button', { name: /2026年8月14日: 100 tokens/ })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '每日' }))
    expect(screen.getByRole('button', { name: '每日' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: /2026年8月14日: 100 tokens/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /2026年8月10日 – 8月14日: 100 tokens/ })).toBeNull()
  })

  it('does not show the empty state while a backfill is still running', () => {
    const running = summary({
      days: [],
      metrics: { ...summary().metrics, totalTokens: 0 },
      backfill: { state: 'running', completedSessions: 0, totalSessions: 5, failedSessions: 0 },
    })
    render(<TokenActivityPage status={{ kind: 'ready', summary: running }} locale="zh-CN" t={makeT()} onRetry={() => {}} />)
    expect(screen.queryByText('暂无 Token 使用记录')).toBeNull()
    expect(screen.getByText('正在索引历史会话：已完成 0 / 5')).toBeTruthy()
  })

  it('shows the per-model totals bar below the heatmap with exact accessible totals', () => {
    const withModels = summary({
      days: [
        { date: '2026-08-13', totalTokens: 60, models: [{ provider: 'deepseek', model: 'deepseek-chat', tokens: 60 }] },
        {
          date: '2026-08-14',
          totalTokens: 100,
          models: [
            { provider: 'deepseek', model: 'deepseek-chat', tokens: 40 },
            { provider: 'openai', model: 'gpt-5.6', tokens: 60 },
          ],
        },
      ],
    })
    render(<TokenActivityPage status={{ kind: 'ready', summary: withModels }} locale="zh-CN" t={makeT()} onRetry={() => {}} />)
    expect(screen.getByText('模型 Token 总计（近一年）')).toBeTruthy()
    expect(screen.getByText('共 2 个模型')).toBeTruthy()
    expect(screen.getByRole('status', { name: 'deepseek-chat: 100 tokens' })).toBeTruthy()
    expect(screen.getByRole('status', { name: 'gpt-5.6: 60 tokens' })).toBeTruthy()
    expect(screen.getByRole('status', { name: '总计: 160 tokens' })).toBeTruthy()
  })

  it('keeps the totals bar visible in the weekly view too', () => {
    const withModels = summary()
    render(<TokenActivityPage status={{ kind: 'ready', summary: withModels }} locale="zh-CN" t={makeT()} onRetry={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: '每周' }))
    expect(screen.getByText('模型 Token 总计（近一年）')).toBeTruthy()
    expect(screen.getByRole('status', { name: 'gpt-5.6: 100 tokens' })).toBeTruthy()
  })

  it('omits the totals bar when there are no day records', () => {
    const empty = summary({ days: [], metrics: { ...summary().metrics, totalTokens: 0 } })
    render(<TokenActivityPage status={{ kind: 'ready', summary: empty }} locale="zh-CN" t={makeT()} onRetry={() => {}} />)
    expect(screen.queryByText('模型 Token 总计（近一年）')).toBeNull()
  })

  it('places the More/Less legend above the totals bar', () => {
    render(<TokenActivityPage status={{ kind: 'ready', summary: summary() }} locale="zh-CN" t={makeT()} onRetry={() => {}} />)
    const legend = screen.getByText('更少')
    const totalsTitle = screen.getByText('模型 Token 总计（近一年）')
    expect(legend.compareDocumentPosition(totalsTitle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
