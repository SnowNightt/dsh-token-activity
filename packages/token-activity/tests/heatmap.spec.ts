import { describe, expect, it } from 'vitest'
import { heatmapLevel } from '../src/core/heatmap.ts'

describe('heatmapLevel (FR-04)', () => {
  it('is neutral for zero activity', () => {
    expect(heatmapLevel(0, 1000)).toBe(0)
  })

  it('is neutral when the window max is zero', () => {
    expect(heatmapLevel(500, 0)).toBe(0)
  })

  it('maps the window maximum to the top level', () => {
    expect(heatmapLevel(1000, 1000)).toBe(4)
  })

  it('maps a quarter of log-space to level 1', () => {
    const max = 1000
    // ratio = log1p(x)/log1p(max) just above 0 and at most 0.25
    const x = Math.expm1(0.1 * Math.log1p(max))
    expect(heatmapLevel(x, max)).toBe(1)
  })

  it('maps the second quarter to level 2', () => {
    const max = 1000
    const x = Math.expm1(0.4 * Math.log1p(max))
    expect(heatmapLevel(x, max)).toBe(2)
  })

  it('maps the third quarter to level 3', () => {
    const max = 1000
    const x = Math.expm1(0.7 * Math.log1p(max))
    expect(heatmapLevel(x, max)).toBe(3)
  })

  it('keeps an ordinary day out of the top bucket under an extreme peak', () => {
    // A 100x peak must not flatten a 100-token day into level 1.
    expect(heatmapLevel(100, 1_000_000)).toBeLessThan(4)
    expect(heatmapLevel(100, 1_000_000)).toBeGreaterThan(0)
  })
})
