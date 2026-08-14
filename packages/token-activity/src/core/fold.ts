/**
 * The pure token-activity fold (PRD §4, §6.1–6.3): a synchronous, replayable
 * reducer from one committed session event to the next projection state.
 *
 * The fold is intentionally framework-free. It consumes a *minimal structural*
 * event union so the unit tests can synthesize events without any Harness
 * dependency; the Harness `ProjectionDefinition` in `../projection.ts` forwards
 * real `SessionEvent`s through the same switch (a real event's handled
 * variants are structurally compatible, and the `default` branch ignores every
 * unhandled type).
 *
 * The fold STATE must stay plain JSON (no `Map`/`Set`/`undefined` values) —
 * the Harness projection cache persists it verbatim and rejects non-JSON
 * state. Optional fields are therefore omitted, never `undefined`.
 *
 * Load-bearing rules implemented here:
 *  - day bucketing by the `step/start` instant in the configured zone (§4.3);
 *  - activity tokens = input + output + cacheRead + cacheWrite (§4.1);
 *  - final `assistant/message` usage replaces an earlier chunk, never adds (§6.2);
 *  - identical repeat samples do not change the state reference (§6.2);
 *  - a step whose request failed but recorded a chunk keeps that sample (§6.2);
 *  - a final message without usage does not delete an already-recorded chunk (§6.2);
 *  - provider/model from `message.source` when present, else the request header (§6.3);
 *  - turn activity = sum of `turn/start` → `turn/end` durations (§4.5);
 *  - a step that ends with no usage sample counts as one unreported call (§4.6).
 *
 * @module @dsh-plugins/dsh-token-activity/core/fold
 */

import type { TokenUsageLike } from './token-usage.ts'
import { activityTokens } from './token-usage.ts'
import { dayKeyFor } from './timezone.ts'

// --- Wire vocabulary (shared with the client through ../types.ts) ------------

export interface TokenActivityModel {
  provider: string
  model: string
  tokens: number
}

export interface TokenActivityDay {
  totalTokens: number
  models: TokenActivityModel[]
}

export interface TokenActivityProjection {
  days: Record<string, TokenActivityDay>
  totalTokens: number
  activeMs: number
  unreportedCalls: number
}

// --- Internal fold state (plain JSON) ---------------------------------------

/** One day's accumulated tokens, keyed by `provider\u0000model`. */
export interface FoldDay {
  totalTokens: number
  models: Record<string, number>
}

/** The usage currently attributed to the in-flight step (for replacement). */
export interface FoldAppliedUsage {
  dayKey: string
  provider: string
  model: string
  tokens: number
}

export interface FoldCurrentStep {
  turn: number
  step: number
  dayKey: string
  hasUsage: boolean
  applied?: FoldAppliedUsage
}

export interface FoldTurnStart {
  turn: number
  time: number
}

export interface FoldHeader {
  provider: string
  model: string
}

export interface FoldState {
  days: Record<string, FoldDay>
  totalTokens: number
  activeMs: number
  unreportedCalls: number
  header?: FoldHeader
  turnStart?: FoldTurnStart
  currentStep?: FoldCurrentStep
}

/** A fresh, JSON-safe empty state (one per session, never shared). */
export function initFoldState(): FoldState {
  return { days: {}, totalTokens: 0, activeMs: 0, unreportedCalls: 0 }
}

// --- Composite model key ----------------------------------------------------

export const MODEL_KEY_SEPARATOR = '\u0000'

export function modelKey(provider: string, model: string): string {
  return provider + MODEL_KEY_SEPARATOR + model
}

export function splitModelKey(key: string): { provider: string; model: string } {
  const index = key.indexOf(MODEL_KEY_SEPARATOR)
  if (index === -1) return { provider: key, model: '' }
  return { provider: key.slice(0, index), model: key.slice(index + 1) }
}

// --- The minimal event union the fold understands ---------------------------

export type FoldEvent =
  | { readonly type: 'request/header'; readonly time: number; readonly data: { readonly header: { readonly config: { readonly provider: string; readonly model: string } } } }
  | { readonly type: 'turn/start'; readonly time: number; readonly data: { readonly turn: number } }
  | { readonly type: 'turn/end'; readonly time: number; readonly data: { readonly turn: number } }
  | { readonly type: 'step/start'; readonly time: number; readonly data: { readonly turn: number; readonly step: number } }
  | { readonly type: 'step/end'; readonly time: number; readonly data: { readonly turn: number; readonly step: number } }
  | { readonly type: 'assistant/chunk'; readonly time: number; readonly data: { readonly turn: number; readonly step: number; readonly chunk: { readonly type: 'usage'; readonly usage: TokenUsageLike } | { readonly type: string } } }
  | { readonly type: 'assistant/message'; readonly time: number; readonly data: { readonly turn: number; readonly step: number; readonly usage?: TokenUsageLike; readonly message: { readonly source: { readonly provider: string; readonly model: string } } } }

/** A usage sample's resolved identity: explicit message source wins, else header. */
type UsageIdentity = { readonly provider: string; readonly model: string } | undefined

// --- Fold -------------------------------------------------------------------

/**
 * One pure transition: previous state + one committed event → next state.
 * Uninterested events return the same reference (`Object.is`), so the Harness
 * drive produces zero downstream work for them.
 */
export function foldTokenActivity(state: FoldState, event: FoldEvent, timeZone: string): FoldState {
  switch (event.type) {
    case 'request/header': {
      const provider = event.data.header.config.provider
      const model = event.data.header.config.model
      if (state.header?.provider === provider && state.header?.model === model) return state
      return { ...state, header: { provider, model } }
    }

    case 'turn/start':
      return { ...state, turnStart: { turn: event.data.turn, time: event.time } }

    case 'turn/end': {
      const start = state.turnStart
      if (start === undefined || start.turn !== event.data.turn) return state
      const { turnStart: _dropped, ...rest } = state
      return { ...rest, activeMs: state.activeMs + (event.time - start.time) }
    }

    case 'step/start':
      return {
        ...state,
        currentStep: {
          turn: event.data.turn,
          step: event.data.step,
          dayKey: dayKeyFor(event.time, timeZone),
          hasUsage: false,
        },
      }

    case 'step/end': {
      const step = state.currentStep
      if (step === undefined || step.turn !== event.data.turn || step.step !== event.data.step) return state
      const { currentStep: _dropped, ...rest } = state
      return { ...rest, unreportedCalls: state.unreportedCalls + (step.hasUsage ? 0 : 1) }
    }

    case 'assistant/chunk': {
      const chunk = event.data.chunk
      if (chunk.type !== 'usage') return state
      // Narrow the catch-all chunk variant by the checked tag.
      const usageValue = (chunk as { readonly usage: TokenUsageLike }).usage
      return foldUsageSample(state, event.data.turn, event.data.step, usageValue, undefined)
    }

    case 'assistant/message': {
      if (event.data.usage === undefined) return state
      return foldUsageSample(state, event.data.turn, event.data.step, event.data.usage, event.data.message.source)
    }

    default:
      return state
  }
}

/**
 * Attribute one usage sample to the current step, replacing that step's prior
 * sample. Corrupt samples (no matching step, or no resolvable provider/model)
 * are skipped without mutating the state, matching §6.3's "mark and skip"
 * contract rather than inventing an `unknown` model.
 */
function foldUsageSample(
  state: FoldState,
  turn: number,
  step: number,
  usage: TokenUsageLike,
  explicitIdentity: UsageIdentity,
): FoldState {
  const current = state.currentStep
  if (current === undefined || current.turn !== turn || current.step !== step) return state

  let provider: string
  let model: string
  if (explicitIdentity !== undefined) {
    provider = explicitIdentity.provider
    model = explicitIdentity.model
  } else if (state.header !== undefined) {
    provider = state.header.provider
    model = state.header.model
  } else {
    return state
  }
  if (provider === '' || model === '') return state

  const tokens = activityTokens(usage)
  const previous = current.applied
  if (previous !== undefined
    && previous.provider === provider
    && previous.model === model
    && previous.tokens === tokens) {
    // Identical repeat sample: no state change, no client push.
    return state
  }

  let days = state.days
  let totalTokens = state.totalTokens
  if (previous !== undefined) {
    days = removeModelTokens(days, previous.dayKey, previous.provider, previous.model, previous.tokens)
    totalTokens -= previous.tokens
  }
  days = addModelTokens(days, current.dayKey, provider, model, tokens)
  totalTokens += tokens

  return {
    ...state,
    days,
    totalTokens,
    currentStep: { ...current, hasUsage: true, applied: { dayKey: current.dayKey, provider, model, tokens } },
  }
}

function addModelTokens(
  days: Record<string, FoldDay>,
  dayKey: string,
  provider: string,
  model: string,
  tokens: number,
): Record<string, FoldDay> {
  const key = modelKey(provider, model)
  const day = days[dayKey]
  const models = day === undefined ? {} : { ...day.models }
  models[key] = (models[key] ?? 0) + tokens
  return { ...days, [dayKey]: { totalTokens: (day?.totalTokens ?? 0) + tokens, models } }
}

function removeModelTokens(
  days: Record<string, FoldDay>,
  dayKey: string,
  provider: string,
  model: string,
  tokens: number,
): Record<string, FoldDay> {
  const key = modelKey(provider, model)
  const day = days[dayKey]
  if (day === undefined) return days

  const models = { ...day.models }
  const remaining = (models[key] ?? 0) - tokens
  if (remaining <= 0) delete models[key]
  else models[key] = remaining

  if (Object.keys(models).length === 0) {
    const { [dayKey]: _dropped, ...rest } = days
    return rest
  }
  return { ...days, [dayKey]: { totalTokens: Math.max(0, day.totalTokens - tokens), models } }
}

// --- View (state → wire projection) -----------------------------------------

/** Stable model ordering: tokens desc, then provider id, then model id (§6.1, FR-05). */
export const compareModels = (a: TokenActivityModel, b: TokenActivityModel): number => {
  if (a.tokens !== b.tokens) return b.tokens - a.tokens
  if (a.provider !== b.provider) return a.provider < b.provider ? -1 : 1
  return a.model < b.model ? -1 : a.model > b.model ? 1 : 0
}

/** The whole client-safe projection: models sorted by tokens desc (§6.1). */
export function viewFoldState(state: FoldState): TokenActivityProjection {
  const days: Record<string, TokenActivityDay> = {}
  for (const [dayKey, day] of Object.entries(state.days)) {
    const models: TokenActivityModel[] = []
    for (const [key, tokens] of Object.entries(day.models)) {
      const { provider, model } = splitModelKey(key)
      models.push({ provider, model, tokens })
    }
    models.sort(compareModels)
    days[dayKey] = { totalTokens: day.totalTokens, models }
  }
  return {
    days,
    totalTokens: state.totalTokens,
    activeMs: state.activeMs,
    unreportedCalls: state.unreportedCalls,
  }
}
