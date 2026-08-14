/**
 * Calendar-day arithmetic and GitHub-style heatmap grid geometry (PRD FR-03).
 * Browser-safe and pure: `Intl` only, no Host modules.
 *
 * @module @dsh-plugins/dsh-ui-token-activity/client/core/geometry
 */

const OFFSET_FORMATTERS = new Map<string, Intl.DateTimeFormat>()

function offsetFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = OFFSET_FORMATTERS.get(timeZone)
  if (formatter === undefined) {
    formatter = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
    OFFSET_FORMATTERS.set(timeZone, formatter)
  }
  return formatter
}

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

function timeZoneOffsetMs(epochMs: number, timeZone: string): number {
  const part = offsetFormatter(timeZone)
    .formatToParts(new Date(epochMs))
    .find(part => part.type === 'timeZoneName')
  return part === undefined ? 0 : parseLongOffset(part.value)
}

function localNoonMs(dayKey: string, timeZone: string): number {
  const [year, month, day] = dayKey.split('-').map(Number)
  const noonUtc = Date.UTC(year!, month! - 1, day!, 12)
  let ts = noonUtc
  for (let round = 0; round < 4; round += 1) {
    const next = noonUtc - timeZoneOffsetMs(ts, timeZone)
    if (next === ts) break
    ts = next
  }
  return ts
}

/** Shift a `YYYY-MM-DD` key by whole calendar days in `timeZone`. */
export function addDays(dayKey: string, delta: number, timeZone: string): string {
  if (delta === 0) return dayKey
  return dayKeyFor(localNoonMs(dayKey, timeZone) + delta * 86_400_000, timeZone)
}

/** The configured-zone calendar day of an epoch-millisecond instant. */
export function dayKeyFor(epochMs: number, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = formatter.formatToParts(new Date(epochMs))
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

/** The complete recent-`days` calendar window ending at `todayKey`, oldest first. */
export function recentDayKeys(todayKey: string, days: number, timeZone: string): string[] {
  const keys: string[] = []
  let cursor = todayKey
  for (let i = 0; i < days; i += 1) {
    keys.push(cursor)
    cursor = addDays(cursor, -1, timeZone)
  }
  return keys.reverse()
}

/** Monday-based weekday index (0 = Monday … 6 = Sunday) of a `YYYY-MM-DD` key. */
export function weekdayIndex(dayKey: string): number {
  const [y, m, d] = dayKey.split('-').map(Number)
  return (new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay() + 6) % 7
}

export interface HeatmapCell {
  /** `''` for a blank weekday-alignment placeholder. */
  date: string
  /** 0 = Monday … 6 = Sunday. */
  weekday: number
  /** 0-based column (week) index. */
  week: number
}

export interface MonthLabel {
  week: number
  label: string
}

export interface HeatmapGrid {
  cells: HeatmapCell[]
  weekCount: number
  monthLabels: MonthLabel[]
}

/**
 * Build the GitHub-style grid: weeks as columns, Monday→Sunday as rows,
 * leading blank cells to align the window's first day to Monday, and a month
 * label whenever a column's month changes.
 */
export function buildHeatmapGrid(
  dayKeys: readonly string[],
  monthLabel: (year: number, monthIndex: number) => string,
): HeatmapGrid {
  if (dayKeys.length === 0) return { cells: [], weekCount: 0, monthLabels: [] }
  const leading = weekdayIndex(dayKeys[0]!)
  const total = leading + dayKeys.length
  const weekCount = Math.ceil(total / 7)

  const cells: HeatmapCell[] = []
  for (let i = 0; i < leading; i += 1) cells.push({ date: '', weekday: i, week: 0 })
  for (let i = 0; i < dayKeys.length; i += 1) {
    const index = leading + i
    cells.push({ date: dayKeys[i]!, weekday: index % 7, week: Math.floor(index / 7) })
  }

  const monthLabels: MonthLabel[] = []
  let lastLabel = ''
  for (let week = 0; week < weekCount; week += 1) {
    const firstDate = cells.find(cell => cell.week === week && cell.date !== '')?.date
    if (firstDate === undefined) continue
    const [y, m] = firstDate.split('-').map(Number)
    const label = monthLabel(y!, m! - 1)
    if (label !== lastLabel) {
      monthLabels.push({ week, label })
      lastLabel = label
    }
  }

  return { cells, weekCount, monthLabels }
}
