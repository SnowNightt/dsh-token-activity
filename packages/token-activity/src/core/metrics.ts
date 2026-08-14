/**
 * Aggregation mathematics over per-session projections (PRD §4.4, §6.4).
 * Pure and framework-free: the aggregate service (host side) feeds these
 * helpers, and every metric is recomputable from stored projections alone.
 *
 * @module @snownightt/dsh-token-activity/core/metrics
 */

import type { TokenActivityProjection } from './fold.ts'
import { modelKey } from './fold.ts'
import { addDays } from './timezone.ts'

/** One merged calendar day across every session. */
export interface MergedDay {
  totalTokens: number
  /** `provider\u0000model` → tokens. */
  models: Record<string, number>
}

export interface MergedTotals {
  totalTokens: number
  longestActiveChatMs: number
  unreportedCalls: number
  days: Record<string, MergedDay>
}

/**
 * Merge any number of projections into one historical whole. Values are exact
 * sums — the page digits replay the Session logs, never an estimate.
 */
export function mergeProjections(projections: Iterable<TokenActivityProjection>): MergedTotals {
  const days: Record<string, MergedDay> = {}
  let totalTokens = 0
  let unreportedCalls = 0
  let longestActiveChatMs = 0
  for (const projection of projections) {
    totalTokens += projection.totalTokens
    unreportedCalls += projection.unreportedCalls
    if (projection.activeMs > longestActiveChatMs) longestActiveChatMs = projection.activeMs
    for (const [dayKey, day] of Object.entries(projection.days)) {
      const acc = days[dayKey]
      const models = acc === undefined ? {} : { ...acc.models }
      for (const model of day.models) {
        const key = modelKey(model.provider, model.model)
        models[key] = (models[key] ?? 0) + model.tokens
      }
      days[dayKey] = { totalTokens: (acc?.totalTokens ?? 0) + day.totalTokens, models }
    }
  }
  return { totalTokens, longestActiveChatMs, unreportedCalls, days }
}

/** The highest single-day activity across all retained history (§4.4). */
export function peakDailyTokens(days: Record<string, MergedDay>): number {
  let peak = 0
  for (const day of Object.values(days)) {
    if (day.totalTokens > peak) peak = day.totalTokens
  }
  return peak
}

/** The set of active day keys (exact total > 0) — an active day's identity. */
export function activeDayKeys(days: Record<string, MergedDay>): Set<string> {
  const keys = new Set<string>()
  for (const [dayKey, day] of Object.entries(days)) {
    if (day.totalTokens > 0) keys.add(dayKey)
  }
  return keys
}

export interface StreakResult {
  currentStreakDays: number
  longestStreakDays: number
}

/**
 * Current and longest streak (§4.4). Current counts consecutive active days
 * ending at `todayKey` (0 when today is inactive); longest is the maximum run
 * anywhere in retained history.
 */
export function computeStreaks(days: Record<string, MergedDay>, todayKey: string, timeZone: string): StreakResult {
  const active = activeDayKeys(days)

  let currentStreakDays = 0
  if (active.has(todayKey)) {
    let cursor = todayKey
    while (active.has(cursor)) {
      currentStreakDays += 1
      cursor = addDays(cursor, -1, timeZone)
    }
  }

  let longestStreakDays = 0
  let run = 0
  let previous: string | undefined
  for (const key of [...active].sort()) {
    if (previous !== undefined && addDays(previous, 1, timeZone) === key) {
      run += 1
    } else {
      run = 1
    }
    if (run > longestStreakDays) longestStreakDays = run
    previous = key
  }

  return { currentStreakDays, longestStreakDays }
}
