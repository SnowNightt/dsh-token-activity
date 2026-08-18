/**
 * The token-activity settings page: two metric cards, optional coverage /
 * backfill notices, the daily heatmap, and the color legend — with skeleton,
 * empty, error, and in-progress states (PRD FR-02/FR-03/FR-06, §7.1).
 *
 * @module @snownightt/dsh-ui-token-activity/client/TokenActivityPage
 */

import { useMemo, useState } from 'react'
import type { TokenActivitySummary, TokenActivitySummaryDay } from './contract.ts'
import type { StoreStatus } from './store.ts'
import type { TokenActivityTranslate } from './locales.ts'
import { formatMonthLabel } from './core/format.ts'
import { buildHeatmapGrid, recentDayKeys } from './core/geometry.ts'
import { buildWeeklyBuckets, buildWeeklyGrid } from './core/weekly.ts'
import { MetricCards } from './MetricCards.tsx'
import { Heatmap } from './Heatmap.tsx'
import { WeeklyHeatmap } from './WeeklyHeatmap.tsx'
import { ViewToggle } from './ViewToggle.tsx'
import type { TokenActivityView } from './ViewToggle.tsx'
import { Legend } from './Legend.tsx'
import { ModelTotals } from './ModelTotals.tsx'
import { aggregateModelTotals } from './model-totals.ts'

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
  const [view, setView] = useState<TokenActivityView>('daily')

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

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{t('title')}</h2>
        <ViewToggle view={view} onChange={setView} t={t} />
      </div>

      {view === 'daily' ? (
        <Heatmap
          grid={model.grid}
          dayTotals={model.dayTotals}
          maxDayTokens={model.maxDayTokens}
          locale={locale}
          resolveDay={model.resolveDay}
        />
      ) : (
        <WeeklyHeatmap
          grid={model.weeklyGrid}
          maxWeekTokens={model.maxWeekTokens}
          locale={locale}
        />
      )}

      {/* 色阶图例紧贴热力图；总计栏位于其下方。 */}
      <Legend t={t} />

      {/* 总计栏: all models used in the trailing 365-day window with their totals. */}
      {model.modelTotals.length > 0 && <ModelTotals totals={model.modelTotals} locale={locale} t={t} />}

      {model.isEmpty && <div style={{ opacity: 0.7 }}>{t('empty')}</div>}
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

  const buckets = buildWeeklyBuckets(dayKeys, dayTotals, byDate)
  let maxWeekTokens = 0
  for (const bucket of buckets) {
    if (bucket.totalTokens > maxWeekTokens) maxWeekTokens = bucket.totalTokens
  }
  const weeklyGrid = buildWeeklyGrid(buckets, (year, monthIndex) => formatMonthLabel(year, monthIndex, locale))

  return {
    grid,
    dayTotals,
    maxDayTokens,
    weeklyGrid,
    maxWeekTokens,
    modelTotals: aggregateModelTotals(summary.days),
    resolveDay: (date: string) => byDate.get(date),
    // A running backfill may legitimately have no day records yet; do not
    // claim "no records" while it is still indexing (§5).
    isEmpty: summary.days.length === 0 && summary.backfill.state !== 'running',
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
