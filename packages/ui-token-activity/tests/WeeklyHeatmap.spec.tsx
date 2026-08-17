// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { WeeklyHeatmap } from '../src/client/WeeklyHeatmap.tsx'
import { buildWeeklyBuckets, buildWeeklyGrid } from '../src/client/core/weekly.ts'
import { recentDayKeys } from '../src/client/core/geometry.ts'
import type { TokenActivitySummaryDay } from '../src/client/contract.ts'

// A 14-day window (Aug 1 – Aug 14, 2026) spans three natural weeks:
//   Jul 27 (Sat–Sun), Aug 3 (full), Aug 10 (Mon–Fri).
const dayKeys = recentDayKeys('2026-08-14', 14, 'UTC')
const dayTotals = new Map<string, number>([
  ['2026-08-13', 10000],
  ['2026-08-14', 30000],
])
const byDate = new Map<string, TokenActivitySummaryDay>([
  ['2026-08-13', {
    date: '2026-08-13',
    totalTokens: 10000,
    models: [{ provider: 'openai', model: 'gpt-5.6', tokens: 10000 }],
  }],
  ['2026-08-14', {
    date: '2026-08-14',
    totalTokens: 30000,
    models: [
      { provider: 'openai', model: 'gpt-5.6', tokens: 10000 },
      { provider: 'deepseek-official', model: 'deepseek-v4-pro', tokens: 20000 },
    ],
  }],
])
const buckets = buildWeeklyBuckets(dayKeys, dayTotals, byDate)
const grid = buildWeeklyGrid(buckets, (year, monthIndex) => `${year}-${monthIndex}`)

describe('WeeklyHeatmap (US-02/US-03)', () => {
  it('renders one focusable cell per week', () => {
    render(<WeeklyHeatmap grid={grid} maxWeekTokens={40000} locale="en-US" />)
    expect(screen.getAllByRole('button')).toHaveLength(3)
  })

  it('gives each cell an accessible name with the week range and exact tokens', () => {
    render(<WeeklyHeatmap grid={grid} maxWeekTokens={40000} locale="en-US" />)
    expect(screen.getByRole('button', { name: 'August 10, 2026 – August 14: 40,000 tokens' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'August 3, 2026 – August 9: 0 tokens' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'August 1, 2026 – August 2: 0 tokens' })).toBeTruthy()
  })

  it('opens a tooltip on focus with the week range, total, and sorted models; Escape closes it', () => {
    render(<WeeklyHeatmap grid={grid} maxWeekTokens={40000} locale="en-US" />)
    const peak = screen.getByRole('button', { name: /40,000 tokens/ })
    fireEvent.focus(peak)
    const tooltip = screen.getByRole('tooltip')
    expect(tooltip.textContent).toContain('August 10, 2026 – August 14')
    expect(tooltip.textContent).toContain('Tokens this week: 40,000')
    expect(tooltip.textContent).toContain('deepseek-v4-pro')
    expect(tooltip.textContent).toContain('gpt-5.6')
    fireEvent.keyDown(peak, { key: 'Escape' })
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('shows the week total and no model list for an inactive week', () => {
    render(<WeeklyHeatmap grid={grid} maxWeekTokens={40000} locale="en-US" />)
    const inactive = screen.getByRole('button', { name: /August 3, 2026 – August 9: 0 tokens/ })
    fireEvent.focus(inactive)
    const tooltip = screen.getByRole('tooltip')
    expect(tooltip.textContent).toContain('Tokens this week: 0')
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
  })

  it('renders a visible focus ring on the focused cell', () => {
    render(<WeeklyHeatmap grid={grid} maxWeekTokens={40000} locale="en-US" />)
    const peak = screen.getByRole('button', { name: /40,000 tokens/ })
    expect(peak.style.boxShadow).toBe('none')
    fireEvent.focus(peak)
    expect(peak.style.boxShadow).toContain('0 0 0 2px')
    fireEvent.blur(peak)
    expect(peak.style.boxShadow).toBe('none')
  })

  it('does not render the daily weekday row labels', () => {
    render(<WeeklyHeatmap grid={grid} maxWeekTokens={40000} locale="en-US" />)
    expect(screen.queryByText('Mon')).toBeNull()
    expect(screen.queryByText('Wed')).toBeNull()
    expect(screen.queryByText('Fri')).toBeNull()
    expect(screen.queryByText('一')).toBeNull()
  })
})
