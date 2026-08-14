/**
 * The Host plugin: `@dsh-plugins/dsh-token-activity`.
 *
 * A Cordis service that owns the `tokenActivity` session projection, folds
 * every committed event through it, aggregates the resulting per-session
 * projections into a whole-history summary, backfills persisted (cold)
 * sessions with bounded concurrency, and exposes the one-shot summary to the
 * Web client through a typed Typert Remote.
 *
 * Registration discipline (PRD §8.1.8): every registration is a Cordis effect
 * on this plugin's fiber — projection unit, change-feed listener, and session
 * lifecycle listeners are all revoked when the plugin unloads. The projection
 * cache stays a fold shortcut only: cache loss or invalidation (a zone change
 * bumps `stateVersion`) re-folds from the logs, never from memory alone.
 *
 * @module @dsh-plugins/dsh-token-activity
 */

import { Context, Service } from '@deepseek-ai/cordis'
import s from '@deepseek-ai/schemastery'
import { TypertRemoteService, Remote } from '@deepseek-ai/dsh-typert-protocol'
import type { Session, SessionId } from '@deepseek-ai/dsh-session'
// Type-only imports: apply each package's `ctx.*` Context merge into this program.
import type {} from '@deepseek-ai/dsh-session-projection'
import type {} from '@deepseek-ai/dsh-session-projection-cache'
import type {} from '@deepseek-ai/dsh-session-persistence'
import { tokenActivityProjectionDefinition } from './projection.ts'
import type { TokenActivityProjection } from './core/fold.ts'
import { TokenActivityAggregate } from './aggregate.ts'
import { runBounded } from './backfill.ts'
import { hostTimeZone, validateTimeZone } from './core/timezone.ts'
import type { TokenActivityBackfill, TokenActivitySummary } from './types.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    tokenActivity: TokenActivityService
  }
}

/** Resolved plugin configuration (defaults applied by Schemastery). */
export interface Config {
  /** Natural-day IANA zone; defaults to the Host's own zone. */
  timeZone: string
  /** Bound on concurrent Session reads during backfill; defaults to 4. */
  backfillConcurrency: number
}

/** The default backfill concurrency (FR-08). */
export const DEFAULT_BACKFILL_CONCURRENCY = 4

export const Config: s<Config> = s.object({
  timeZone: s.string().default(hostTimeZone()),
  backfillConcurrency: s.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER).default(DEFAULT_BACKFILL_CONCURRENCY),
})

/** One cold-read recipe: cached row + tail replay → the current projection. */
type ColdRead = (id: SessionId) => Promise<void>

/**
 * Host side of the token-activity plugin. The projection unit is registered
 * under `ctx.inject(['sessionProjections'], …)` semantics via an effect on this
 * fiber, so a headless composition without the registry stays unaffected while
 * the shipped composition always has it (PRD §8.1).
 */
export class TokenActivityService extends TypertRemoteService {
  static inject = ['sessionProjections', 'sessionProjectionCache', 'sessionPersistence', 'sessions']

  static Config: s<Config> = Config

  private readonly timeZone: string
  private readonly backfillConcurrency: number
  private readonly aggregate: TokenActivityAggregate
  private backfillTask: Promise<void> | undefined

  constructor(ctx: Context, config: Config) {
    super(ctx, 'tokenActivity')
    // §4.3: an invalid/unsupported zone must fail this plugin's load loudly.
    this.timeZone = validateTimeZone(config.timeZone)
    this.backfillConcurrency = config.backfillConcurrency
    this.aggregate = new TokenActivityAggregate(this.timeZone)
  }

  protected async [Service.init](): Promise<void> {
    // Projection unit: an effect so unload revokes it (and its cached cells).
    this.ctx.effect(() => {
      const dispose = this.ctx.sessionProjections.register(tokenActivityProjectionDefinition(this.timeZone))
      return dispose
    }, 'dsh-token-activity: projection')

    // Seed already-live sessions (their in-memory projections are freshest).
    for (const session of this.ctx.sessions.list()) {
      this.readLiveSession(session)
    }

    // Incremental feed: the registry emits on every changed state reference.
    this.ctx.effect(() => this.ctx.sessionProjections.onChanged((session, key, value) => {
      if (key !== 'tokenActivity') return
      this.aggregate.setSession(session.id, value as TokenActivityProjection)
    }), 'dsh-token-activity: projection change feed')

    // Session lifecycle: new sessions fold lazily; disposed ones leave the summary.
    this.ctx.on('session/created', (session: Session) => this.readLiveSession(session))
    this.ctx.on('session/disposed', (session: Session) => this.aggregate.deleteSession(session.id))

    // Backfill is fire-and-forget: it must not block Web Host startup (FR-07).
    this.backfillTask = this.backfill()
  }

  /** Read one live session's current projection into the aggregate. */
  private readLiveSession(session: Session): void {
    const value = this.ctx.sessionProjections.snapshot(session).values.tokenActivity
    if (value !== undefined) this.aggregate.setSession(session.id, value)
  }

  /** Fold every persisted session that is not already live, with bounded concurrency. */
  private async backfill(): Promise<void> {
    const snapshots = await this.ctx.sessionPersistence.listSnapshots()
    const ids = snapshots
      .filter(snapshot => this.ctx.sessions.get(snapshot.header.id) === undefined)
      .map(snapshot => snapshot.header.id)

    if (ids.length === 0) {
      this.aggregate.setBackfill({ state: 'complete', completedSessions: 0, totalSessions: 0, failedSessions: 0 })
      return
    }

    const total = ids.length
    let completed = 0
    let failed = 0

    // Progress starts at running with 0/0; the summary streams partial results.
    const setProgress = (state: TokenActivityBackfill['state']): void => {
      this.aggregate.setBackfill({
        state,
        completedSessions: completed,
        totalSessions: total,
        failedSessions: failed,
      })
    }
    setProgress('running')

    const coldRead: ColdRead = async (id) => {
      const snapshot = await this.ctx.sessionProjectionCache.coldSnapshot(id)
      const value = snapshot.values.tokenActivity
      if (value !== undefined) this.aggregate.setSession(id, value)
    }

    // Per-session isolation (FR-07): one corrupt Session never aborts the rest.
    failed = await runBounded(ids, this.backfillConcurrency, async (id) => {
      await coldRead(id)
      completed += 1
      setProgress('running')
    })

    setProgress(failed > 0 ? 'partial-failure' : 'complete')
  }

  /** One-shot, client-safe whole-history summary (§6.4). */
  @Remote('summary')
  summary(): Promise<TokenActivitySummary> {
    return Promise.resolve(this.aggregate.buildSummary(Date.now()))
  }
}

export default TokenActivityService
