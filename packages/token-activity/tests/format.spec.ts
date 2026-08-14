import { describe, expect, it } from 'vitest'
import {
  formatCompactTokens,
  formatDayKey,
  formatDuration,
  formatInteger,
  formatMonthLabel,
  isZhLocale,
} from '../src/core/format.ts'

describe('isZhLocale', () => {
  it('detects Chinese locale tags', () => {
    expect(isZhLocale('zh-CN')).toBe(true)
    expect(isZhLocale('zh-TW')).toBe(true)
    expect(isZhLocale('en-US')).toBe(false)
  })
})

describe('formatInteger', () => {
  it('adds localized thousands separators', () => {
    expect(formatInteger(30000, 'zh-CN')).toBe('30,000')
    expect(formatInteger(30000, 'en-US')).toBe('30,000')
  })
})

describe('formatCompactTokens (FR-02, §7.3)', () => {
  it('uses 万/亿 for Chinese', () => {
    expect(formatCompactTokens(1_031_000_000, 'zh-CN')).toBe('10.31亿')
    expect(formatCompactTokens(2_100_000_000, 'zh-CN')).toBe('21亿')
    expect(formatCompactTokens(1_284_000, 'zh-CN')).toBe('128.4万')
    expect(formatCompactTokens(9999, 'zh-CN')).toBe('9,999')
  })

  it('uses K/M/B for English', () => {
    expect(formatCompactTokens(2_100_000_000, 'en-US')).toBe('2.1B')
    expect(formatCompactTokens(1_284_000, 'en-US')).toBe('1.28M')
    expect(formatCompactTokens(12_000, 'en-US')).toBe('12K')
    expect(formatCompactTokens(999, 'en-US')).toBe('999')
  })

  it('treats non-finite and negative input as zero', () => {
    expect(formatCompactTokens(Number.NaN, 'en-US')).toBe('0')
    expect(formatCompactTokens(-5, 'en-US')).toBe('0')
  })
})

describe('formatDayKey (FR-05)', () => {
  it('renders the PRD example for Chinese', () => {
    expect(formatDayKey('2026-08-14', 'zh-CN')).toBe('2026年8月14日')
  })

  it('renders a localized date for English', () => {
    expect(formatDayKey('2026-08-14', 'en-US')).toContain('2026')
  })
})

describe('formatMonthLabel', () => {
  it('produces a short month label', () => {
    expect(formatMonthLabel(2026, 7, 'en-US')).toContain('Aug')
    expect(formatMonthLabel(2026, 7, 'zh-CN')).toContain('8月')
  })
})

describe('formatDuration (§4.5, §7.3)', () => {
  it('drops leading zero units', () => {
    expect(formatDuration(5 * 60_000, 'zh-CN')).toBe('5分钟')
    expect(formatDuration(5 * 60_000, 'en-US')).toBe('5m')
  })

  it('formats hours and minutes', () => {
    expect(formatDuration(2 * 3_600_000 + 30 * 60_000, 'zh-CN')).toBe('2小时30分钟')
    expect(formatDuration(2 * 3_600_000 + 30 * 60_000, 'en-US')).toBe('2h 30m')
  })

  it('formats days', () => {
    expect(formatDuration(3 * 86_400_000 + 4 * 3_600_000, 'zh-CN')).toBe('3天4小时')
  })

  it('never returns an empty string for zero', () => {
    expect(formatDuration(0, 'en-US')).toBe('0m')
  })
})
