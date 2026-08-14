/**
 * Shared test builders for the pure fold. Events are minimal `FoldEvent`s —
 * no Harness dependency, so these tests run with plain vitest.
 */

import type { FoldEvent } from '../src/core/fold.ts'
import type { TokenUsageLike } from '../src/core/token-usage.ts'

export function usage(
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens?: number,
  cacheWriteTokens?: number,
  reasoningTokens?: number,
): TokenUsageLike & { reasoningTokens?: number } {
  return {
    inputTokens,
    outputTokens,
    ...(cacheReadTokens === undefined ? {} : { cacheReadTokens }),
    ...(cacheWriteTokens === undefined ? {} : { cacheWriteTokens }),
    ...(reasoningTokens === undefined ? {} : { reasoningTokens }),
  }
}

export function requestHeader(time: number, provider: string, model: string): FoldEvent {
  return { type: 'request/header', time, data: { header: { config: { provider, model } } } }
}

export function turnStart(turn: number, time: number): FoldEvent {
  return { type: 'turn/start', time, data: { turn } }
}

export function turnEnd(turn: number, time: number): FoldEvent {
  return { type: 'turn/end', time, data: { turn } }
}

export function stepStart(turn: number, step: number, time: number): FoldEvent {
  return { type: 'step/start', time, data: { turn, step } }
}

export function stepEnd(turn: number, step: number, time: number): FoldEvent {
  return { type: 'step/end', time, data: { turn, step } }
}

export function usageChunk(turn: number, step: number, usageValue: TokenUsageLike): FoldEvent {
  return { type: 'assistant/chunk', time: 0, data: { turn, step, chunk: { type: 'usage', usage: usageValue } } }
}

export function assistantMessage(
  turn: number,
  step: number,
  usageValue: TokenUsageLike | undefined,
  provider = 'deepseek-official',
  model = 'deepseek-v4-pro',
): FoldEvent {
  return {
    type: 'assistant/message',
    time: 0,
    data: {
      turn,
      step,
      ...(usageValue === undefined ? {} : { usage: usageValue }),
      message: { source: { provider, model } },
    },
  }
}
