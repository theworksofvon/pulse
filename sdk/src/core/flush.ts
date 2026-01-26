/**
 * Flush scheduler module
 * Manages periodic flushing of trace buffer to Pulse server
 */

import {
  getConfig,
  getBuffer,
  clearBuffer,
  setFlushTimer,
  clearFlushTimer,
  setOnBufferFull,
  getFlushTimer,
  isEnabled,
} from './state';

/**
 * Placeholder for HTTP transport function.
 * Will be set by transport module to avoid circular dependency.
 */
let sendTracesFn: ((apiUrl: string, apiKey: string, traces: unknown[]) => Promise<void>) | null = null;

/**
 * Register the HTTP transport function.
 * Called by transport/http.ts during initialization.
 */
export function setSendTraces(fn: (apiUrl: string, apiKey: string, traces: unknown[]) => Promise<void>): void {
  sendTracesFn = fn;
}

/**
 * Flush the trace buffer to the Pulse server.
 * Clears the buffer after successful send.
 * Logs errors but does not throw (fire-and-forget).
 */
export async function flushBuffer(): Promise<void> {
  if (!isEnabled()) {
    return;
  }

  const traces = getBuffer();
  if (traces.length === 0) {
    return;
  }

  const config = getConfig();

  // Clear buffer before sending to avoid duplicate traces on retry
  clearBuffer();

  if (!sendTracesFn) {
    console.warn('Pulse SDK: transport not configured, traces will be lost');
    return;
  }

  try {
    await sendTracesFn(config.apiUrl, config.apiKey, traces);
  } catch (error) {
    // Log error but don't throw - tracing should not break the app
    console.error('Pulse SDK: failed to flush traces:', error);
  }
}

/**
 * Start the periodic flush interval.
 * Uses the flushInterval from configuration.
 */
export function startFlushInterval(): void {
  const config = getConfig();

  // Clear any existing timer first
  stopFlushInterval();

  const timer = setInterval(() => {
    flushBuffer().catch(() => {
      // Error already logged in flushBuffer
    });
  }, config.flushInterval);

  setFlushTimer(timer);

  // Register callback for buffer-full flush
  setOnBufferFull(() => {
    flushBuffer().catch(() => {
      // Error already logged in flushBuffer
    });
  });
}

/**
 * Stop the periodic flush interval.
 */
export function stopFlushInterval(): void {
  clearFlushTimer();
}

/**
 * Check if flush interval is running.
 */
export function isFlushIntervalRunning(): boolean {
  return getFlushTimer() !== null;
}
