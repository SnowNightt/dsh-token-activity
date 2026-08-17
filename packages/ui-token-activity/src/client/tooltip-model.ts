/**
 * Pure Tooltip content model (PRD FR-05, §4.2; US-03). No React: the
 * components just render these rows, so the sorting/disambiguation rules are
 * unit-testable. Both the daily and the weekly heatmap build their Tooltip
 * content here.
 *
 * @module @snownightt/dsh-ui-token-activity/client/tooltip-model
 */

import type { TokenActivityModel, TokenActivitySummaryDay } from './contract.ts'
import type { WeeklyBucket } from './core/weekly.ts'
import { compareModels } from './core/weekly.ts'
import { formatDayKey, formatInteger, formatWeekRange } from './core/format.ts'

export interface TooltipModelRow {
  /** Display label: model id, or `Provider · Model` when the name is ambiguous. */
  label: string
  /** Provider id (always present in the accessible name). */
  provider: string
  /** Model id. */
  model: string
  /** Localized full integer. */
  tokens: string
}

export interface TooltipContent {
  /** Date line (daily) or week range (weekly). */
  date: string
  total: string
  rows: TooltipModelRow[]
}

const totalPrefix = (locale: string): string => locale.toLowerCase().startsWith('zh') ? '总计' : 'Total'
const weekTotalPrefix = (locale: string): string => locale.toLowerCase().startsWith('zh') ? '本周使用 Token：' : 'Tokens this week: '

/**
 * Same model names from different providers are disambiguated with
 * `Provider · Model` (§4.2). The caller must pass models already sorted by the
 * stable rule; the labels are derived without re-sorting.
 */
function buildRows(models: readonly TokenActivityModel[], locale: string): TooltipModelRow[] {
  const counts = new Map<string, number>()
  for (const model of models) counts.set(model.model, (counts.get(model.model) ?? 0) + 1)

  return models.map(model => ({
    label: counts.get(model.model)! > 1 ? `${model.provider} · ${model.model}` : model.model,
    provider: model.provider,
    model: model.model,
    tokens: formatInteger(model.tokens, locale),
  }))
}

/**
 * Build the fixed daily Tooltip content: date line, day total, and one row per
 * model sorted by tokens desc then provider/model (FR-05). An inactive day (no
 * `day` record) still shows its date and `0 tokens` with no model list (FR-05).
 */
export function buildTooltipContent(date: string, day: TokenActivitySummaryDay | undefined, locale: string): TooltipContent {
  if (day === undefined) {
    return {
      date: formatDayKey(date, locale),
      total: `${totalPrefix(locale)} ${formatInteger(0, locale)} tokens`,
      rows: [],
    }
  }

  const models = [...day.models].sort(compareModels)

  return {
    date: formatDayKey(day.date, locale),
    total: `${totalPrefix(locale)} ${formatInteger(day.totalTokens, locale)} tokens`,
    rows: buildRows(models, locale),
  }
}

/**
 * Build the weekly Tooltip content (US-03): the actual covered week range
 * (honest for window-edge weeks), the week total, and the aggregated model
 * rows. A week without any model call still shows its range and `0` with no
 * model list.
 */
export function buildWeeklyTooltipContent(week: WeeklyBucket, locale: string): TooltipContent {
  const models = [...week.models].sort(compareModels)
  return {
    date: formatWeekRange(week.actualStart, week.actualEnd, locale),
    total: `${weekTotalPrefix(locale)}${formatInteger(week.totalTokens, locale)}`,
    rows: buildRows(models, locale),
  }
}
