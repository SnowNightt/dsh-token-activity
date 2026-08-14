/** Client adapter from Typert's transport envelope to the page's summary. */

import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol'
import type { TokenActivitySummary } from './contract.ts'

/**
 * Return a successful summary or turn a carrier failure into the Store's
 * ordinary error path.
 * @param result - Typert response from `tokenActivity/summary`.
 * @returns the decoded summary.
 */
export function unwrapSummaryResult(result: RemoteResult<TokenActivitySummary>): TokenActivitySummary {
  if (result.ok) return result.value
  throw new Error(`tokenActivity.summary failed: ${result.error.code}: ${result.error.message}`)
}
