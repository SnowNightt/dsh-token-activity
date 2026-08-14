/**
 * Color-intensity legend (PRD §7.1). The four levels are always the same brand
 * hue; the legend labels "Less"/"More" match the current locale.
 *
 * @module @dsh-plugins/dsh-ui-token-activity/client/Legend
 */

import type { TokenActivityTranslate } from './locales.ts'

const SWATCHES = ['#c7d9ff', '#8fb3ff', '#4f7dff', '#1d4ed8'] as const

export interface LegendProps {
  t: TokenActivityTranslate
}

export function Legend({ t }: LegendProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--dsw-fg-muted, #6b7280)' }}>
      <span>{t('legendLess')}</span>
      {SWATCHES.map(color => (
        <span key={color} aria-hidden="true" style={{ width: 12, height: 12, borderRadius: 3, background: color, display: 'inline-block' }} />
      ))}
      <span>{t('legendMore')}</span>
    </div>
  )
}
