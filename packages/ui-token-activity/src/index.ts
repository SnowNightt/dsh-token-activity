/**
 * Host half of `@snownightt/dsh-ui-token-activity`. This package is a
 * client-side settings section: the Host entry only re-exports the client-safe
 * wire contract for consumers and performs no Host-side registration. The
 * browser half lives at `./client` and is selected by the `dsh.client`
 * manifest in `package.json`.
 *
 * @module @snownightt/dsh-ui-token-activity
 */

export type {
  TokenActivityBackfill,
  TokenActivityMetrics,
  TokenActivityModel,
  TokenActivityRemote,
  TokenActivitySummary,
  TokenActivitySummaryDay,
} from './client/contract.ts'
export type {
  TokenActivityKey,
  TokenActivityLocaleKeys,
  TokenActivityTranslate,
} from './client/locales.ts'

/** Host plugin body; the selected contributions mount only in Client environments. */
export function apply(): void {}
