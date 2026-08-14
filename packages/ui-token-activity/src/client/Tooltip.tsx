/**
 * Single-day Tooltip (PRD FR-05, §7.2). Model names are left-aligned, token
 * counts right-aligned; the model area scrolls internally above a max height.
 * Text stays selectable; the Heatmap owns open/close so the pointer may enter
 * this tooltip without it disappearing.
 *
 * @module @snownightt/dsh-ui-token-activity/client/Tooltip
 */

import { useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { TooltipContent } from './tooltip-model.ts'

const VIEWPORT_GAP = 8
const ANCHOR_GAP = 8

export interface TooltipProps {
  content: TooltipContent
  anchor: HTMLElement
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

export function Tooltip({ content, anchor, onMouseEnter, onMouseLeave }: TooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const position = () => {
      const tooltip = tooltipRef.current
      if (tooltip === null) return

      const anchorRect = anchor.getBoundingClientRect()
      const tooltipRect = tooltip.getBoundingClientRect()
      const maxLeft = Math.max(VIEWPORT_GAP, window.innerWidth - tooltipRect.width - VIEWPORT_GAP)
      const left = Math.min(Math.max(anchorRect.left, VIEWPORT_GAP), maxLeft)
      const above = anchorRect.top - tooltipRect.height - ANCHOR_GAP
      const top = above >= VIEWPORT_GAP
        ? above
        : Math.min(anchorRect.bottom + ANCHOR_GAP, window.innerHeight - tooltipRect.height - VIEWPORT_GAP)

      tooltip.style.left = `${left}px`
      tooltip.style.top = `${Math.max(VIEWPORT_GAP, top)}px`
      tooltip.style.visibility = 'visible'
    }

    position()
    window.addEventListener('resize', position)
    window.addEventListener('scroll', position, true)
    return () => {
      window.removeEventListener('resize', position)
      window.removeEventListener('scroll', position, true)
    }
  }, [anchor, content])

  return createPortal(
    <div
      ref={tooltipRef}
      id="token-activity-tooltip"
      role="tooltip"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: 'fixed',
        zIndex: 1000,
        left: 0,
        top: 0,
        visibility: 'hidden',
        minWidth: 220,
        maxWidth: 320,
        padding: '10px 12px',
        borderRadius: 8,
        background: 'var(--dsw-tooltip-bg, #1f2937)',
        color: 'var(--dsw-tooltip-fg, #f9fafb)',
        fontSize: 13,
        lineHeight: 1.5,
        pointerEvents: 'auto',
        userSelect: 'text',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ fontWeight: 600 }}>{content.date}</div>
      <div style={{ marginTop: 4 }}>{content.total}</div>
      {content.rows.length > 0 && (
        <ul
          role="list"
          style={{
            listStyle: 'none',
            margin: '8px 0 0',
            padding: 0,
            maxHeight: 240,
            overflowY: 'auto',
          }}
        >
          {content.rows.map(row => (
            <li
              key={`${row.provider}\u0000${row.model}`}
              aria-label={`${row.provider} · ${row.model}: ${row.tokens} tokens`}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 16,
                padding: '2px 0',
              }}
            >
              <span style={{ textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.label}</span>
              <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{row.tokens} tokens</span>
            </li>
          ))}
        </ul>
      )}
    </div>,
    document.body,
  )
}
