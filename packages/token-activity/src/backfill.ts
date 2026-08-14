/**
 * Bounded-concurrency runner for historical backfill (FR-07, §9.1). Each item
 * fails independently: one corrupt or unreadable Session never aborts the
 * others, and the returned count is the exact number of failures.
 *
 * @module @snownightt/dsh-token-activity/backfill
 */

/**
 * Run `run` over every item with at most `concurrency` in flight.
 * @param items - work units.
 * @param concurrency - positive safe-integer bound (already config-validated).
 * @param run - one unit; a throw/rejection is contained and counted.
 * @returns the number of items whose `run` failed.
 */
export async function runBounded<T>(
  items: readonly T[],
  concurrency: number,
  run: (item: T) => Promise<void>,
): Promise<number> {
  if (items.length === 0) return 0
  const bound = Math.max(1, Math.min(concurrency, items.length))
  let nextIndex = 0
  let failed = 0

  const workers = Array.from({ length: bound }, async () => {
    for (;;) {
      const index = nextIndex
      nextIndex += 1
      if (index >= items.length) return
      const item = items[index]
      if (item === undefined) return
      try {
        await run(item)
      } catch {
        failed += 1
      }
    }
  })

  await Promise.all(workers)
  return failed
}
