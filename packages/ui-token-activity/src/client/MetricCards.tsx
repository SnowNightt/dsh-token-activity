/**
 * The five top metric cards (PRD FR-02, §7.1). Compact values on the card,
 * exact integers in the accessible name for token counts.
 *
 * @module @dsh-plugins/dsh-ui-token-activity/client/MetricCards
 */

import type { TokenActivityMetrics } from './contract.ts'
import type { TokenActivityTranslate } from './locales.ts'
import { formatCompactTokens, formatDuration, formatInteger } from './core/format.ts'

export interface MetricCardsProps {
  metrics: TokenActivityMetrics
  locale: string
  t: TokenActivityTranslate
}

export function MetricCards({ metrics, locale, t }: MetricCardsProps) {
  const cards = [
    { label: t('metricTotal'), value: formatCompactTokens(metrics.totalTokens, locale), full: formatInteger(metrics.totalTokens, locale) },
    { label: t('metricPeak'), value: formatCompactTokens(metrics.peakDailyTokens, locale), full: formatInteger(metrics.peakDailyTokens, locale) },
    { label: t('metricLongestChat'), value: formatDuration(metrics.longestActiveChatMs, locale), full: formatDuration(metrics.longestActiveChatMs, locale) },
    { label: t('metricCurrentStreak'), value: `${metrics.currentStreakDays} ${t('days')}`, full: `${metrics.currentStreakDays} ${t('days')}` },
    { label: t('metricLongestStreak'), value: `${metrics.longestStreakDays} ${t('days')}`, full: `${metrics.longestStreakDays} ${t('days')}` },
  ]

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }} role="group" aria-label={t('title')}>
      {cards.map(item => (
        <div
          key={item.label}
          role="status"
          aria-label={`${item.label}: ${item.full}`}
          style={{
            flex: '1 1 140px',
            minWidth: 140,
            border: '1px solid var(--dsw-border, #e5e7eb)',
            borderRadius: 8,
            padding: '12px 14px',
          }}
        >
          <div style={{ fontSize: 12, opacity: 0.7 }}>{item.label}</div>
          <div style={{ fontSize: 20, fontWeight: 600, marginTop: 4 }}>{item.value}</div>
        </div>
      ))}
    </div>
  )
}
