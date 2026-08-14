/**
 * Strict Client contribution for the Host `tokenActivity/summary` Remote.
 * The Host gateway can discover the live decorated method from its Service;
 * this artifact supplies the Client-side namespace, codecs, and static types
 * that must be mounted before `ctx.remote.tokenActivity` exists.
 *
 * @module @snownightt/dsh-token-activity/remote
 */

import { z } from 'zod'
import type {
  RemoteResult,
  TypertRemoteContribution,
} from '@deepseek-ai/dsh-typert-protocol'
import type { TokenActivitySummary } from './types.ts'

const modelSchema = z.object({
  provider: z.string(),
  model: z.string(),
  tokens: z.number(),
})

const daySchema = z.object({
  date: z.string(),
  totalTokens: z.number(),
  models: z.array(modelSchema),
})

const metricsSchema = z.object({
  totalTokens: z.number(),
  peakDailyTokens: z.number(),
  longestActiveChatMs: z.number(),
  currentStreakDays: z.number(),
  longestStreakDays: z.number(),
  unreportedCalls: z.number(),
})

const backfillSchema = z.object({
  state: z.union([
    z.literal('idle'),
    z.literal('running'),
    z.literal('complete'),
    z.literal('partial-failure'),
  ]),
  completedSessions: z.number(),
  totalSessions: z.number(),
  failedSessions: z.number(),
})

const summarySchema = z.object({
  timeZone: z.string(),
  generatedAt: z.number(),
  range: z.object({ from: z.string(), to: z.string() }),
  metrics: metricsSchema,
  days: z.array(daySchema),
  backfill: backfillSchema,
})

declare module '@deepseek-ai/dsh-typert-protocol' {
  interface TypertRemoteNamespace$746f6b656e4163746976697479 {
    summary: () => Promise<RemoteResult<TokenActivitySummary>>
  }

  interface TypertRemoteMap {
    'tokenActivity/summary': () => Promise<RemoteResult<TokenActivitySummary>>
  }

  interface TypertRemoteNamespaceMap {
    tokenActivity: TypertRemoteNamespace$746f6b656e4163746976697479
  }
}

/** Strict descriptor mounted by the paired Web client plugin. */
export const TYPERT_REMOTE: TypertRemoteContribution = {
  package: '@snownightt/dsh-token-activity',
  descriptors: [{
    id: '@snownightt/dsh-token-activity#tokenActivity/summary',
    service: 'tokenActivity',
    namespace: 'tokenActivity',
    method: 'summary',
    invocation: { kind: 'direct' },
    parameters: [],
    result: {
      mode: 'strict',
      typeSymbol: '@snownightt/dsh-token-activity/types#TokenActivitySummary',
      schema: summarySchema,
    },
    sourceLocation: {
      file: 'packages/token-activity/src/service.ts',
      line: 160,
      column: 3,
    },
  }],
}

export default TYPERT_REMOTE
