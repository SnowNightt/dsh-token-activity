/**
 * Client mirror of the Host's wire vocabulary (`@dsh-plugins/dsh-token-activity/types`).
 * Kept local so the browser package typechecks and bundles without any Host
 * runtime import; the Host's `src/types.ts` is the canonical source and the
 * shapes below MUST stay in lock-step (a CI-friendly duplicate of a small,
 * stable contract).
 *
 * @module @dsh-plugins/dsh-ui-token-activity/client/contract
 */

export interface TokenActivityModel {
  provider: string
  model: string
  tokens: number
}

export interface TokenActivitySummaryDay {
  date: string
  totalTokens: number
  models: TokenActivityModel[]
}

export interface TokenActivityBackfill {
  state: 'idle' | 'running' | 'complete' | 'partial-failure'
  completedSessions: number
  totalSessions: number
  failedSessions: number
}

export interface TokenActivityMetrics {
  totalTokens: number
  peakDailyTokens: number
  longestActiveChatMs: number
  currentStreakDays: number
  longestStreakDays: number
  unreportedCalls: number
}

export interface TokenActivitySummary {
  timeZone: string
  generatedAt: number
  range: { from: string; to: string }
  metrics: TokenActivityMetrics
  days: TokenActivitySummaryDay[]
  backfill: TokenActivityBackfill
}

/** The typed Remote the Host publishes (mirror of its `@Remote('summary')`). */
export interface TokenActivityRemote {
  summary(): Promise<TokenActivitySummary>
}
