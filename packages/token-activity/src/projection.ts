/**
 * The Harness projection unit that publishes the `tokenActivity` key into the
 * shared {@link SessionProjectionMap}. It is a thin, synchronous adapter around
 * the pure fold in `./core/fold.ts`: the framework owns the drive, the
 * per-session watermark cache, and change notification; this unit owns only
 * the mathematics and the wire schema.
 *
 * Time zone is projection SEMANTICS (PRD §8.1.5): the day keys are `YYYY-MM-DD`
 * in the configured zone, so the persisted-cache `stateVersion` is derived
 * from the zone. A config change re-registers the unit with a different
 * version, which discards every stored checkpoint and forces a re-fold instead
 * of silently reusing days bucketed under the previous zone.
 *
 * @module @dsh-plugins/dsh-token-activity/projection
 */

import { z } from 'zod'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import type { ProjectionDefinition } from '@deepseek-ai/dsh-session-projection'
// Type-only: resolves the merge-extensible projection table this unit extends.
import type {} from '@deepseek-ai/dsh-session-projection/types'
import type { TokenActivityProjection } from './core/fold.ts'
import { foldTokenActivity, initFoldState, viewFoldState } from './core/fold.ts'
import type { FoldEvent, FoldState } from './core/fold.ts'

export type { TokenActivityProjection } from './core/fold.ts'

declare module '@deepseek-ai/dsh-session-projection/types' {
  interface SessionProjectionMap {
    /** Provider-reported activity per calendar day for one complete session log. */
    tokenActivity: TokenActivityProjection
  }
}

/** Zod schema for the wire payload (`view` output) before it leaves the Host. */
const tokenActivityModelSchema = z.object({
  provider: z.string(),
  model: z.string(),
  tokens: z.number().int().nonnegative(),
})

const tokenActivityDaySchema = z.object({
  totalTokens: z.number().int().nonnegative(),
  models: z.array(tokenActivityModelSchema),
})

const tokenActivityProjectionSchema = z.object({
  days: z.record(z.string(), tokenActivityDaySchema),
  totalTokens: z.number().int().nonnegative(),
  activeMs: z.number().int().nonnegative(),
  unreportedCalls: z.number().int().nonnegative(),
})

/** Bump when fold state fields or fold semantics change (§8.1.4). */
const FOLD_SEMANTIC_VERSION = 1

/** 32-bit FNV-1a of the zone, folded into the stateVersion so a zone change invalidates the cache. */
function fnv1a32(text: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/** Non-negative safe-integer stateVersion that changes whenever the zone (semantics) changes. */
export function stateVersionFor(timeZone: string): number {
  return FOLD_SEMANTIC_VERSION * 0x1_0000_0000 + fnv1a32(timeZone)
}

/**
 * Build the unit for one effective zone.
 *
 * `apply` forwards the real `SessionEvent` into the fold through a documented
 * structural cast: the fold's switch handles exactly the event variants it
 * understands and its `default` branch returns the same state for every other
 * type, so an unhandled event is a no-op rather than a misinterpretation.
 */
export function tokenActivityProjectionDefinition(timeZone: string): ProjectionDefinition<'tokenActivity', FoldState> {
  return {
    key: 'tokenActivity',
    schema: tokenActivityProjectionSchema,
    init: initFoldState,
    apply: (state, event: SessionEvent) => foldTokenActivity(state, event as unknown as FoldEvent, timeZone),
    view: viewFoldState,
    stateVersion: stateVersionFor(timeZone),
  }
}
