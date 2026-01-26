/**
 * Pulse SDK public types
 */

/**
 * SDK configuration options
 */
export interface PulseConfig {
  /** Pulse API key (starts with pulse_sk_) */
  apiKey: string;
  /** Pulse server URL (default: http://localhost:3000) */
  apiUrl?: string;
  /** Number of traces to batch before sending (default: 10) */
  batchSize?: number;
  /** Interval in ms between automatic flushes (default: 5000) */
  flushInterval?: number;
  /** Enable/disable tracing (default: true) */
  enabled?: boolean;
}

/**
 * Supported LLM providers
 */
export type Provider = 'openai' | 'anthropic' | 'openrouter';

/**
 * Trace status
 */
export type TraceStatus = 'success' | 'error';

/**
 * Trace data structure - matches shared validation schema
 */
export interface Trace {
  trace_id: string;
  timestamp: string;
  provider: Provider;
  model_requested: string;
  model_used?: string;
  provider_request_id?: string;
  request_body: Record<string, unknown>;
  response_body?: Record<string, unknown>;
  input_tokens?: number;
  output_tokens?: number;
  output_text?: string;
  finish_reason?: string;
  status: TraceStatus;
  error?: Record<string, unknown>;
  cost_cents?: number;
  latency_ms: number;
  session_id?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Normalized response from any LLM provider
 */
export interface NormalizedResponse {
  /** Extracted text content from the response */
  content: string | null;
  /** Number of input/prompt tokens */
  inputTokens: number | null;
  /** Number of output/completion tokens */
  outputTokens: number | null;
  /** Normalized finish reason (stop, length, tool_calls) */
  finishReason: string | null;
  /** Model name from response */
  model: string;
  /** Cost in cents (if available from provider) */
  costCents?: number;
}

/**
 * Options for the observe() function
 */
export interface ObserveOptions {
  /** Session ID to group related traces */
  sessionId?: string;
  /** Additional metadata to attach to all traces from this client */
  metadata?: Record<string, unknown>;
}
