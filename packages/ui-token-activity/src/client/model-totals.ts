/**
 * Pure per-model aggregation for the 总计栏 below the heatmap: sums each
 * `provider + model` across the summary's day records (which already cover
 * exactly the trailing 365-day window) and derives display labels. No React —
 * the ModelTotals component just renders these values, so the summing and
 * disambiguation rules are unit-testable.
 *
 * @module @snownightt/dsh-ui-token-activity/client/model-totals
 */

import type { TokenActivityModel, TokenActivitySummaryDay } from './contract.ts'
import { compareModels } from './core/weekly.ts'

export const MODEL_TOTAL_KEY_SEPARATOR = '\u0000'

export function modelTotalKey(provider: string, model: string): string {
  return provider + MODEL_TOTAL_KEY_SEPARATOR + model
}

/**
 * Sum every model's tokens across all days (the summary only carries days
 * inside the 365-day range, so this IS the "past year" per-model total) and
 * sort with the stable rule: tokens desc, then provider id, then model id.
 */
export function aggregateModelTotals(days: readonly TokenActivitySummaryDay[]): TokenActivityModel[] {
  const totals = new Map<string, number>()
  for (const day of days) {
    for (const model of day.models) {
      const key = modelTotalKey(model.provider, model.model)
      totals.set(key, (totals.get(key) ?? 0) + model.tokens)
    }
  }
  const merged: TokenActivityModel[] = []
  for (const [key, tokens] of totals) {
    const separator = key.indexOf(MODEL_TOTAL_KEY_SEPARATOR)
    merged.push({ provider: key.slice(0, separator), model: key.slice(separator + 1), tokens })
  }
  merged.sort(compareModels)
  return merged
}

/**
 * Display label per `provider\u0000model` key: the bare model id, or
 * `Provider · Model` when the same model id appears under multiple providers
 * (mirrors the Tooltip's disambiguation rule, §4.2).
 */
export function buildModelTotalLabels(totals: readonly TokenActivityModel[]): Map<string, string> {
  const counts = new Map<string, number>()
  for (const item of totals) counts.set(item.model, (counts.get(item.model) ?? 0) + 1)

  const labels = new Map<string, string>()
  for (const item of totals) {
    const key = modelTotalKey(item.provider, item.model)
    labels.set(key, (counts.get(item.model) ?? 0) > 1 ? `${item.provider} · ${item.model}` : item.model)
  }
  return labels
}
