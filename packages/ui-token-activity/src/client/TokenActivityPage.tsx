/**
 * The token-activity settings page: two metric cards, optional coverage /
 * backfill notices, the daily heatmap, and the color legend — with skeleton,
 * empty, error, and in-progress states (PRD FR-02/FR-03/FR-06, §7.1).
 *
 * @module @snownightt/dsh-ui-token-activity/client/TokenActivityPage
 */

import { useMemo } from 'react'
import type { TokenActivitySummary, TokenActivitySummaryDay } from './contract.ts'
import type { StoreStatus } from './store.ts'
import type { TokenActivityTranslate } from './locales.ts'
import { formatMonthLabel } from './core/format.ts'
import { buildHeatmapGrid, recentDayKeys } from './core/geometry.ts'
import { MetricCards } from './MetricCards.tsx'
import { Heatmap } from './Heatmap.tsx'
import { Legend } from './Legend.tsx'

export interface TokenActivityPageProps {
  status: StoreStatus
  locale: string
  t: TokenActivityTranslate
  onRetry: () => void
}

export function TokenActivityPage({ status, locale, t, onRetry }: TokenActivityPageProps) {
  if (status.kind === 'loading') return <Skeleton />
  if (status.kind === 'error') {
    return (
      <div role="alert" style={{ padding: 16 }}>
        <div style={{ fontWeight: 600 }}>{t('errorTitle')}</div>
        <div style={{ marginTop: 8, opacity: 0.8 }}>{status.message}</div>
        <button type="button" onClick={onRetry} style={{ marginTop: 12 }}>{t('retry')}</button>
      </div>
    )
  }
  return <Ready summary={status.summary} locale={locale} t={t} />
}

function Ready({ summary, locale, t }: { summary: TokenActivitySummary; locale: string; t: TokenActivityTranslate }) {
  const model = useMemo(() => buildModel(summary, locale), [summary, locale])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 16 }}>
      {summary.backfill.state === 'running' && (
        <div role="status" aria-live="polite">
          {t('backfill', { done: summary.backfill.completedSessions, total: summary.backfill.totalSessions })}
        </div>
      )}
      {summary.backfill.failedSessions > 0 && (
        <div role="note">{t('skipped', { count: summary.backfill.failedSessions })}</div>
      )}
      {summary.metrics.unreportedCalls > 0 && (
        <div role="note" style={{ opacity: 0.85 }}>{t('coverage')}</div>
      )}

      <MetricCards metrics={summary.metrics} locale={locale} t={t} />

      <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{t('title')}</h2>
      <Heatmap
        grid={model.grid}
        dayTotals={model.dayTotals}
        maxDayTokens={model.maxDayTokens}
        locale={locale}
        resolveDay={model.resolveDay}
      />

      {model.isEmpty && <div style={{ opacity: 0.7 }}>{t('empty')}</div>}
      <Legend t={t} />
    </div>
  )
}

function buildModel(summary: TokenActivitySummary, locale: string) {
  const dayTotals = new Map<string, number>()
  const byDate = new Map<string, TokenActivitySummaryDay>()
  let maxDayTokens = 0
  for (const day of summary.days) {
    dayTotals.set(day.date, day.totalTokens)
    byDate.set(day.date, day)
    if (day.totalTokens > maxDayTokens) maxDayTokens = day.totalTokens
  }

  const dayKeys = recentDayKeys(summary.range.to, 365, summary.timeZone)
  const grid = buildHeatmapGrid(dayKeys, (year, monthIndex) => formatMonthLabel(year, monthIndex, locale))

  return {
    grid,
    dayTotals,
    maxDayTokens,
    resolveDay: (date: string) => byDate.get(date),
    isEmpty: summary.days.length === 0,
  }
}

function Skeleton() {
  const bars = [0, 1]
  return (
    <div role="status" aria-label="loading" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 16 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {bars.map(i => (
          <div key={i} style={{ flex: '1 1 140px', minWidth: 140, height: 66, borderRadius: 8, background: 'var(--dsw-skeleton, #e5e7eb)' }} />
        ))}
      </div>
      <div style={{ width: 140, height: 18, borderRadius: 4, background: 'var(--dsw-skeleton, #e5e7eb)' }} />
      <div style={{ width: '100%', maxWidth: 640, height: 120, borderRadius: 8, background: 'var(--dsw-skeleton, #e5e7eb)' }} />
    </div>
  )
}
