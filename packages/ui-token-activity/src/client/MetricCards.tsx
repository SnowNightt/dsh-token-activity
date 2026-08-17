/**
 * The token metric cards: totals with compact values on the card and exact
 * integers in the accessible name, plus the longest single-chat duration and
 * the longest activity streak in days.
 *
 * @module @snownightt/dsh-ui-token-activity/client/MetricCards
 */

import type { TokenActivityMetrics } from './contract.ts'
import type { TokenActivityTranslate } from './locales.ts'
import { formatDuration, formatInteger, formatStreakDays, formatWanYiTokens } from './core/format.ts'

export interface MetricCardsProps {
  metrics: TokenActivityMetrics
  locale: string
  t: TokenActivityTranslate
}

export function MetricCards({ metrics, locale, t }: MetricCardsProps) {
  const duration = formatDuration(metrics.longestActiveChatMs, locale)
  const streak = formatStreakDays(metrics.longestStreakDays, locale)
  const cards = [
    // 累计/峰值指标与总计栏一致：万/亿单位、保留两位小数。
    { label: t('metricTotal'), value: formatWanYiTokens(metrics.totalTokens, locale), full: formatInteger(metrics.totalTokens, locale) },
    { label: t('metricPeak'), value: formatWanYiTokens(metrics.peakDailyTokens, locale), full: formatInteger(metrics.peakDailyTokens, locale) },
    { label: t('metricLongestChat'), value: duration, full: duration },
    { label: t('metricLongestStreak'), value: streak, full: streak },
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
