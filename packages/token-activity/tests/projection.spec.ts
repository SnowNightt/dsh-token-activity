import { describe, expect, it } from 'vitest'
import { stateVersionFor } from '../src/projection.ts'

describe('stateVersionFor (§8.1.5)', () => {
  it('is a non-negative safe integer', () => {
    expect(Number.isSafeInteger(stateVersionFor('UTC'))).toBe(true)
    expect(stateVersionFor('UTC')).toBeGreaterThanOrEqual(0)
  })

  it('changes when the time zone changes (cache invalidation)', () => {
    expect(stateVersionFor('Asia/Shanghai')).not.toBe(stateVersionFor('UTC'))
    expect(stateVersionFor('America/New_York')).not.toBe(stateVersionFor('Asia/Shanghai'))
  })

  it('is deterministic for the same zone', () => {
    expect(stateVersionFor('Asia/Shanghai')).toBe(stateVersionFor('Asia/Shanghai'))
  })
})
