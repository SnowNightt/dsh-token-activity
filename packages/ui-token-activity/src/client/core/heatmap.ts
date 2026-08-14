/**
 * Heatmap intensity and calendar-grid geometry (PRD FR-03/FR-04). Browser-safe
 * pure modules.
 *
 * @module @dsh-plugins/dsh-ui-token-activity/client/core/heatmap
 */

export type HeatmapLevel = 0 | 1 | 2 | 3 | 4

/** Map one day's exact tokens to its intensity level against the window max. */
export function heatmapLevel(dayTokens: number, maxDayTokens: number): HeatmapLevel {
  if (dayTokens <= 0 || maxDayTokens <= 0) return 0
  const ratio = Math.log1p(dayTokens) / Math.log1p(maxDayTokens)
  if (ratio <= 0.25) return 1
  if (ratio <= 0.5) return 2
  if (ratio <= 0.75) return 3
  return 4
}
