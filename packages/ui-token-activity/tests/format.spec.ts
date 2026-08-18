import { describe, expect, it } from 'vitest'
import {
  formatDuration,
  formatMonthDay,
  formatStreakDays,
  formatWanYiTokens,
  formatWeekRange,
} from '../src/client/core/format.ts'

describe('formatWeekRange (US-03)', () => {
  it('renders a same-year range with a shortened end date (zh)', () => {
    expect(formatWeekRange('2026-04-06', '2026-04-12', 'zh-CN')).toBe('2026年4月6日 – 4月12日')
  })

  it('renders a same-year range with a shortened end date (en)', () => {
    expect(formatWeekRange('2026-04-06', '2026-04-12', 'en-US')).toBe('April 6, 2026 – April 12')
  })

  it('renders both full dates for a cross-year week', () => {
    expect(formatWeekRange('2025-12-29', '2026-01-04', 'zh-CN')).toBe('2025年12月29日 – 2026年1月4日')
    expect(formatWeekRange('2025-12-29', '2026-01-04', 'en-US')).toBe('December 29, 2025 – January 4, 2026')
  })
})

describe('formatMonthDay', () => {
  it('renders month + day only', () => {
    expect(formatMonthDay('2026-04-12', 'zh-CN')).toBe('4月12日')
    expect(formatMonthDay('2026-04-12', 'en-US')).toBe('April 12')
  })
})

describe('formatStreakDays', () => {
  it('renders a streak length with its unit (天 / d)', () => {
    expect(formatStreakDays(12, 'zh-CN')).toBe('12天')
    expect(formatStreakDays(12, 'en-US')).toBe('12d')
  })

  it('renders zero days', () => {
    expect(formatStreakDays(0, 'zh-CN')).toBe('0天')
    expect(formatStreakDays(0, 'en-US')).toBe('0d')
  })
})

describe('formatDuration (minute precision)', () => {
  it('renders minutes only for sub-hour durations', () => {
    expect(formatDuration(5 * 60_000, 'zh-CN')).toBe('5分钟')
    expect(formatDuration(5 * 60_000, 'en-US')).toBe('5m')
  })

  it('floors seconds away and keeps minute precision', () => {
    expect(formatDuration(90_000, 'zh-CN')).toBe('1分钟') // 1 min 30 s
    expect(formatDuration(59_999, 'zh-CN')).toBe('0分钟')
  })

  it('combines days, hours and minutes', () => {
    expect(formatDuration(2 * 86_400_000 + 3 * 3_600_000 + 30 * 60_000, 'zh-CN')).toBe('2天3小时30分钟')
    expect(formatDuration(2 * 86_400_000 + 3 * 3_600_000, 'en-US')).toBe('2d 3h')
  })
})

describe('formatWanYiTokens (总计栏 万/亿 units)', () => {
  it('renders 亿 with exactly two decimals at and above 1e8', () => {
    expect(formatWanYiTokens(100_000_000, 'zh-CN')).toBe('1.00亿')
    expect(formatWanYiTokens(123_456_789, 'zh-CN')).toBe('1.23亿')
    expect(formatWanYiTokens(999_999_999, 'zh-CN')).toBe('10.00亿')
  })

  it('renders 万 with exactly two decimals at and above 1e4', () => {
    expect(formatWanYiTokens(10_000, 'zh-CN')).toBe('1.00万')
    expect(formatWanYiTokens(45_678, 'zh-CN')).toBe('4.57万')
    expect(formatWanYiTokens(99_994_999, 'zh-CN')).toBe('9999.50万')
  })

  it('escalates a two-decimal carry at the 万/亿 boundary to 亿', () => {
    expect(formatWanYiTokens(99_999_999, 'zh-CN')).toBe('1.00亿')
  })

  it('falls back to a raw localized integer below 1万', () => {
    expect(formatWanYiTokens(9_999, 'zh-CN')).toBe('9,999')
    expect(formatWanYiTokens(9_999, 'en-US')).toBe('9,999')
    expect(formatWanYiTokens(500, 'zh-CN')).toBe('500')
  })

  it('uses 万/亿 regardless of the active locale', () => {
    expect(formatWanYiTokens(45_678, 'en-US')).toBe('4.57万')
    expect(formatWanYiTokens(123_456_789, 'en-US')).toBe('1.23亿')
  })

  it('renders zero and rejects invalid values', () => {
    expect(formatWanYiTokens(0, 'zh-CN')).toBe('0')
    expect(formatWanYiTokens(-1, 'zh-CN')).toBe('0')
    expect(formatWanYiTokens(Number.NaN, 'zh-CN')).toBe('0')
  })
})
