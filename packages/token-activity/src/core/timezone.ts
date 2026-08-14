/**
 * IANA-time-zone day arithmetic for the token-activity projection and summary.
 * Pure and dependency-free: the projection fold needs only {@link dayKeyFor},
 * the summary/streak code additionally needs {@link addDays} to walk calendar
 * days across DST transitions and month/year boundaries.
 *
 * The day key is `YYYY-MM-DD` in the *configured* time zone (PRD §4.3). All
 * conversion is delegated to `Intl.DateTimeFormat`, which both validates the
 * zone (throws `RangeError` for an unsupported identifier) and performs the
 * wall-clock projection. No host clock is read here; `Date.now()` enters only
 * through the caller (the projection fold must stay synchronous and pure).
 *
 * @module @snownightt/dsh-token-activity/core/timezone
 */

const DAY_FORMATTERS = new Map<string, Intl.DateTimeFormat>()
const OFFSET_FORMATTERS = new Map<string, Intl.DateTimeFormat>()

/** One cached `en`-independent wall-clock formatter (values come from parts, not the locale). */
function dayFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = DAY_FORMATTERS.get(timeZone)
  if (formatter === undefined) {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    DAY_FORMATTERS.set(timeZone, formatter)
  }
  return formatter
}

/** One cached offset formatter producing an unambiguous `GMT±HH:MM` name. */
function offsetFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = OFFSET_FORMATTERS.get(timeZone)
  if (formatter === undefined) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'longOffset',
    })
    OFFSET_FORMATTERS.set(timeZone, formatter)
  }
  return formatter
}

/**
 * Validate an IANA time zone at plugin load (PRD §4.3: invalid or
 * unsupported zones must fail loudly, never silently fall back).
 * @param timeZone - candidate IANA zone.
 * @returns the validated zone, unchanged.
 */
export function validateTimeZone(timeZone: string): string {
  if (typeof timeZone !== 'string' || timeZone.length === 0) {
    throw new TypeError(`token-activity: timeZone must be a non-empty IANA time zone, got ${String(timeZone)}`)
  }
  try {
    dayFormatter(timeZone)
    offsetFormatter(timeZone)
  } catch (cause) {
    throw new TypeError(`token-activity: unsupported IANA time zone ${JSON.stringify(timeZone)}: ${String(cause)}`)
  }
  return timeZone
}

/** The host's own IANA zone — the documented default when none is configured. */
export function hostTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

/**
 * The configured-zone calendar day of an epoch-millisecond instant.
 * @param epochMs - Unix epoch milliseconds.
 * @param timeZone - validated IANA zone.
 * @returns `YYYY-MM-DD` in that zone.
 */
export function dayKeyFor(epochMs: number, timeZone: string): string {
  const parts = dayFormatter(timeZone).formatToParts(new Date(epochMs))
  let year = ''
  let month = ''
  let day = ''
  for (const part of parts) {
    if (part.type === 'year') year = part.value
    else if (part.type === 'month') month = part.value
    else if (part.type === 'day') day = part.value
  }
  return `${year}-${month}-${day}`
}

/** Parse a `GMT`, `UTC`, `GMT+08:00`, `GMT-05:30`, `GMT+0845` offset name to milliseconds. */
function parseLongOffset(value: string): number {
  if (value === 'GMT' || value === 'UTC') return 0
  const sign = value.startsWith('GMT-') || value.startsWith('UTC-') ? -1 : 1
  const digits = value.replace(/^(?:GMT|UTC)[+-]?/, '')
  let hours = 0
  let minutes = 0
  if (digits.includes(':')) {
    const [h, m] = digits.split(':')
    hours = Number(h)
    minutes = Number(m ?? '0')
  } else if (digits.length === 4) {
    hours = Number(digits.slice(0, 2))
    minutes = Number(digits.slice(2))
  } else {
    hours = Number(digits)
    minutes = 0
  }
  return sign * (hours * 3_600_000 + minutes * 60_000)
}

/** The zone's UTC offset at one instant (milliseconds to add to reach local wall time). */
export function timeZoneOffsetMs(epochMs: number, timeZone: string): number {
  const part = offsetFormatter(timeZone)
    .formatToParts(new Date(epochMs))
    .find(part => part.type === 'timeZoneName')
  return part === undefined ? 0 : parseLongOffset(part.value)
}

/** A timestamp whose local wall clock is 12:00 of `dayKey` in `timeZone`. */
export function localNoonMs(dayKey: string, timeZone: string): number {
  const [year, month, day] = dayKey.split('-').map(Number)
  const noonUtc = Date.UTC(year!, month! - 1, day!, 12)
  // Converge offset-at-ts: the offset is piecewise-constant (only DST steps),
  // so two-to-four fixed-point rounds suffice for every real zone.
  let ts = noonUtc
  for (let round = 0; round < 4; round += 1) {
    const next = noonUtc - timeZoneOffsetMs(ts, timeZone)
    if (next === ts) break
    ts = next
  }
  return ts
}

/**
 * Shift a `YYYY-MM-DD` key by whole calendar days in `timeZone`, crossing DST,
 * month, and year boundaries correctly (anchored at local noon).
 */
export function addDays(dayKey: string, delta: number, timeZone: string): string {
  if (delta === 0) return dayKey
  return dayKeyFor(localNoonMs(dayKey, timeZone) + delta * 86_400_000, timeZone)
}

/**
 * The complete recent-`days` calendar window ending at `todayKey` (inclusive),
 * oldest first. Used by both the summary `range` and the client grid.
 */
export function recentDayKeys(todayKey: string, days: number, timeZone: string): string[] {
  const keys: string[] = []
  let cursor = todayKey
  for (let i = 0; i < days; i += 1) {
    keys.push(cursor)
    cursor = addDays(cursor, -1, timeZone)
  }
  return keys.reverse()
}
