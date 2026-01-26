/**
 * OpenAI client patcher
 *
 * Wraps OpenAI client methods to capture traces for LLM calls.
 * Works for both OpenAI and OpenRouter since they use the same client.
 */

import type OpenAI from 'openai';
import type { ChatCompletion, ChatCompletionCreateParamsNonStreaming } from 'openai/resources/chat/completions';
import type { Provider, ObserveOptions } from '../types';
import { normalizeOpenAIResponse } from '../lib/normalize';
import { buildTrace, buildErrorTrace, getStartTime, calculateElapsedTime, type TraceMetadata } from './base';
import { addToBuffer, isEnabled } from '../core/state';

/**
 * Wraps the chat.completions.create method to capture traces
 *
 * @param original - The original create method bound to its context
 * @param provider - Provider name ('openai' or 'openrouter')
 * @param options - Trace options (sessionId, metadata)
 * @returns Wrapped function that captures traces
 */
function wrapChatCompletionCreate(
  original: OpenAI.Chat.Completions['create'],
  provider: Provider,
  options?: ObserveOptions
): OpenAI.Chat.Completions['create'] {
  return async function wrappedCreate(
    this: OpenAI.Chat.Completions,
    body: ChatCompletionCreateParamsNonStreaming,
    requestOptions?: Parameters<OpenAI.Chat.Completions['create']>[1]
  ): Promise<ChatCompletion> {
    // If SDK is disabled, just call the original method
    if (!isEnabled()) {
      return original.call(this, body, requestOptions) as Promise<ChatCompletion>;
    }

    const startTime = getStartTime();
    const requestBody = body as unknown as Record<string, unknown>;

    const traceMetadata: TraceMetadata = {
      sessionId: options?.sessionId,
      metadata: options?.metadata,
    };

    try {
      // Call original method
      const response = await original.call(this, body, requestOptions) as ChatCompletion;

      // Calculate latency
      const latencyMs = calculateElapsedTime(startTime);

      // Normalize response
      const normalizedResponse = normalizeOpenAIResponse(response);

      // Build and buffer trace
      const trace = buildTrace(requestBody, normalizedResponse, provider, latencyMs, traceMetadata);
      addToBuffer(trace);

      // Return original response unchanged
      return response;
    } catch (error) {
      // Calculate latency even on error
      const latencyMs = calculateElapsedTime(startTime);

      // Build error trace
      const trace = buildErrorTrace(
        requestBody,
        error instanceof Error ? error : new Error(String(error)),
        provider,
        latencyMs,
        traceMetadata
      );
      addToBuffer(trace);

      // Re-throw the original error
      throw error;
    }
  } as OpenAI.Chat.Completions['create'];
}

/**
 * Patches an OpenAI client to capture traces for LLM calls
 *
 * @param client - The OpenAI client instance to patch
 * @param provider - Provider name: 'openai' for OpenAI API, 'openrouter' for OpenRouter
 * @param options - Trace options (sessionId, metadata)
 * @returns The same client instance with methods wrapped for tracing
 *
 * @example
 * ```ts
 * import OpenAI from 'openai';
 * import { patchOpenAI } from '@pulse/sdk';
 *
 * const client = new OpenAI({ apiKey: 'sk-...' });
 * patchOpenAI(client, 'openai');
 *
 * // All calls are now traced
 * const response = await client.chat.completions.create({
 *   model: 'gpt-4o',
 *   messages: [{ role: 'user', content: 'Hello!' }]
 * });
 * ```
 */
export function patchOpenAI<T extends OpenAI>(
  client: T,
  provider: 'openai' | 'openrouter',
  options?: ObserveOptions
): T {
  // Store original method
  const originalCreate = client.chat.completions.create.bind(client.chat.completions);

  // Wrap chat.completions.create
  client.chat.completions.create = wrapChatCompletionCreate(originalCreate, provider, options);

  return client;
}
