/**
 * SDK state management module
 * Manages configuration, trace buffer, and flush timer
 */

import type { Trace } from '../types';
import type { ResolvedConfig } from './config';

/**
 * Module-level state
 */
let config: ResolvedConfig | null = null;
let traceBuffer: Trace[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Callback for triggering flush when buffer is full
 * Set by flush.ts to avoid circular dependency
 */
let onBufferFull: (() => void) | null = null;

/**
 * Set the SDK configuration.
 * Called by initPulse() after validation.
 */
export function setConfig(resolvedConfig: ResolvedConfig): void {
  config = resolvedConfig;
}

/**
 * Get the current configuration.
 * Throws if SDK has not been initialized.
 */
export function getConfig(): ResolvedConfig {
  if (!config) {
    throw new Error('Pulse SDK: not initialized. Call initPulse() first.');
  }
  return config;
}

/**
 * Check if the SDK is enabled.
 * Returns false if not initialized or explicitly disabled.
 */
export function isEnabled(): boolean {
  return config?.enabled ?? false;
}

/**
 * Add a trace to the buffer.
 * Triggers flush callback if buffer reaches configured size.
 */
export function addToBuffer(trace: Trace): void {
  if (!isEnabled()) {
    return;
  }

  traceBuffer.push(trace);

  const batchSize = config?.batchSize ?? 10;
  if (traceBuffer.length >= batchSize && onBufferFull) {
    onBufferFull();
  }
}

/**
 * Get current traces in buffer (for flushing).
 */
export function getBuffer(): Trace[] {
  return [...traceBuffer];
}

/**
 * Clear the trace buffer after successful flush.
 */
export function clearBuffer(): void {
  traceBuffer = [];
}

/**
 * Get buffer size.
 */
export function getBufferSize(): number {
  return traceBuffer.length;
}

/**
 * Set the flush timer reference.
 */
export function setFlushTimer(timer: ReturnType<typeof setInterval>): void {
  flushTimer = timer;
}

/**
 * Get the flush timer reference.
 */
export function getFlushTimer(): ReturnType<typeof setInterval> | null {
  return flushTimer;
}

/**
 * Clear the flush timer.
 */
export function clearFlushTimer(): void {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
}

/**
 * Register callback for when buffer is full.
 * Used by flush.ts to trigger flush without circular dependency.
 */
export function setOnBufferFull(callback: () => void): void {
  onBufferFull = callback;
}

/**
 * Reset all state.
 * Useful for testing or re-initialization.
 */
export function resetState(): void {
  config = null;
  traceBuffer = [];
  clearFlushTimer();
  onBufferFull = null;
}
