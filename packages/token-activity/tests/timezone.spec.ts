import { describe, expect, it } from 'vitest'
import { addDays, dayKeyFor, recentDayKeys, timeZoneOffsetMs, validateTimeZone } from '../src/core/timezone.ts'

describe('validateTimeZone (§4.3)', () => {
  it('accepts a valid IANA zone', () => {
    expect(validateTimeZone('Asia/Shanghai')).toBe('Asia/Shanghai')
    expect(validateTimeZone('UTC')).toBe('UTC')
  })

  it('rejects an unsupported zone loudly', () => {
    expect(() => validateTimeZone('Not/AZone')).toThrow(/unsupported IANA time zone/)
    expect(() => validateTimeZone('')).toThrow(/non-empty IANA time zone/)
  })
})

describe('dayKeyFor', () => {
  it('formats an instant in the configured zone', () => {
    expect(dayKeyFor(Date.UTC(2026, 7, 14, 16, 30), 'UTC')).toBe('2026-08-14')
    expect(dayKeyFor(Date.UTC(2026, 7, 14, 16, 30), 'Asia/Shanghai')).toBe('2026-08-15')
  })

  it('pads month and day', () => {
    expect(dayKeyFor(Date.UTC(2026, 0, 1), 'UTC')).toBe('2026-01-01')
  })
})

describe('addDays', () => {
  it('shifts by whole days across month and year boundaries', () => {
    expect(addDays('2026-08-01', -1, 'UTC')).toBe('2026-07-31')
    expect(addDays('2026-01-01', -1, 'UTC')).toBe('2025-12-31')
    expect(addDays('2026-12-31', 1, 'UTC')).toBe('2027-01-01')
  })

  it('is a no-op for a zero delta', () => {
    expect(addDays('2026-08-14', 0, 'UTC')).toBe('2026-08-14')
  })

  it('crosses a leap day', () => {
    expect(addDays('2024-02-28', 1, 'UTC')).toBe('2024-02-29')
    expect(addDays('2024-02-29', 1, 'UTC')).toBe('2024-03-01')
  })

  it('walks correctly across a DST transition (America/New_York)', () => {
    // 2026-03-07 → 2026-03-08 is the US spring-forward date in 2026.
    expect(addDays('2026-03-07', 1, 'America/New_York')).toBe('2026-03-08')
    expect(addDays('2026-03-08', 1, 'America/New_York')).toBe('2026-03-09')
  })
})

describe('recentDayKeys', () => {
  it('returns the oldest-first window ending at today', () => {
    const keys = recentDayKeys('2026-08-14', 5, 'UTC')
    expect(keys).toEqual(['2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14'])
  })
})

describe('timeZoneOffsetMs', () => {
  it('reports the expected offset for a fixed-offset zone', () => {
    expect(timeZoneOffsetMs(Date.UTC(2026, 7, 14), 'Asia/Shanghai')).toBe(8 * 3_600_000)
    expect(timeZoneOffsetMs(Date.UTC(2026, 7, 14), 'UTC')).toBe(0)
  })
})
