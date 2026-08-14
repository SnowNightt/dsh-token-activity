/**
 * `@snownightt/dsh-token-activity` — Host plugin for the token-activity page.
 *
 * Load it in a Cordis composition (see `examples/cordis.yml`); it registers the
 * `tokenActivity` session projection, aggregates provider-reported usage, and
 * exposes the one-shot summary to the paired Web client package.
 *
 * @module @snownightt/dsh-token-activity
 */

import { TokenActivityService } from './service.ts'

export { TokenActivityService, Config, DEFAULT_BACKFILL_CONCURRENCY } from './service.ts'
export type { Config as TokenActivityConfig } from './service.ts'
export { tokenActivityProjectionDefinition, stateVersionFor } from './projection.ts'
export type { TokenActivityProjection } from './core/fold.ts'

// Public wire vocabulary (client-safe).
export type {
  TokenActivityBackfill,
  TokenActivityMetrics,
  TokenActivitySummary,
  TokenActivitySummaryDay,
} from './types.ts'

// Pure, framework-free helpers (also exercised directly by the unit tests).
export { activityTokens } from './core/token-usage.ts'
export type { TokenUsageLike } from './core/token-usage.ts'
export {
  addDays,
  dayKeyFor,
  hostTimeZone,
  localNoonMs,
  recentDayKeys,
  timeZoneOffsetMs,
  validateTimeZone,
} from './core/timezone.ts'
export {
  foldTokenActivity,
  initFoldState,
  modelKey,
  splitModelKey,
  viewFoldState,
} from './core/fold.ts'
export type {
  FoldEvent,
  FoldState,
  TokenActivityDay,
  TokenActivityModel,
} from './core/fold.ts'
export { activeDayKeys, computeStreaks, mergeProjections, peakDailyTokens } from './core/metrics.ts'
export type { MergedDay, MergedTotals, StreakResult } from './core/metrics.ts'
export { heatmapLevel, heatmapLevels } from './core/heatmap.ts'
export type { HeatmapLevel } from './core/heatmap.ts'
export {
  formatCompactTokens,
  formatDayKey,
  formatDuration,
  formatInteger,
  formatMonthLabel,
  isZhLocale,
} from './core/format.ts'
export { runBounded } from './backfill.ts'
export { TokenActivityAggregate } from './aggregate.ts'

export default TokenActivityService
