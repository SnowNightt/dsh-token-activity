/**
 * Pure Tooltip content model (PRD FR-05, §4.2). No React: the component just
 * renders these rows, so the sorting/disambiguation rules are unit-testable.
 *
 * @module @dsh-plugins/dsh-ui-token-activity/client/tooltip-model
 */

import type { TokenActivitySummaryDay } from './contract.ts'
import { formatDayKey, formatInteger } from './core/format.ts'

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
  date: string
  total: string
  rows: TooltipModelRow[]
}

const totalPrefix = (locale: string): string => locale.toLowerCase().startsWith('zh') ? '总计' : 'Total'

/**
 * Build the fixed Tooltip content: date line, day total, and one row per model
 * sorted by tokens desc then provider/model (FR-05). Same model names from
 * different providers are disambiguated with `Provider · Model` (§4.2). An
 * inactive day (no `day` record) still shows its date and `0 tokens` with no
 * model list (FR-05).
 */
export function buildTooltipContent(date: string, day: TokenActivitySummaryDay | undefined, locale: string): TooltipContent {
  if (day === undefined) {
    return {
      date: formatDayKey(date, locale),
      total: `${totalPrefix(locale)} ${formatInteger(0, locale)} tokens`,
      rows: [],
    }
  }

  const models = [...day.models].sort((a, b) => {
    if (a.tokens !== b.tokens) return b.tokens - a.tokens
    if (a.provider !== b.provider) return a.provider < b.provider ? -1 : 1
    return a.model < b.model ? -1 : a.model > b.model ? 1 : 0
  })

  const counts = new Map<string, number>()
  for (const model of models) counts.set(model.model, (counts.get(model.model) ?? 0) + 1)

  const rows: TooltipModelRow[] = models.map(model => ({
    label: counts.get(model.model)! > 1 ? `${model.provider} · ${model.model}` : model.model,
    provider: model.provider,
    model: model.model,
    tokens: formatInteger(model.tokens, locale),
  }))

  return {
    date: formatDayKey(day.date, locale),
    total: `${totalPrefix(locale)} ${formatInteger(day.totalTokens, locale)} tokens`,
    rows,
  }
}
