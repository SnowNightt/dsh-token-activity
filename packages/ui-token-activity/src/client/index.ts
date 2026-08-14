/**
 * Browser half of `@dsh-plugins/dsh-ui-token-activity`: registers the
 * "使用量 / Usage" settings section (PRD FR-01) through the existing
 * `settings.section` slot, wires it to the typed Token Activity remote, and
 * keeps the page fresh with backfill polling.
 *
 * Registration discipline mirrors `ui-settings-models`: everything is an
 * effect on this fiber, so unload revokes the section, the copy dictionaries,
 * and the store together (§8.1.8).
 *
 * @module @dsh-plugins/dsh-ui-token-activity/client
 */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the settings shell's SlotMap merge (the 'settings.section'
// entry) and the locale plugin's Context merge (ctx.locale) into this program.
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import { en, zh } from './locales.ts'
import type { TokenActivityKey, TokenActivityTranslate } from './locales.ts'
import { TokenActivityStore } from './store.ts'
import type { TokenActivityRemote } from './contract.ts'
import { TokenActivitySection } from './TokenActivitySection.tsx'
import type { TokenActivitySectionInjected } from './TokenActivitySection.tsx'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The token-activity settings page copy. */
    'settings.token-activity': TokenActivityKey
  }
}

const NS = 'settings.token-activity'
const SECTION_ID = 'token-activity'

/** Required services (cordis fiber inject). */
export const inject = ['slots', 'locale', 'remote']

/**
 * Register the Usage section and drive its store.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-ui-token-activity: copy')

  // The Host publishes the `tokenActivity` namespace on the typed Remote; the
  // generated client binding types it, and this cast keeps the local contract
  // honest without importing the typert generator's output here.
  const remote = (ctx.remote as unknown as { tokenActivity: TokenActivityRemote }).tokenActivity
  const store = new TokenActivityStore({ fetchSummary: () => remote.summary() })
  const t = ctx.locale.bind(NS) as unknown as TokenActivityTranslate

  const injected = (): TokenActivitySectionInjected => ({
    store,
    t,
    locale: {
      getSnapshot: () => ctx.locale.getLocale(),
      subscribe: listener => ctx.locale.subscribe(listener),
    },
  })

  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: SECTION_ID,
    order: 30,
    label: () => t('nav'),
    inject: injected,
  }, TokenActivitySection))

  // First load now; the store polls while a backfill is running and the
  // dispose revokes the timer with this fiber.
  ctx.effect(() => {
    void store.load()
    return () => store.dispose()
  }, 'dsh-ui-token-activity: store')
}
