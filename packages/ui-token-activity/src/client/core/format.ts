/**
 * Browser-safe formatting/heatmap/day-walk helpers for the token-activity
 * page. These are deliberate, self-contained mirrors of the Host package's
 * `core/` modules: the PRD forbids shipping Host-only modules into the browser
 * bundle (§8.3), so the client owns its own pure copies rather than importing
 * the Host entry (which would drag Cordis and the Session store along).
 *
 * @module @snownightt/dsh-ui-token-activity/client/core
 */

/** Whether a BCP 47 locale tag is a Chinese variant (drives 万/亿 units). */
export function isZhLocale(locale: string): boolean {
  return locale.toLowerCase().startsWith('zh')
}

/** Full integer with localized thousands separators. */
export function formatInteger(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { useGrouping: true, maximumFractionDigits: 0 }).format(value)
}

function formatScaled(value: number, divisor: number, unit: string): string {
  const scaled = value / divisor
  const rounded = Math.round(scaled * 100) / 100
  const digits = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/\.?0+$/, '')
  return digits + unit
}

/** Compact token count (万/亿 for Chinese, K/M/B otherwise). */
export function formatCompactTokens(value: number, locale: string): string {
  if (!Number.isFinite(value) || value < 0) return formatInteger(0, locale)
  if (isZhLocale(locale)) {
    if (value >= 100_000_000) return formatScaled(value, 100_000_000, '亿')
    if (value >= 10_000) return `${Math.round(value / 10_000)}万`
    return formatInteger(value, locale)
  }
  if (value >= 1_000_000_000) return formatScaled(value, 1_000_000_000, 'B')
  if (value >= 1_000_000) return formatScaled(value, 1_000_000, 'M')
  if (value >= 1_000) return formatScaled(value, 1_000, 'K')
  return formatInteger(value, locale)
}

/**
 * Token count for the model-totals bar, always in Chinese 万/亿 units with
 * exactly two decimals (亿 for ≥ 1e8, 万 for ≥ 1e4, raw integer below 1万).
 * Unlike `formatCompactTokens` this scheme is unconditional: the totals bar is
 * specified in 万/亿 regardless of the active locale.
 */
export function formatWanYiTokens(value: number, locale: string): string {
  if (!Number.isFinite(value) || value <= 0) return formatInteger(0, locale)
  if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(2)}亿`
  if (value >= 10_000) {
    const wan = (value / 10_000).toFixed(2)
    // A two-decimal carry (e.g. 99_999_999 → 10000.00万) escalates to 亿.
    if (Number(wan) >= 10_000) return `${(value / 100_000_000).toFixed(2)}亿`
    return `${wan}万`
  }
  return formatInteger(value, locale)
}

/** A `YYYY-MM-DD` key rendered in the current locale (Tooltip date line). */
export function formatDayKey(dayKey: string, locale: string): string {
  const [year, month, day] = dayKey.split('-').map(Number)
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year!, month! - 1, day!)))
}

/** A short month label for the heatmap (e.g. `8月` / `Aug`). */
export function formatMonthLabel(year: number, monthIndex: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, monthIndex, 1)),
  )
}

/** Month + day only (the shortened second half of a same-year week range). */
export function formatMonthDay(dayKey: string, locale: string): string {
  const [year, month, day] = dayKey.split('-').map(Number)
  return new Intl.DateTimeFormat(locale, { month: 'long', day: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year!, month! - 1, day!)),
  )
}

/**
 * A week range line (US-03), e.g. `2026年4月6日 – 4月12日` (zh) or
 * `April 6, 2026 – April 12` (en). A cross-year week renders both full dates.
 */
export function formatWeekRange(startKey: string, endKey: string, locale: string): string {
  const start = formatDayKey(startKey, locale)
  const end = startKey.slice(0, 4) === endKey.slice(0, 4)
    ? formatMonthDay(endKey, locale)
    : formatDayKey(endKey, locale)
  return `${start} – ${end}`
}

const MINUTE_MS = 60_000
const HOUR_MS = 3_600_000
const DAY_MS = 86_400_000

/** Human duration for the longest-chat metric, precise to the minute. */
export function formatDuration(milliseconds: number, locale: string): string {
  const ms = Math.max(0, Math.floor(milliseconds))
  const days = Math.floor(ms / DAY_MS)
  const hours = Math.floor((ms % DAY_MS) / HOUR_MS)
  const minutes = Math.floor((ms % HOUR_MS) / MINUTE_MS)
  const zh = isZhLocale(locale)
  const parts: string[] = []
  if (days > 0) parts.push(zh ? `${days}天` : `${days}d`)
  if (hours > 0) parts.push(zh ? `${hours}小时` : `${hours}h`)
  if (minutes > 0 || parts.length === 0) parts.push(zh ? `${minutes}分钟` : `${minutes}m`)
  return parts.join(zh ? '' : ' ')
}

/** A streak length in days with its unit: `12天` / `12d`. */
export function formatStreakDays(days: number, locale: string): string {
  return `${formatInteger(days, locale)}${isZhLocale(locale) ? '天' : 'd'}`
}
