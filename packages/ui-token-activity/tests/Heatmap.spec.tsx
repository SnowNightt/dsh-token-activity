// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
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

  it('uses the compact grid dimensions that fit a full year in the usage panel', () => {
    render(<Heatmap grid={grid} dayTotals={dayTotals} maxDayTokens={30000} locale="en-US" resolveDay={resolveDay} />)
    const cell = screen.getAllByRole('button')[0]!
    const gridElement = cell.parentElement!

    expect(gridElement.style.gridAutoColumns).toBe('8px')
    expect(gridElement.style.gap).toBe('2px')
    expect(cell.style.width).toBe('8px')
    expect(cell.style.height).toBe('8px')
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

  it('does not add a selection outline on hover or focus', () => {
    render(<Heatmap grid={grid} dayTotals={dayTotals} maxDayTokens={30000} locale="en-US" resolveDay={resolveDay} />)
    const peak = screen.getByRole('button', { name: /August 14, 2026: 30,000 tokens/ })
    const cell = peak.firstElementChild as HTMLElement

    fireEvent.mouseEnter(peak)
    fireEvent.focus(peak)

    expect(peak.style.outline).toBe('none')
    expect(cell.style.outline).toBe('')
    expect(cell.style.outlineOffset).toBe('')
  })

  it('darkens the cell background on hover and restores it on leave', () => {
    render(<Heatmap grid={grid} dayTotals={dayTotals} maxDayTokens={30000} locale="en-US" resolveDay={resolveDay} />)
    const peak = screen.getByRole('button', { name: /August 14, 2026: 30,000 tokens/ })
    const cell = peak.firstElementChild as HTMLElement
    expect(cell.style.filter).toBe('')

    fireEvent.mouseEnter(peak)
    expect(cell.style.filter).toBe('brightness(0.8)')

    fireEvent.mouseLeave(peak)
    expect(cell.style.filter).toBe('')
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

  it('renders the tooltip outside the scrolling grid and keeps it inside the viewport', () => {
    const rect = (values: Partial<DOMRect>): DOMRect => ({
      bottom: 114,
      height: 14,
      left: 1000,
      right: 1014,
      top: 100,
      width: 14,
      x: 1000,
      y: 100,
      toJSON: () => ({}),
      ...values,
    })
    const getRect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function (this: HTMLElement) {
        return this.getAttribute('role') === 'tooltip'
          ? rect({ bottom: 100, height: 100, left: 0, right: 220, top: 0, width: 220, x: 0, y: 0 })
          : rect({})
      })

    render(<Heatmap grid={grid} dayTotals={dayTotals} maxDayTokens={30000} locale="en-US" resolveDay={resolveDay} />)
    fireEvent.mouseEnter(screen.getByRole('button', { name: /August 14, 2026: 30,000 tokens/ }))
    const tooltip = screen.getByRole('tooltip')
    expect(tooltip.parentElement).toBe(document.body)
    expect(tooltip.style.position).toBe('fixed')
    expect(tooltip.style.left).toBe('796px')

    getRect.mockRestore()
  })
})
