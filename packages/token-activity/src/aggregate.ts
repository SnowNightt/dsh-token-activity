/**
 * The in-memory aggregate: one small per-session projection per session id,
 * merged on demand into a whole-history summary. Only projections live here —
 * never Session logs, message text, tool arguments, or file paths — so the
 * page digits stay replayable from the logs while the runtime keeps O(#active
 * day/model cells) instead of O(log bytes) (PRD §9.1, §9.3).
 *
 * @module @snownightt/dsh-token-activity/aggregate
 */

import type { TokenActivityModel, TokenActivityProjection } from './core/fold.ts'
import { compareModels, splitModelKey } from './core/fold.ts'
import { computeStreaks, mergeProjections, peakDailyTokens } from './core/metrics.ts'
import { addDays, dayKeyFor } from './core/timezone.ts'
import type { TokenActivityBackfill, TokenActivitySummary, TokenActivitySummaryDay } from './types.ts'

const IDLE_BACKFILL: TokenActivityBackfill = Object.freeze({
  state: 'idle',
  completedSessions: 0,
  totalSessions: 0,
  failedSessions: 0,
})

/**
 * Merge-extensible per-session projection store with a read-time summary.
 * All reads are synchronous: no log scan happens after a projection lands.
 */
export class TokenActivityAggregate {
  private readonly sessions = new Map<string, TokenActivityProjection>()
  private backfill: TokenActivityBackfill = IDLE_BACKFILL

  constructor(private readonly timeZone: string) {}

  /** Replace (or insert) one session's projection; idempotent under re-delivery. */
  setSession(id: string, projection: TokenActivityProjection): void {
    this.sessions.set(id, projection)
  }

  /** Remove one session — its exclusive tokens leave the next summary (AC-12). */
  deleteSession(id: string): void {
    this.sessions.delete(id)
  }

  hasSession(id: string): boolean {
    return this.sessions.has(id)
  }

  sessionCount(): number {
    return this.sessions.size
  }

  setBackfill(backfill: TokenActivityBackfill): void {
    this.backfill = backfill
  }

  getBackfill(): TokenActivityBackfill {
    return this.backfill
  }

  /**
   * Build the one-shot summary at `nowMs` over the trailing `rangeDays`
   * calendar days (default 365). `days` carries only active dates in range;
   * the client fills neutral days itself (§6.4). Metrics cover ALL history.
   */
  buildSummary(nowMs: number, rangeDays = 365): TokenActivitySummary {
    const todayKey = dayKeyFor(nowMs, this.timeZone)
    const fromKey = addDays(todayKey, -(rangeDays - 1), this.timeZone)

    const merged = mergeProjections(this.sessions.values())
    const { currentStreakDays, longestStreakDays } = computeStreaks(merged.days, todayKey, this.timeZone)

    const days: TokenActivitySummaryDay[] = []
    for (let offset = 0; offset < rangeDays; offset += 1) {
      const date = addDays(fromKey, offset, this.timeZone)
      const day = merged.days[date]
      if (day === undefined || day.totalTokens <= 0) continue
      const models: TokenActivityModel[] = []
      for (const [key, tokens] of Object.entries(day.models)) {
        const { provider, model } = splitModelKey(key)
        models.push({ provider, model, tokens })
      }
      models.sort(compareModels)
      days.push({ date, totalTokens: day.totalTokens, models })
    }

    return {
      timeZone: this.timeZone,
      generatedAt: nowMs,
      range: { from: fromKey, to: todayKey },
      metrics: {
        totalTokens: merged.totalTokens,
        peakDailyTokens: peakDailyTokens(merged.days),
        longestActiveChatMs: merged.longestActiveChatMs,
        currentStreakDays,
        longestStreakDays,
        unreportedCalls: merged.unreportedCalls,
      },
      days,
      backfill: this.backfill,
    }
  }
}
