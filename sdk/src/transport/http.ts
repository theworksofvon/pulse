/**
 * HTTP transport module
 * Sends traces to the Pulse server via HTTP
 */

import type { Trace } from '../types';

/**
 * Send a batch of traces to the Pulse server.
 * Handles network errors gracefully by logging them without throwing.
 *
 * @param apiUrl - Pulse server base URL
 * @param apiKey - API key for authentication
 * @param traces - Array of traces to send
 */
export async function sendTraces(
  apiUrl: string,
  apiKey: string,
  traces: Trace[]
): Promise<void> {
  if (traces.length === 0) {
    return;
  }

  const url = `${apiUrl}/v1/traces/batch`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(traces),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(
        `Pulse SDK: failed to send traces (${response.status}): ${errorText}`
      );
    }
  } catch (error) {
    // Log network errors but don't throw - tracing should not break the app
    console.error('Pulse SDK: network error sending traces:', error);
  }
}
