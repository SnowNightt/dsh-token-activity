/**
 * Single-day Tooltip (PRD FR-05, §7.2). Model names are left-aligned, token
 * counts right-aligned; the model area scrolls internally above a max height.
 * Text stays selectable; the Heatmap owns open/close so the pointer may enter
 * this tooltip without it disappearing.
 *
 * @module @snownightt/dsh-ui-token-activity/client/Tooltip
 */

import type { TooltipContent } from './tooltip-model.ts'

export interface TooltipProps {
  content: TooltipContent
}

export function Tooltip({ content }: TooltipProps) {
  return (
    <div
      role="tooltip"
      style={{
        position: 'absolute',
        zIndex: 10,
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
    </div>
  )
}
