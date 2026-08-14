/**
 * Locale-aware number/date/duration formatting for the token-activity page
 * (PRD FR-02, FR-05, §7.3). Pure and browser-safe (Intl only).
 *
 * @module @snownightt/dsh-token-activity/core/format
 */

/** Whether a BCP 47 locale tag is a Chinese variant (drives 万/亿 units). */
export function isZhLocale(locale: string): boolean {
  return locale.toLowerCase().startsWith('zh')
}

/** Full integer with localized thousands separators (Tooltip, a11y names). */
export function formatInteger(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { useGrouping: true, maximumFractionDigits: 0 }).format(value)
}

/** Round `value / divisor` to at most two decimals and strip trailing zeros. */
function formatScaled(value: number, divisor: number, unit: string): string {
  const scaled = value / divisor
  const rounded = Math.round(scaled * 100) / 100
  const digits = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/\.?0+$/, '')
  return digits + unit
}

/**
 * Compact token count (FR-02): 万/亿 for Chinese, K/M/B otherwise. The exact
 * integer always stays available through {@link formatInteger} for tooltips
 * and accessible names.
 */
export function formatCompactTokens(value: number, locale: string): string {
  if (!Number.isFinite(value) || value < 0) return formatInteger(0, locale)
  if (isZhLocale(locale)) {
    if (value >= 100_000_000) return formatScaled(value, 100_000_000, '亿')
    if (value >= 10_000) return formatScaled(value, 10_000, '万')
    return formatInteger(value, locale)
  }
  if (value >= 1_000_000_000) return formatScaled(value, 1_000_000_000, 'B')
  if (value >= 1_000_000) return formatScaled(value, 1_000_000, 'M')
  if (value >= 1_000) return formatScaled(value, 1_000, 'K')
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

/** A month label for the heatmap (localized, e.g. `8月` / `Aug`). */
export function formatMonthLabel(year: number, monthIndex: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, monthIndex, 1)),
  )
}

const MINUTE_MS = 60_000
const HOUR_MS = 3_600_000
const DAY_MS = 86_400_000

/**
 * Human duration for the longest-chat metric (PRD §4.5). Drops leading zero
 * units; Chinese uses 天/小时/分钟, English uses d/h/m.
 */
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
