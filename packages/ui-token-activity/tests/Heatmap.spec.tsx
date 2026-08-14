// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Heatmap } from '../src/client/Heatmap.tsx'
import { buildHeatmapGrid, recentDayKeys } from '../src/client/core/geometry.ts'
import { formatMonthLabel } from '../src/client/core/format.ts'
import type { TokenActivitySummaryDay } from '../src/client/contract.ts'

const dayKeys = recentDayKeys('2026-08-14', 7, 'UTC')
const grid = buildHeatmapGrid(dayKeys, (year, monthIndex) => formatMonthLabel(year, monthIndex, 'en-US'))
const dayTotals = new Map<string, number>([
  ['2026-08-13', 10000],
  ['2026-08-14', 30000],
])
const byDate = new Map<string, TokenActivitySummaryDay>([
  ['2026-08-14', {
    date: '2026-08-14',
    totalTokens: 30000,
    models: [
      { provider: 'openai', model: 'gpt-5.6', tokens: 10000 },
      { provider: 'deepseek-official', model: 'deepseek-v4-pro', tokens: 20000 },
    ],
  }],
])
const resolveDay = (date: string) => byDate.get(date)

describe('Heatmap (FR-03/FR-04/FR-05, AC-10)', () => {
  it('renders one focusable cell per day', () => {
    render(<Heatmap grid={grid} dayTotals={dayTotals} maxDayTokens={30000} locale="en-US" resolveDay={resolveDay} />)
    expect(screen.getAllByRole('button')).toHaveLength(7)
  })

  it('gives each cell an accessible name with the date and exact tokens', () => {
    render(<Heatmap grid={grid} dayTotals={dayTotals} maxDayTokens={30000} locale="en-US" resolveDay={resolveDay} />)
    const peak = screen.getByRole('button', { name: /August 14, 2026: 30,000 tokens/ })
    expect(peak).toBeTruthy()
    const neutral = screen.getAllByRole('button', { name: /: 0 tokens$/ })
    expect(neutral).toHaveLength(5)
  })

  it('opens a tooltip on focus and closes it on Escape', () => {
    render(<Heatmap grid={grid} dayTotals={dayTotals} maxDayTokens={30000} locale="en-US" resolveDay={resolveDay} />)
    const peak = screen.getByRole('button', { name: /August 14, 2026: 30,000 tokens/ })
    fireEvent.focus(peak)
    const tooltip = screen.getByRole('tooltip')
    expect(tooltip.textContent).toContain('Total 30,000 tokens')
    expect(tooltip.textContent).toContain('deepseek-v4-pro')
    expect(tooltip.textContent).toContain('gpt-5.6')
    fireEvent.keyDown(peak, { key: 'Escape' })
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('lists every model with correct sort order', () => {
    render(<Heatmap grid={grid} dayTotals={dayTotals} maxDayTokens={30000} locale="en-US" resolveDay={resolveDay} />)
    const peak = screen.getByRole('button', { name: /30,000 tokens/ })
    fireEvent.focus(peak)
    const rows = screen.getAllByRole('listitem')
    expect(rows).toHaveLength(2)
    expect(rows[0]!.textContent).toContain('deepseek-v4-pro')
    expect(rows[1]!.textContent).toContain('gpt-5.6')
  })
})
