/**
 * Graceful shutdown handler for SDK
 * Ensures buffered traces are flushed before process exit
 */

import { flushBuffer, stopFlushInterval } from './flush';
import { isEnabled } from './state';

let isShuttingDown = false;
let handlersRegistered = false;

/**
 * Perform graceful shutdown.
 * Flushes remaining buffer and stops flush interval.
 */
async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;

  if (!isEnabled()) {
    return;
  }

  console.log(`Pulse SDK: ${signal} received, flushing remaining traces...`);

  try {
    await flushBuffer();
    console.log('Pulse SDK: final flush complete');
  } catch (error) {
    console.error('Pulse SDK: error during final flush:', error);
  }

  stopFlushInterval();
}

/**
 * Register shutdown handlers for process signals.
 * Listens for beforeExit, SIGINT, and SIGTERM.
 * Idempotent - only registers handlers once.
 */
export function registerShutdownHandlers(): void {
  if (handlersRegistered) {
    return;
  }
  handlersRegistered = true;

  // beforeExit fires when the event loop is empty
  // This is the cleanest way to flush before exit in Node.js
  process.on('beforeExit', async () => {
    await shutdown('beforeExit');
  });

  // Handle SIGINT (Ctrl+C)
  process.on('SIGINT', async () => {
    await shutdown('SIGINT');
    process.exit(0);
  });

  // Handle SIGTERM (container/process termination)
  process.on('SIGTERM', async () => {
    await shutdown('SIGTERM');
    process.exit(0);
  });
}

/**
 * Reset shutdown state.
 * Useful for testing.
 */
export function resetShutdownState(): void {
  isShuttingDown = false;
  // Note: handlers cannot be unregistered, but we reset the flag
  // to allow re-registration in a new test context
  handlersRegistered = false;
}
