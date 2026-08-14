import { describe, expect, it } from 'vitest'
import { buildHeatmapGrid, recentDayKeys, weekdayIndex } from '../src/client/core/geometry.ts'

describe('weekdayIndex', () => {
  it('matches the UTC weekday with Monday = 0', () => {
    for (const date of ['2026-08-10', '2026-08-14', '2026-08-16', '2026-01-01', '2026-12-31']) {
      const expected = (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7
      expect(weekdayIndex(date)).toBe(expected)
    }
  })
})

describe('recentDayKeys', () => {
  it('returns the oldest-first window ending today', () => {
    expect(recentDayKeys('2026-08-14', 7, 'UTC')).toEqual([
      '2026-08-08', '2026-08-09', '2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14',
    ])
  })
})

describe('buildHeatmapGrid', () => {
  const dayKeys = recentDayKeys('2026-08-14', 365, 'UTC')

  it('aligns the first day to Monday with leading blank cells', () => {
    const grid = buildHeatmapGrid(dayKeys, () => '')
    const leading = weekdayIndex(dayKeys[0]!)
    expect(leading).toBeGreaterThanOrEqual(0)
    expect(leading).toBeLessThanOrEqual(6)
    // The first `leading` cells are blanks.
    expect(grid.cells.slice(0, leading).every(cell => cell.date === '')).toBe(true)
    expect(grid.cells[leading]!.date).toBe(dayKeys[0])
  })

  it('contains exactly one cell per day plus blanks', () => {
    const grid = buildHeatmapGrid(dayKeys, () => '')
    const leading = weekdayIndex(dayKeys[0]!)
    expect(grid.cells.length).toBe(leading + 365)
    const dated = grid.cells.filter(cell => cell.date !== '')
    expect(dated).toHaveLength(365)
    expect(dated.map(cell => cell.date)).toEqual(dayKeys)
  })

  it('lays weeks as columns (Monday→Sunday rows)', () => {
    const grid = buildHeatmapGrid(dayKeys, () => '')
    for (const cell of grid.cells) {
      if (cell.date === '') continue
      expect(cell.weekday).toBe(weekdayIndex(cell.date))
    }
    expect(grid.weekCount).toBe(Math.ceil((weekdayIndex(dayKeys[0]!) + 365) / 7))
  })

  it('emits month labels in chronological order spanning the year', () => {
    const grid = buildHeatmapGrid(dayKeys, (y, m) => `${y}-${m}`)
    const weeks = grid.monthLabels.map(label => label.week)
    const sorted = [...weeks].sort((a, b) => a - b)
    expect(weeks).toEqual(sorted)
    // A 365-day window crosses at least 12 and at most 14 month boundaries.
    expect(grid.monthLabels.length).toBeGreaterThanOrEqual(12)
    expect(grid.monthLabels.length).toBeLessThanOrEqual(14)
    expect(grid.monthLabels[0]!.week).toBe(0)
  })

  it('returns an empty grid for an empty input', () => {
    expect(buildHeatmapGrid([], () => '')).toEqual({ cells: [], weekCount: 0, monthLabels: [] })
  })
})
