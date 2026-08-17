/**
 * Weekly token aggregation and weekly heatmap geometry (US-02/US-03). Pure and
 * browser-safe: it operates on `YYYY-MM-DD` day keys that the Host already
 * resolved to the configured statistics time zone, so no timezone arithmetic
 * happens here — the Monday boundary of a natural week is deterministic for a
 * plain calendar key.
 *
 * The weekly view is aggregated entirely on the Web client from the summary's
 * per-day data (§6 "数据与实现约束"): no Host Remote or wire-contract change.
 *
 * @module @snownightt/dsh-ui-token-activity/client/core/weekly
 */

import type { TokenActivityModel, TokenActivitySummaryDay } from '../contract.ts'
import type { MonthLabel } from './geometry.ts'
import { weekdayIndex } from './geometry.ts'

/** One natural week (Monday→Sunday) as a heatmap column. */
export interface WeeklyBucket {
  /** Monday `YYYY-MM-DD` — the aggregation key (US-02). */
  weekStart: string
  /** Sunday `YYYY-MM-DD`. */
  weekEnd: string
  /** First window day actually covered by this bucket (edge weeks). */
  actualStart: string
  /** Last window day actually covered by this bucket (edge weeks). */
  actualEnd: string
  /** Week total = sum of the covered days' `input + output + cache read + cache write`. */
  totalTokens: number
  /** Aggregated per `provider + model` totals, sorted tokens desc (stable rule). */
  models: TokenActivityModel[]
}

export interface WeeklyGrid {
  /** One cell per natural week, chronological (most recent week last). */
  cells: WeeklyBucket[]
  /** Month labels attributed to the week-start month. */
  monthLabels: MonthLabel[]
}

/** Shift a plain calendar key by whole days (UTC arithmetic is DST-free). */
function shiftKey(dayKey: string, deltaDays: number): string {
  const [year, month, day] = dayKey.split('-').map(Number)
  const date = new Date(Date.UTC(year!, month! - 1, day!))
  date.setUTCDate(date.getUTCDate() + deltaDays)
  return date.toISOString().slice(0, 10)
}

/** The Monday `YYYY-MM-DD` of the natural week containing `dayKey`. */
export function mondayKeyOf(dayKey: string): string {
  const index = weekdayIndex(dayKey)
  return index === 0 ? dayKey : shiftKey(dayKey, -index)
}

/** The Sunday `YYYY-MM-DD` ending the week that starts at `mondayKey`. */
export function sundayKeyOf(mondayKey: string): string {
  return shiftKey(mondayKey, 6)
}

/** Stable model ordering: tokens desc, then provider id, then model id (§6.1, FR-05). */
export function compareModels(a: TokenActivityModel, b: TokenActivityModel): number {
  if (a.tokens !== b.tokens) return b.tokens - a.tokens
  if (a.provider !== b.provider) return a.provider < b.provider ? -1 : 1
  return a.model < b.model ? -1 : a.model > b.model ? 1 : 0
}

/**
 * Merge per-day model entries into per-(provider+model) totals and sort with
 * the stable rule (US-03: "同一 Provider / 模型在该周各日的 token 相加").
 */
export function aggregateWeekModels(models: Iterable<TokenActivityModel>): TokenActivityModel[] {
  const totals = new Map<string, number>()
  for (const model of models) {
    const key = `${model.provider}\u0000${model.model}`
    totals.set(key, (totals.get(key) ?? 0) + model.tokens)
  }
  const merged: TokenActivityModel[] = []
  for (const [key, tokens] of totals) {
    const separator = key.indexOf('\u0000')
    merged.push({ provider: key.slice(0, separator), model: key.slice(separator + 1), tokens })
  }
  merged.sort(compareModels)
  return merged
}

/**
 * Group a contiguous run of window day keys into natural weeks and aggregate
 * each week's totals and model detail. Boundary weeks keep their actual covered
 * start/end for an honest Tooltip (US-02). Weeks without any record still
 * appear as zero-token buckets so the strip stays complete and focusable.
 */
export function buildWeeklyBuckets(
  dayKeys: readonly string[],
  dayTotals: ReadonlyMap<string, number>,
  byDate: ReadonlyMap<string, TokenActivitySummaryDay>,
): WeeklyBucket[] {
  const buckets: WeeklyBucket[] = []
  let weekStart = ''
  let weekEnd = ''
  let actualStart = ''
  let actualEnd = ''
  let totalTokens = 0
  const weekModels: TokenActivityModel[] = []

  const finalize = () => {
    if (weekStart === '') return
    buckets.push({
      weekStart,
      weekEnd,
      actualStart,
      actualEnd,
      totalTokens,
      models: aggregateWeekModels(weekModels),
    })
    weekModels.length = 0
  }

  for (const dayKey of dayKeys) {
    const monday = mondayKeyOf(dayKey)
    if (monday !== weekStart) {
      finalize()
      weekStart = monday
      weekEnd = sundayKeyOf(monday)
      actualStart = dayKey
      actualEnd = dayKey
      totalTokens = 0
    }
    actualEnd = dayKey
    totalTokens += dayTotals.get(dayKey) ?? 0
    const day = byDate.get(dayKey)
    if (day !== undefined) {
      for (const model of day.models) weekModels.push(model)
    }
  }
  finalize()
  return buckets
}

/**
 * Compute the weekly grid's month labels, attributed to each week's start
 * month (US-02: "跨月周可以按周开始日期归属到对应的月份标签").
 */
export function buildWeeklyGrid(
  buckets: readonly WeeklyBucket[],
  monthLabel: (year: number, monthIndex: number) => string,
): WeeklyGrid {
  const monthLabels: MonthLabel[] = []
  let lastLabel = ''
  buckets.forEach((bucket, week) => {
    const [year, month] = bucket.weekStart.split('-').map(Number)
    const label = monthLabel(year!, month! - 1)
    if (label !== lastLabel) {
      monthLabels.push({ week, label })
      lastLabel = label
    }
  })
  return { cells: [...buckets], monthLabels }
}
