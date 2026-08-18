/**
 * Daily / weekly statistics-granularity switch (US-01). Native buttons with
 * `aria-pressed` mark the selected view; the default focus ring is kept so the
 * current selection stays visible to keyboard users (§7).
 *
 * @module @snownightt/dsh-ui-token-activity/client/ViewToggle
 */

import type { CSSProperties } from 'react'
import type { TokenActivityTranslate } from './locales.ts'

export type TokenActivityView = 'daily' | 'weekly'

export interface ViewToggleProps {
  view: TokenActivityView
  onChange: (view: TokenActivityView) => void
  t: TokenActivityTranslate
}

export function ViewToggle({ view, onChange, t }: ViewToggleProps) {
  const buttonStyle = (selected: boolean): CSSProperties => ({
    border: 'none',
    background: selected ? 'var(--dsw-accent, #2563eb)' : 'transparent',
    color: selected ? 'var(--dsw-accent-fg, #ffffff)' : 'var(--dsw-fg-muted, #6b7280)',
    padding: '3px 10px',
    fontSize: 12,
    lineHeight: 1.4,
    cursor: 'pointer',
  })

  return (
    <div
      role="group"
      aria-label={t('viewSwitch')}
      style={{
        display: 'flex',
        border: '1px solid var(--dsw-border, #d1d5db)',
        borderRadius: 6,
        overflow: 'hidden',
      }}
    >
      <button type="button" aria-pressed={view === 'daily'} onClick={() => onChange('daily')} style={buttonStyle(view === 'daily')}>
        {t('viewDaily')}
      </button>
      <button type="button" aria-pressed={view === 'weekly'} onClick={() => onChange('weekly')} style={buttonStyle(view === 'weekly')}>
        {t('viewWeekly')}
      </button>
    </div>
  )
}
