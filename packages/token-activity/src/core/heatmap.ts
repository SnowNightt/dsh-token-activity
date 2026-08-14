/**
 * Heatmap intensity bucketing (PRD FR-04). Pure and framework-free.
 *
 * The four activity levels derive from the 365-day window maximum using
 * `log1p` normalization, which keeps a single extreme peak from flattening
 * every ordinary day into the lowest bucket.
 *
 * @module @snownightt/dsh-token-activity/core/heatmap
 */

/** 0 = neutral (no activity); 1..4 = ascending brand-color intensity. */
export type HeatmapLevel = 0 | 1 | 2 | 3 | 4

/**
 * Map one day's exact tokens to its intensity level against the window max.
 * A zero/negative window max yields neutral for every day (FR-04).
 */
export function heatmapLevel(dayTokens: number, maxDayTokens: number): HeatmapLevel {
  if (dayTokens <= 0 || maxDayTokens <= 0) return 0
  const ratio = Math.log1p(dayTokens) / Math.log1p(maxDayTokens)
  if (ratio <= 0.25) return 1
  if (ratio <= 0.5) return 2
  if (ratio <= 0.75) return 3
  return 4
}

/**
 * Convenience: level every day of a window in one pass. `dayTotals` maps each
 * date to its exact total; `maxDayTokens` is the window maximum.
 */
export function heatmapLevels(
  dayTotals: ReadonlyMap<string, number>,
  maxDayTokens: number,
): ReadonlyMap<string, HeatmapLevel> {
  const levels = new Map<string, HeatmapLevel>()
  for (const [dayKey, tokens] of dayTotals) {
    levels.set(dayKey, heatmapLevel(tokens, maxDayTokens))
  }
  return levels
}
