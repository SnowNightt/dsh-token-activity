/**
 * Weekly token heatmap (US-02/US-03): one cell per natural week in a single
 * column strip — weeks as columns, most recent week on the right — with month
 * labels attributed to the week-start month, four-level brand-color intensity
 * normalized against the visible window's max week total, and a keyboard- and
 * pointer-accessible per-week Tooltip. Each cell is a focusable button whose
 * accessible name carries the actual covered week range and the exact token
 * count; the keyboard-focused cell shows a visible ring while pointer hover
 * only darkens the cell background (§7).
 *
 * @module @snownightt/dsh-ui-token-activity/client/WeeklyHeatmap
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { WeeklyGrid } from './core/weekly.ts'
import { heatmapLevel } from './core/heatmap.ts'
import { formatInteger, formatWeekRange } from './core/format.ts'
import { buildWeeklyTooltipContent } from './tooltip-model.ts'
import { Tooltip } from './Tooltip.tsx'

const CELL = 8
const CELL_HEIGHT = 14
const GAP = 2
const LEVEL_COLORS: Record<number, string> = {
  0: 'var(--dsw-heat-0, #e5e7eb)',
  1: 'var(--dsw-heat-1, #c7d9ff)',
  2: 'var(--dsw-heat-2, #8fb3ff)',
  3: 'var(--dsw-heat-3, #4f7dff)',
  4: 'var(--dsw-heat-4, #1d4ed8)',
}

export interface WeeklyHeatmapProps {
  grid: WeeklyGrid
  /** Window-max week tokens; colors normalize against it (US-02). */
  maxWeekTokens: number
  locale: string
}

/** How the active cell was activated: pointer hover/click or keyboard focus. */
type ActiveSource = 'pointer' | 'keyboard'

export function WeeklyHeatmap({ grid, maxWeekTokens, locale }: WeeklyHeatmapProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [activeSource, setActiveSource] = useState<ActiveSource>('pointer')
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [activeAnchor, setActiveAnchor] = useState<HTMLElement | null>(null)
  // Focus that follows a pointer interaction must not show the keyboard ring;
  // mouseenter fires before the resulting focus, so this ref classifies it.
  const pointerInside = useRef(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancelClose = useCallback(() => {
    if (closeTimer.current === null) return
    clearTimeout(closeTimer.current)
    closeTimer.current = null
  }, [])
  const open = useCallback((index: number, anchor: HTMLElement, source: ActiveSource) => {
    cancelClose()
    setActiveIndex(index)
    setActiveSource(source)
    setActiveAnchor(anchor)
  }, [cancelClose])
  const close = useCallback(() => {
    cancelClose()
    setActiveIndex(null)
    setActiveAnchor(null)
  }, [cancelClose])
  const scheduleClose = useCallback(() => {
    cancelClose()
    closeTimer.current = setTimeout(close, 100)
  }, [cancelClose, close])
  useEffect(() => () => cancelClose(), [cancelClose])
  const activeBucket = activeIndex === null ? null : grid.cells[activeIndex] ?? null
  const activeContent = activeBucket === null ? null : buildWeeklyTooltipContent(activeBucket, locale)

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
                : grid.cells.length - month.week),
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
          gridTemplateColumns: `repeat(${grid.cells.length}, ${CELL}px)`,
          gap: GAP,
          width: 'max-content',
          maxWidth: '100%',
          overflowX: 'auto',
        }}
      >
        {grid.cells.map((bucket, index) => {
          const level = heatmapLevel(bucket.totalTokens, maxWeekTokens)
          const label = `${formatWeekRange(bucket.actualStart, bucket.actualEnd, locale)}: ${formatInteger(bucket.totalTokens, locale)} tokens`
          const active = activeIndex === index
          const hovered = hoveredIndex === index
          return (
            <div
              key={bucket.weekStart}
              role="button"
              tabIndex={0}
              aria-label={label}
              aria-describedby={active ? 'token-activity-tooltip' : undefined}
              onMouseEnter={event => {
                pointerInside.current = true
                setHoveredIndex(index)
                open(index, event.currentTarget, 'pointer')
              }}
              onMouseLeave={() => {
                pointerInside.current = false
                setHoveredIndex(null)
                scheduleClose()
              }}
              onFocus={event => open(index, event.currentTarget, pointerInside.current ? 'pointer' : 'keyboard')}
              onBlur={close}
              onClick={event => open(index, event.currentTarget, 'pointer')}
              onKeyDown={(event) => { if (event.key === 'Escape') close() }}
              style={{
                position: 'relative',
                width: CELL,
                height: CELL_HEIGHT,
                // The ring below is the keyboard focus indicator; pointer
                // hover darkens the cell instead, so hover shows no ring (§7).
                outline: 'none',
                boxShadow: active && activeSource === 'keyboard'
                  ? '0 0 0 2px var(--dsw-focus, #2563eb)'
                  : 'none',
                borderRadius: 3,
              }}
            >
              <div
                style={{
                  width: CELL,
                  height: CELL_HEIGHT,
                  borderRadius: 3,
                  background: LEVEL_COLORS[level],
                  // brightness() darkens the theme-resolved level color on
                  // hover without a separate darker palette per level.
                  filter: hovered ? 'brightness(0.8)' : undefined,
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
