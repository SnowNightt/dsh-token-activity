/**
 * Public wire vocabulary shared between the Host plugin and the Web client.
 * Everything here is client-safe JSON: dates, provider/model ids, token
 * counts, activity durations, and failure counters — never message text,
 * tool arguments, or file paths (PRD §6.4, §9.3).
 *
 * @module @dsh-plugins/dsh-token-activity/types
 */

import type { TokenActivityDay, TokenActivityModel, TokenActivityProjection } from './core/fold.ts'

export type { TokenActivityDay, TokenActivityModel, TokenActivityProjection }

/** One Host-to-Client day record inside the summary (§6.4). */
export interface TokenActivitySummaryDay {
  date: string
  totalTokens: number
  models: TokenActivityModel[]
}

/** Backfill progress, streamed as the Host folds persisted history (§6.4). */
export interface TokenActivityBackfill {
  state: 'idle' | 'running' | 'complete' | 'partial-failure'
  completedSessions: number
  totalSessions: number
  failedSessions: number
}

/** The page's top metrics — computed over ALL retained history, not just 365 days (§6.4). */
export interface TokenActivityMetrics {
  totalTokens: number
  peakDailyTokens: number
  longestActiveChatMs: number
  currentStreakDays: number
  longestStreakDays: number
  unreportedCalls: number
}

/** The one-shot, client-safe summary the Host serves (§6.4). */
export interface TokenActivitySummary {
  timeZone: string
  generatedAt: number
  range: { from: string; to: string }
  metrics: TokenActivityMetrics
  days: TokenActivitySummaryDay[]
  backfill: TokenActivityBackfill
}
