/**
 * Daily token heatmap (PRD FR-03/FR-04/FR-05): weeks as columns, Monday→Sunday
 * rows, month labels, four-level brand-color intensity, and a keyboard- and
 * pointer-accessible per-day Tooltip. Each cell is a focusable button with an
 * accessible name carrying the full date and exact token count (AC-10).
 *
 * @module @snownightt/dsh-ui-token-activity/client/Heatmap
 */

import { useCallback, useState } from 'react'
import type { HeatmapGrid } from './core/geometry.ts'
import { heatmapLevel } from './core/heatmap.ts'
import { formatDayKey, formatInteger } from './core/format.ts'
import type { TokenActivitySummaryDay } from './contract.ts'
import { buildTooltipContent } from './tooltip-model.ts'
import { Tooltip } from './Tooltip.tsx'

const CELL = 14
const GAP = 3
const LEVEL_COLORS: Record<number, string> = {
  0: 'var(--dsw-heat-0, #e5e7eb)',
  1: 'var(--dsw-heat-1, #c7d9ff)',
  2: 'var(--dsw-heat-2, #8fb3ff)',
  3: 'var(--dsw-heat-3, #4f7dff)',
  4: 'var(--dsw-heat-4, #1d4ed8)',
}

export interface HeatmapProps {
  grid: HeatmapGrid
  dayTotals: ReadonlyMap<string, number>
  maxDayTokens: number
  locale: string
  resolveDay: (date: string) => TokenActivitySummaryDay | undefined
}

export function Heatmap({ grid, dayTotals, maxDayTokens, locale, resolveDay }: HeatmapProps) {
  const [activeDate, setActiveDate] = useState<string | null>(null)
  const open = useCallback((date: string) => { if (date !== '') setActiveDate(date) }, [])
  const close = useCallback(() => setActiveDate(null), [])
  const activeContent = activeDate === null ? null : buildTooltipContent(activeDate, resolveDay(activeDate), locale)

  return (
    <div>
      <div
        aria-hidden="true"
        style={{ display: 'flex', height: 18, fontSize: 11, color: 'var(--dsw-fg-muted, #6b7280)' }}
      >
        {grid.monthLabels.map((month, index) => (
          <span
            key={`${month.label}-${index}`}
            style={{
              width: (CELL + GAP) * (index + 1 < grid.monthLabels.length
                ? grid.monthLabels[index + 1]!.week - month.week
                : grid.weekCount - month.week),
              flexShrink: 0,
            }}
          >
            {month.label}
          </span>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateRows: `repeat(7, ${CELL}px)`,
          gridAutoFlow: 'column',
          gridAutoColumns: CELL,
          gap: GAP,
          width: 'max-content',
          maxWidth: '100%',
          overflowX: 'auto',
        }}
      >
        {grid.cells.map((cell, index) => {
          if (cell.date === '') {
            return <span key={`blank-${index}`} aria-hidden="true" style={{ width: CELL, height: CELL }} />
          }
          const tokens = dayTotals.get(cell.date) ?? 0
          const level = heatmapLevel(tokens, maxDayTokens)
          const label = `${formatDayKey(cell.date, locale)}: ${formatInteger(tokens, locale)} tokens`
          const active = activeDate === cell.date
          return (
            <div
              key={cell.date}
              role="button"
              tabIndex={0}
              aria-label={label}
              aria-haspopup="dialog"
              onMouseEnter={() => open(cell.date)}
              onMouseLeave={close}
              onFocus={() => open(cell.date)}
              onBlur={close}
              onClick={() => open(cell.date)}
              onKeyDown={(event) => { if (event.key === 'Escape') close() }}
              style={{ position: 'relative', width: CELL, height: CELL }}
            >
              <div
                style={{
                  width: CELL,
                  height: CELL,
                  borderRadius: 3,
                  background: LEVEL_COLORS[level],
                  outline: active ? '2px solid var(--dsw-focus, #2563eb)' : 'none',
                  outlineOffset: 2,
                }}
              />
              {active && (
                <div
                  style={{ position: 'absolute', bottom: CELL + GAP, left: 0, pointerEvents: 'auto' }}
                  onMouseEnter={() => open(cell.date)}
                >
                  <Tooltip content={activeContent!} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
