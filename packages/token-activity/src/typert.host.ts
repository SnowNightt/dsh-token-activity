/**
 * Strict Host contribution for the `tokenActivity/summary` Remote.
 *
 * Publishing this artifact through the package's `./typert` export lets the
 * Harness Typert loader register the endpoint without relying on decorator
 * markers held in one particular runtime module instance.
 *
 * @module @snownightt/dsh-token-activity/typert
 */

import TYPERT_REMOTE from './remote.ts'

/** Host manifest discovered automatically by `@deepseek-ai/dsh-typert-loader`. */
export const TYPERT = {
  package: '@snownightt/dsh-token-activity',
  face: 'host',
  schemas: [],
  invocations: TYPERT_REMOTE.descriptors,
  model: {
    services: [],
    events: [],
    objects: [],
  },
} as const
