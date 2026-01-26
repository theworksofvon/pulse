/**
 * Pulse SDK - LLM client instrumentation
 *
 * @example
 * import { initPulse, observe } from '@pulse/sdk';
 * import OpenAI from 'openai';
 *
 * initPulse({ apiKey: 'pulse_sk_...' });
 *
 * const openai = observe(new OpenAI(), 'openai');
 * const response = await openai.chat.completions.create({ ... });
 */

import type OpenAI from 'openai';
import type Anthropic from '@anthropic-ai/sdk';
import type { PulseConfig, Provider, ObserveOptions } from './types';
import { loadConfig } from './core/config';
import { setConfig } from './core/state';
import { setSendTraces, startFlushInterval } from './core/flush';
import { registerShutdownHandlers } from './core/shutdown';
import { sendTraces } from './transport/http';
import { patchOpenAI } from './providers/openai';
import { patchAnthropic } from './providers/anthropic';

/**
 * Initialize the Pulse SDK with configuration.
 * Must be called before using observe().
 *
 * @param config - SDK configuration including apiKey
 */
export function initPulse(config: PulseConfig): void {
  // Validate and merge config with defaults
  const resolvedConfig = loadConfig(config);

  // Store config in state
  setConfig(resolvedConfig);

  // Register HTTP transport for sending traces
  setSendTraces(sendTraces as (apiUrl: string, apiKey: string, traces: unknown[]) => Promise<void>);

  // Start periodic flush interval
  startFlushInterval();

  // Register process shutdown handlers for graceful flush
  registerShutdownHandlers();
}

/**
 * Detects the provider type from an LLM client instance.
 *
 * @param client - The LLM client to detect
 * @returns The detected provider or null if unknown
 */
function detectProvider(client: unknown): Provider | null {
  // Check for Anthropic client by looking for messages.create
  if (
    client &&
    typeof client === 'object' &&
    'messages' in client &&
    client.messages &&
    typeof client.messages === 'object' &&
    'create' in client.messages
  ) {
    return 'anthropic';
  }

  // Check for OpenAI-style client by looking for chat.completions.create
  if (
    client &&
    typeof client === 'object' &&
    'chat' in client &&
    client.chat &&
    typeof client.chat === 'object' &&
    'completions' in client.chat &&
    client.chat.completions &&
    typeof client.chat.completions === 'object' &&
    'create' in client.chat.completions
  ) {
    // Check if it's OpenRouter by examining baseURL
    if ('baseURL' in client && typeof client.baseURL === 'string') {
      if (client.baseURL.includes('openrouter')) {
        return 'openrouter';
      }
    }
    return 'openai';
  }

  return null;
}

/**
 * Wrap an LLM client to automatically capture traces.
 *
 * @param client - The LLM client instance (OpenAI, Anthropic)
 * @param provider - The provider type ('openai' | 'anthropic' | 'openrouter' | 'auto')
 * @param options - Optional configuration for this client
 * @returns The same client instance with methods wrapped for tracing
 *
 * @example
 * ```ts
 * import { initPulse, observe } from '@pulse/sdk';
 * import OpenAI from 'openai';
 * import Anthropic from '@anthropic-ai/sdk';
 *
 * initPulse({ apiKey: 'pulse_sk_...' });
 *
 * // Auto-detect provider
 * const openai = observe(new OpenAI());
 * const anthropic = observe(new Anthropic());
 *
 * // Explicit provider
 * const openai2 = observe(new OpenAI(), 'openai');
 *
 * // OpenRouter (uses OpenAI client)
 * const openrouter = observe(
 *   new OpenAI({ baseURL: 'https://openrouter.ai/api/v1' }),
 *   'openrouter'
 * );
 *
 * // With session tracking
 * const traced = observe(new OpenAI(), 'auto', { sessionId: 'session-123' });
 * ```
 */
export function observe<T>(
  client: T,
  provider: Provider | 'auto' = 'auto',
  options?: ObserveOptions
): T {
  // Determine the actual provider
  let resolvedProvider: Provider;

  if (provider === 'auto') {
    const detected = detectProvider(client);
    if (!detected) {
      throw new Error(
        'Could not auto-detect provider. Please specify the provider explicitly: observe(client, "openai" | "anthropic" | "openrouter")'
      );
    }
    resolvedProvider = detected;
  } else {
    resolvedProvider = provider;
  }

  // Apply the appropriate patcher based on provider
  switch (resolvedProvider) {
    case 'openai':
    case 'openrouter':
      return patchOpenAI(client as unknown as OpenAI, resolvedProvider, options) as T;
    case 'anthropic':
      return patchAnthropic(client as unknown as Anthropic, options) as T;
    default:
      throw new Error(`Unknown provider: ${resolvedProvider}`);
  }
}

// Re-export types
export type {
  PulseConfig,
  Provider,
  TraceStatus,
  Trace,
  NormalizedResponse,
  ObserveOptions,
} from './types';
