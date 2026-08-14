/**
 * The single definition of "activity tokens" for one provider-reported usage
 * sample (PRD §4.1). Kept dependency-free so the projection fold, the
 * aggregate, and every unit test share one semantics source without pulling
 * any Harness host module into a test program.
 *
 * The four buckets are DISJOINT by the Harness contract: `inputTokens` is
 * uncached input only, cached input rides `cacheReadTokens`/`cacheWriteTokens`,
 * and `reasoningTokens` is a subset already inside `outputTokens`. Activity
 * therefore never adds `reasoningTokens` again — AC-04 pins this at 6,000 for
 * the 1,000 + 500 + 4,000 + 500 + 200 example, not 6,200.
 *
 * @module @snownightt/dsh-token-activity/core/token-usage
 */

/** The minimal provider-reported usage shape the fold consumes. */
export interface TokenUsageLike {
  readonly inputTokens: number
  readonly outputTokens: number
  readonly cacheReadTokens?: number
  readonly cacheWriteTokens?: number
}

/** Non-negative activity tokens: input + output + cache read + cache write. */
export function activityTokens(usage: TokenUsageLike): number {
  return usage.inputTokens
    + (usage.cacheReadTokens ?? 0)
    + (usage.cacheWriteTokens ?? 0)
    + usage.outputTokens
}
