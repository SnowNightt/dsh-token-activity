/**
 * The slot component registered under `settings.section`. It connects the data
 * store and the locale face to the presentational page. Kept free of any
 * concrete Harness runtime type (the `LocaleFace` is a structural subset) so
 * this wiring is unit-testable in isolation.
 *
 * @module @dsh-plugins/dsh-ui-token-activity/client/TokenActivitySection
 */

import { useSyncExternalStore } from 'react'
import type { TokenActivityStore } from './store.ts'
import type { TokenActivityTranslate } from './locales.ts'
import { TokenActivityPage } from './TokenActivityPage.tsx'

/** Structural subset of the Harness locale face (getSnapshot + subscribe). */
export interface LocaleFace {
  getSnapshot(): { active: string }
  subscribe(listener: () => void): () => void
}

export interface TokenActivitySectionInjected {
  store: TokenActivityStore
  t: TokenActivityTranslate
  locale: LocaleFace
}

export function TokenActivitySection({ store, t, locale }: TokenActivitySectionInjected) {
  const status = useSyncExternalStore(
    listener => store.subscribe(listener),
    () => store.getSnapshot(),
  )
  const activeLocale = useSyncExternalStore(
    listener => locale.subscribe(listener),
    () => locale.getSnapshot().active,
  )
  return <TokenActivityPage status={status} locale={activeLocale} t={t} onRetry={() => store.retry()} />
}
