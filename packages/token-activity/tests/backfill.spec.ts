import { describe, expect, it } from 'vitest'
import { runBounded } from '../src/backfill.ts'

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

describe('runBounded (FR-07, §9.1)', () => {
  it('runs every item and returns zero failures on success', async () => {
    const seen: number[] = []
    const failed = await runBounded([1, 2, 3, 4, 5], 2, async (n) => {
      seen.push(n)
    })
    expect(failed).toBe(0)
    expect(seen.sort()).toEqual([1, 2, 3, 4, 5])
  })

  it('caps concurrency at the configured bound', async () => {
    let active = 0
    let peak = 0
    await runBounded([1, 2, 3, 4, 5, 6], 3, async () => {
      active += 1
      peak = Math.max(peak, active)
      await sleep(5)
      active -= 1
    })
    expect(peak).toBeLessThanOrEqual(3)
  })

  it('isolates failures and counts them', async () => {
    const failed = await runBounded([1, 2, 3], 2, async (n) => {
      if (n === 2) throw new Error('corrupt session')
    })
    expect(failed).toBe(1)
  })

  it('handles an empty list', async () => {
    expect(await runBounded([], 4, async () => {})).toBe(0)
  })
})
