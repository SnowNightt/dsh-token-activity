/**
 * Daily token heatmap (PRD FR-03/FR-04/FR-05): weeks as columns, Monday→Sunday
 * rows, month labels, four-level brand-color intensity, and a keyboard- and
 * pointer-accessible per-day Tooltip. Each cell is a focusable button with an
 * accessible name carrying the full date and exact token count (AC-10).
 *
 * @module @snownightt/dsh-ui-token-activity/client/Heatmap
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { HeatmapGrid } from './core/geometry.ts'
import { heatmapLevel } from './core/heatmap.ts'
import { formatDayKey, formatInteger } from './core/format.ts'
import type { TokenActivitySummaryDay } from './contract.ts'
import { buildTooltipContent } from './tooltip-model.ts'
import { Tooltip } from './Tooltip.tsx'

// 53 week columns fit inside the Harness usage panel without horizontal scrolling.
const CELL = 8
const GAP = 2
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
  const [activeAnchor, setActiveAnchor] = useState<HTMLElement | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancelClose = useCallback(() => {
    if (closeTimer.current === null) return
    clearTimeout(closeTimer.current)
    closeTimer.current = null
  }, [])
  const open = useCallback((date: string, anchor: HTMLElement) => {
    if (date === '') return
    cancelClose()
    setActiveDate(date)
    setActiveAnchor(anchor)
  }, [cancelClose])
  const close = useCallback(() => {
    cancelClose()
    setActiveDate(null)
    setActiveAnchor(null)
  }, [cancelClose])
  const scheduleClose = useCallback(() => {
    cancelClose()
    closeTimer.current = setTimeout(close, 100)
  }, [cancelClose, close])
  useEffect(() => () => cancelClose(), [cancelClose])
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
              aria-describedby={active ? 'token-activity-tooltip' : undefined}
              onMouseEnter={event => open(cell.date, event.currentTarget)}
              onMouseLeave={scheduleClose}
              onFocus={event => open(cell.date, event.currentTarget)}
              onBlur={close}
              onClick={event => open(cell.date, event.currentTarget)}
              onKeyDown={(event) => { if (event.key === 'Escape') close() }}
              style={{ position: 'relative', width: CELL, height: CELL, outline: 'none' }}
            >
              <div
                style={{
                  width: CELL,
                  height: CELL,
                  borderRadius: 3,
                  background: LEVEL_COLORS[level],
                }}
              />
            </div>
          )
        })}
      </div>
      {activeContent !== null && activeAnchor !== null && (
        <Tooltip
          content={activeContent}
          anchor={activeAnchor}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        />
      )}
    </div>
  )
}
