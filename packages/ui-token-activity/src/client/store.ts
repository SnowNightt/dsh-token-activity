/**
 * Page data store: one-shot summary fetch plus backfill-completion polling
 * (FR-06). The fetcher is injected so the store is unit-testable without any
 * Harness wire layer; the client `apply` wires it to the typed Remote.
 *
 * @module @dsh-plugins/dsh-ui-token-activity/client/store
 */

import type { TokenActivitySummary } from './contract.ts'

export type StoreStatus =
  | { kind: 'loading' }
  | { kind: 'ready'; summary: TokenActivitySummary }
  | { kind: 'error'; message: string }

export interface TokenActivityStoreOptions {
  fetchSummary: () => Promise<TokenActivitySummary>
  /** Backfill polling interval; defaults to 1500ms while `backfill.state === 'running'`. */
  pollIntervalMs?: number
}

export class TokenActivityStore {
  private readonly fetchSummary: () => Promise<TokenActivitySummary>
  private readonly pollIntervalMs: number
  private status: StoreStatus = { kind: 'loading' }
  private readonly listeners = new Set<() => void>()
  private pollTimer: ReturnType<typeof setTimeout> | undefined
  private disposed = false

  constructor(options: TokenActivityStoreOptions) {
    this.fetchSummary = options.fetchSummary
    this.pollIntervalMs = options.pollIntervalMs ?? 1500
  }

  getSnapshot(): StoreStatus {
    return this.status
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  /** Load once; schedules polling while a backfill is running. */
  async load(): Promise<void> {
    if (this.disposed) return
    try {
      const summary = await this.fetchSummary()
      if (this.disposed) return
      this.status = { kind: 'ready', summary }
      this.emit()
      this.schedulePollIfNeeded(summary)
    } catch (error) {
      if (this.disposed) return
      this.status = { kind: 'error', message: error instanceof Error ? error.message : String(error) }
      this.emit()
    }
  }

  /** Retry after a failure without reloading the Web app (FR-06). */
  retry(): void {
    this.status = { kind: 'loading' }
    this.emit()
    void this.load()
  }

  private schedulePollIfNeeded(summary: TokenActivitySummary): void {
    if (this.pollTimer !== undefined) clearTimeout(this.pollTimer)
    if (summary.backfill.state !== 'running') return
    this.pollTimer = setTimeout(() => { void this.load() }, this.pollIntervalMs)
  }

  private emit(): void {
    for (const listener of [...this.listeners]) listener()
  }

  dispose(): void {
    this.disposed = true
    if (this.pollTimer !== undefined) clearTimeout(this.pollTimer)
    this.listeners.clear()
  }
}
