# Changelog

All notable changes from Ralph Wiggum Loop sessions.

## 2026-01-25

### Added

- Created cost calculation unit tests `sdk/tests/pricing.test.ts`
  - 26 tests covering `calculateCost()` and `hasPricing()` functions
  - Known models - direct lookup tests:
    - gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo cost calculations
    - claude-3-5-sonnet-20241022, claude-3-5-haiku-20241022, claude-3-opus-20240229 cost calculations
  - Known models - alias lookup tests:
    - Date-versioned aliases (gpt-4o-2024-11-20, gpt-4o-mini-2024-07-18)
    - Short name aliases (claude-3-5-sonnet, claude-3-opus)
    - Dot notation aliases (claude-3.5-sonnet)
  - Unknown models tests:
    - Returns null for unknown model names
    - Returns null for empty string
    - Returns null for typos and non-existent providers
  - Edge cases - zero tokens tests:
    - Zero input and output returns 0
    - Zero input only calculates output cost correctly
    - Zero output only calculates input cost correctly
  - Edge cases - large numbers tests:
    - 1 million input tokens returns expected cost
    - 1 million output tokens returns expected cost
    - Very large token counts (10M input, 5M output) calculate correctly
    - Precision maintained for small token counts (1 input, 1 output)
  - `hasPricing()` function tests:
    - Returns true for known models and aliases
    - Returns false for unknown models

---

- Created trace validation schema unit tests `shared/tests/validation.test.ts`
  - 40 tests covering traceSchema, batchTraceSchema, providerSchema, and statusSchema
  - `providerSchema` tests: Valid providers (openai, anthropic, openrouter), invalid providers rejected
  - `statusSchema` tests: Valid statuses (success, error), invalid statuses rejected
  - `traceSchema` valid trace tests:
    - Minimal valid trace with required fields only
    - Fully populated trace with all optional fields
    - Error status trace with error object
    - All valid provider enum values
    - Timestamps with timezone offsets
    - Zero values for latency and tokens
  - `traceSchema` missing required fields tests:
    - trace_id, timestamp, provider, model_requested, request_body, status, latency_ms
  - `traceSchema` invalid field value tests:
    - Invalid UUID format for trace_id and session_id
    - Invalid timestamp formats
    - Invalid provider and status enum values
    - Empty model_requested string
    - Negative values for latency_ms, tokens, cost_cents
    - Non-integer token values
    - Non-object values for request_body, response_body, metadata
  - `batchTraceSchema` tests:
    - Empty array allowed
    - Single and multiple valid traces
    - Exactly 100 traces (max limit) succeeds
    - More than 100 traces fails
    - Invalid trace in batch causes failure
    - Non-array input fails
  - Added test script to `shared/package.json`
  - Added `@types/bun` dev dependency for test types

---

- Created SDK README `sdk/README.md`
  - Installation instructions for Bun
  - Quick start example with OpenAI
  - Provider-specific examples for OpenAI, Anthropic, and OpenRouter
  - Configuration options reference table with defaults
  - Session tracking and custom metadata examples
  - Provider auto-detection behavior documentation
  - Graceful shutdown explanation
  - List of captured trace data fields
  - Error handling behavior
  - TypeScript type imports reference

---

- Implemented `observe()` function in `sdk/src/index.ts`
  - Main export for wrapping LLM clients to automatically capture traces
  - Accepts `client`, `provider`, and optional `options` parameters
  - Provider can be `'openai' | 'anthropic' | 'openrouter' | 'auto'` (default: `'auto'`)
  - Auto-detection logic:
    - Detects Anthropic clients by checking for `messages.create` method
    - Detects OpenAI-style clients by checking for `chat.completions.create` method
    - Distinguishes OpenRouter from OpenAI by checking if `baseURL` contains 'openrouter'
  - `detectProvider(client)`: Internal function that examines client structure to determine provider
  - Calls appropriate patcher function based on resolved provider:
    - `patchOpenAI()` for 'openai' and 'openrouter' providers
    - `patchAnthropic()` for 'anthropic' provider
  - Returns the same client instance with methods wrapped for tracing
  - Throws descriptive error if auto-detection fails
  - Supports `ObserveOptions` for sessionId and metadata passthrough

---

- Implemented `initPulse()` function in `sdk/src/index.ts`
  - Main entry point for SDK initialization
  - Validates and loads configuration via `loadConfig()` from core/config
  - Stores resolved config in SDK state via `setConfig()` from core/state
  - Registers HTTP transport via `setSendTraces()` from core/flush
  - Starts periodic flush interval via `startFlushInterval()` from core/flush
  - Registers graceful shutdown handlers via `registerShutdownHandlers()` from core/shutdown
  - Must be called before using `observe()` to wrap LLM clients

---

- Enhanced Anthropic patcher with streaming support `sdk/src/providers/anthropic.ts`
  - Added streaming response handling for `messages.create` with `stream: true`
  - `createTracedStream(stream, requestBody, startTime, metadata)`: Wraps Anthropic stream with trace capture
    - Uses a Proxy to intercept `Symbol.asyncIterator` without modifying the original Stream object
    - Preserves all original Stream methods (tee, toReadableStream, controller)
    - Accumulates streaming events to build complete trace on stream completion
  - `StreamAccumulator` interface: Collects data from streaming events
    - Tracks id, model, content blocks, usage, stopReason during stream iteration
    - Accumulates text content from `text_delta` events
  - `processStreamEvent(event, accumulator)`: Processes each streaming event type
    - `message_start`: Captures initial message metadata and usage
    - `content_block_start`: Initializes content blocks
    - `content_block_delta`: Accumulates text content from deltas
    - `message_delta`: Captures final stop_reason and updated usage
  - `accumulatorToNormalizedResponse(accumulator)`: Converts accumulated data to NormalizedResponse
    - Maps Anthropic stop reasons to normalized format (end_turn -> stop, max_tokens -> length, etc.)
  - Streaming error handling:
    - Captures errors during stream iteration
    - Builds error trace with latency measured from request start
    - Re-throws original error after recording trace
  - Trace is recorded only once per stream (uses `traceRecorded` flag)

---

- Created Anthropic patcher module `sdk/src/providers/anthropic.ts`
  - `patchAnthropic(client, options?)`: Patches an Anthropic client to capture traces for LLM calls
    - Wraps the `messages.create` method to intercept requests and responses
    - Accepts optional `ObserveOptions` for sessionId and metadata
    - Returns the same client instance with methods wrapped for tracing
  - `wrapMessagesCreate(original, options)`: Internal wrapper function for messages.create
    - Captures request body (including model, messages, max_tokens, system) and starts high-resolution timer
    - Detects streaming mode by checking `stream: true` in request body
    - Non-streaming: Awaits response, normalizes via `normalizeAnthropicResponse()`, builds trace
    - Streaming: Returns traced stream proxy that captures events and builds trace on completion
    - Supports TypeScript function overloads for correct return types
  - Error handling:
    - Wraps original call in try/catch
    - On error: builds error trace via `buildErrorTrace()` with status 'error'
    - Captures error name, message, and stack trace
    - Adds error trace to buffer for failed requests
    - Re-throws original error to caller (tracing is transparent)
  - Respects SDK enabled state: skips tracing when `isEnabled()` returns false

---

- Created OpenAI patcher module `sdk/src/providers/openai.ts`
  - `patchOpenAI(client, provider, options?)`: Patches an OpenAI client to capture traces for LLM calls
    - Works for both OpenAI and OpenRouter clients (both use the OpenAI SDK)
    - Provider param accepts `'openai' | 'openrouter'` to correctly tag traces
    - Accepts optional `ObserveOptions` for sessionId and metadata
    - Returns the same client instance with methods wrapped for tracing
  - `wrapChatCompletionCreate(original, provider, options)`: Internal wrapper function for chat.completions.create
    - Captures request body and starts high-resolution timer before calling original method
    - Normalizes response via `normalizeOpenAIResponse()` from lib/normalize
    - Builds trace via `buildTrace()` from providers/base (includes cost calculation)
    - Adds trace to buffer via `addToBuffer()` from core/state
    - Returns original response unchanged to caller
  - Error handling:
    - Wraps original call in try/catch
    - On error: builds error trace via `buildErrorTrace()` with status 'error'
    - Captures error name, message, and stack trace
    - Adds error trace to buffer for failed requests
    - Re-throws original error to caller (tracing is transparent)
  - Respects SDK enabled state: skips tracing when `isEnabled()` returns false

---

- Created base provider utilities module `sdk/src/providers/base.ts`
  - `TraceMetadata` interface: Metadata context for trace building (sessionId, metadata)
  - `getStartTime()`: Gets high-resolution timestamp using `performance.now()` (or `Date.now()` fallback)
  - `calculateElapsedTime(startTime)`: Calculates elapsed time in milliseconds from a start timestamp
  - `buildTrace(request, response, provider, latencyMs, options?)`: Builds a complete Trace object from request/response data
    - Extracts model_requested from request body
    - Uses provider-supplied cost (OpenRouter) or calculates via `calculateCost()` from lib/pricing
    - Generates UUID for trace_id via `generateUUID()` from lib/uuid
    - Sets timestamp to current ISO datetime
    - Populates all trace fields including tokens, output_text, finish_reason
    - Supports optional sessionId and metadata from TraceMetadata
  - `buildErrorTrace(request, error, provider, latencyMs, options?)`: Builds a Trace object for error responses
    - Sets status to 'error'
    - Captures error name, message, and stack trace
    - Used by provider patchers when LLM calls fail
  - Shared logic used by OpenAI and Anthropic provider patchers

---

- Created UUID utility module `sdk/src/lib/uuid.ts`
  - `generateUUID()`: Generates a random UUID v4 string
  - Uses native `crypto.randomUUID()` for best performance and cryptographic randomness
  - Includes fallback implementation for environments without `crypto.randomUUID()`
  - Fallback uses the standard UUID v4 template with `Math.random()` for compatibility

---

- Created pricing utilities module `sdk/src/lib/pricing.ts`
  - `MODEL_PRICING`: Constant map of model names to pricing structure `{ inputCentsPer1M, outputCentsPer1M }`
  - Included models with pricing (as of January 2025):
    - OpenAI: `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`, `gpt-3.5-turbo`
    - Anthropic: `claude-3-5-sonnet-20241022`, `claude-3-5-sonnet-latest`, `claude-3-5-haiku-20241022`, `claude-3-5-haiku-latest`, `claude-3-opus-20240229`, `claude-3-opus-latest`
  - `MODEL_ALIASES`: Map for flexible model name matching (dated versions, short names, alternate formats)
  - `calculateCost(model, inputTokens, outputTokens)`: Calculates total cost in cents, returns null if model pricing unknown
  - `hasPricing(model)`: Checks if pricing is available for a model
  - Source URLs in comments: OpenAI (https://openai.com/api/pricing/), Anthropic (https://www.anthropic.com/pricing)
  - All prices stored as cents per 1 million tokens for precision

---

- Created response normalizers module `sdk/src/lib/normalize.ts`
  - `normalizeOpenAIResponse(response)`: Extracts and normalizes OpenAI ChatCompletion responses
    - Extracts content from `response.choices[0].message.content`
    - Maps token names: `prompt_tokens`/`completion_tokens` → `inputTokens`/`outputTokens`
    - Extracts `finish_reason` (already normalized: `stop`, `length`, `tool_calls`)
    - Extracts model name from response
    - For OpenRouter: extracts `cost` field and converts dollars to cents
  - `normalizeAnthropicResponse(response)`: Extracts and normalizes Anthropic Message responses
    - Joins text blocks from `response.content[]` array
    - Maps token names: `input_tokens`/`output_tokens` (already matches internal naming)
    - Maps stop reasons: `end_turn` → `stop`, `max_tokens` → `length`, `stop_sequence` → `stop`, `tool_use` → `tool_calls`
    - Extracts model name from response
  - Both functions return `NormalizedResponse` type with unified structure
  - Stop reason mapping constant `ANTHROPIC_STOP_REASON_MAP` for consistent normalization

---

- Created SDK HTTP transport module `sdk/src/transport/http.ts`
  - `sendTraces(apiUrl, apiKey, traces)`: Sends a batch of traces to Pulse server
    - POSTs to `/v1/traces/batch` endpoint
    - Uses native `fetch()` API
    - Headers: `Authorization: Bearer <apiKey>`, `Content-Type: application/json`
    - Handles network errors gracefully: logs errors to console but does not throw
    - Returns void (fire-and-forget pattern)
  - Signature matches what `flush.ts` expects via `setSendTraces()` callback
  - Early return if traces array is empty

---

- Created SDK graceful shutdown handler `sdk/src/core/shutdown.ts`
  - `registerShutdownHandlers()`: Registers process listeners for graceful shutdown
    - Listens for `beforeExit`: Fires when event loop is empty, cleanest way to flush before exit
    - Listens for `SIGINT`: Handles Ctrl+C interrupts
    - Listens for `SIGTERM`: Handles container/process termination signals
  - `shutdown(signal)`: Internal function that flushes remaining traces and stops flush interval
    - Uses `isShuttingDown` flag to prevent duplicate shutdown attempts
    - Calls `flushBuffer()` to send any remaining traces to the server
    - Calls `stopFlushInterval()` to clean up the periodic flush timer
    - Logs progress: signal received, flush complete
  - `resetShutdownState()`: Resets shutdown flags (useful for testing)
  - Idempotent: only registers handlers once via `handlersRegistered` flag
  - Integrates with flush.ts for buffer flushing and state.ts for enabled check

---

- Created SDK flush scheduler module `sdk/src/core/flush.ts`
  - `flushBuffer()`: Sends buffered traces to Pulse server via HTTP transport, clears buffer after send
  - `startFlushInterval()`: Starts periodic flush using `setInterval` with configured interval (default 5000ms)
  - `stopFlushInterval()`: Stops the periodic flush interval
  - `isFlushIntervalRunning()`: Returns whether the flush interval is active
  - `setSendTraces(fn)`: Registers the HTTP transport function (avoids circular dependency with transport module)
  - Integrates with state module: uses `getBuffer()`, `clearBuffer()`, `getConfig()`, `setOnBufferFull()`
  - Fire-and-forget error handling: logs errors but doesn't throw to avoid breaking user's app
  - Clears buffer before sending to prevent duplicate traces on retry

---

- Created SDK state management module `sdk/src/core/state.ts`
  - Module-level state variables: `config`, `traceBuffer`, `flushTimer`
  - `setConfig(resolvedConfig)`: Sets the SDK configuration (called by initPulse)
  - `getConfig()`: Returns current config or throws if SDK not initialized
  - `isEnabled()`: Returns whether SDK is enabled (false if not initialized)
  - `addToBuffer(trace)`: Adds trace to buffer, triggers flush callback if buffer full
  - `getBuffer()`: Returns copy of current trace buffer
  - `clearBuffer()`: Clears trace buffer after successful flush
  - `getBufferSize()`: Returns number of traces in buffer
  - `setFlushTimer(timer)`: Stores the periodic flush interval reference
  - `getFlushTimer()`: Returns the flush timer reference
  - `clearFlushTimer()`: Clears and nulls the flush interval
  - `setOnBufferFull(callback)`: Registers callback for buffer-full events (avoids circular deps)
  - `resetState()`: Resets all state (useful for testing/re-initialization)

---

- Created SDK config module `sdk/src/core/config.ts`
  - `ResolvedConfig` interface: Internal config type with all defaults applied
  - `loadConfig(config)`: Validates and merges user config with defaults
    - Validates `apiKey` is present and starts with `pulse_sk_`
    - Validates `batchSize` is between 1 and 100
    - Validates `flushInterval` is at least 1000ms
    - Default values: `apiUrl: 'http://localhost:3000'`, `batchSize: 10`, `flushInterval: 5000`, `enabled: true`
  - Returns fully resolved configuration object
  - Throws descriptive errors for invalid configuration

---

- Installed LLM client dependencies in `sdk/package.json`
  - Added `openai@^6.16.0` for OpenAI and OpenRouter client instrumentation
  - Added `@anthropic-ai/sdk@^0.71.2` for Anthropic client instrumentation
  - Note: `@types/node` was already present as a dev dependency

---

- Created SDK package `sdk/package.json`
  - Package name: `@pulse/sdk`
  - Type: ES module
  - Main entry: `src/index.ts`
  - Exports `initPulse` and `observe` functions (placeholder implementations)
  - Build script using Bun for Node target
  - TypeScript type checking script

- Created SDK directory structure under `sdk/src/`
  - `src/index.ts`: Main entry point with `initPulse()` and `observe()` function stubs
  - `src/types.ts`: Public TypeScript interfaces and types
  - `src/core/`: Directory for lifecycle, state, config, flush modules
  - `src/transport/`: Directory for HTTP client module
  - `src/providers/`: Directory for OpenAI, Anthropic patchers
  - `src/lib/`: Directory for utilities (normalize, pricing, uuid)

- Created SDK types `sdk/src/types.ts`
  - `PulseConfig`: SDK configuration interface (apiKey, apiUrl, batchSize, flushInterval, enabled)
  - `Provider`: Union type for supported LLM providers ('openai' | 'anthropic' | 'openrouter')
  - `TraceStatus`: Union type for trace status ('success' | 'error')
  - `Trace`: Full trace data interface matching server validation schema
  - `NormalizedResponse`: Interface for normalized LLM response data
  - `ObserveOptions`: Options for the observe() function (sessionId, metadata)

---

- Created graceful shutdown handler `trace-service/shutdown.ts`
  - `registerShutdownHandlers()`: Registers listeners for SIGTERM and SIGINT signals
  - `setServer(server)`: Registers the Bun HTTP server for graceful shutdown
  - `setDbCleanup(cleanup)`: Registers the database cleanup function
  - `shutdown(signal)`: Internal function that stops HTTP server, closes DB connection, and exits cleanly
  - Uses `isShuttingDown` flag to prevent duplicate shutdown attempts
  - Logs ISO timestamps for shutdown progress: signal received, server stopped, DB closed, complete

- Added `closeDb()` function to `trace-service/db/index.ts`
  - Calls `client.end()` to gracefully close the postgres connection pool

- Integrated shutdown handlers in `trace-service/index.ts`
  - Captures Bun server instance from `Bun.serve()` return value
  - Calls `setServer()`, `setDbCleanup()`, and `registerShutdownHandlers()` on startup
  - Server now handles SIGTERM/SIGINT for clean container/process termination

---

- Created global error handler `trace-service/middleware/errors.ts`
  - `errorHandler(err, c)`: Hono error handler for unhandled exceptions
  - Logs ISO timestamp, error message, and full stack trace to console
  - Returns 500 status with `{ error: "Internal server error" }` response
  - Registered in `trace-service/index.ts` via `app.onError(errorHandler)`
  - Catches all unhandled errors across route handlers and middleware

---

- Created request logging middleware `trace-service/middleware/logger.ts`
  - `logger(c, next)`: Hono middleware for request logging
  - Logs: ISO timestamp, HTTP method, path, response status, duration in ms
  - Format: `2026-01-25T12:00:00.000Z GET /health 200 5ms`
  - Applied globally to all routes via `app.use("*", logger)`

- Registered logger middleware in `trace-service/index.ts`
  - Added `app.use("*", logger)` before route definitions
  - All requests are now logged with timing information

---

- Created GET /v1/analytics route `trace-service/routes/analytics.ts`
  - `handleGetAnalytics(c)`: Hono handler for fetching project analytics
  - Protected route using `authMiddleware` for API key validation
  - Parses and validates query params with Zod `analyticsQuerySchema`
  - Required params: `date_from`, `date_to` (ISO datetime strings)
  - Optional param: `group_by` (`day`, `hour`, `model`, `provider`)
  - Returns analytics object: `{ totalCost, totalTokens, avgLatency, errorRate, costOverTime }`
  - Returns 400 with validation errors if query params are invalid

- Registered analytics route in `trace-service/index.ts`
  - Added `GET /v1/analytics` route with auth middleware
  - Imported `handleGetAnalytics` from routes/analytics

---

- Created analytics service `trace-service/services/analytics.ts`
  - `getAnalytics(projectId, dateRange, db, groupBy?)`: Main analytics function that aggregates data for a project within a date range
  - Returns `{ totalCost, totalTokens, avgLatency, errorRate, costOverTime }`
  - `totalCost`: Sum of cost_cents for all traces in range
  - `totalTokens`: Object with `input`, `output`, and `total` token counts
  - `avgLatency`: Average latency in milliseconds
  - `errorRate`: Percentage of traces with error status
  - `costOverTime`: Array of `{ period, costCents }` data points grouped by the specified interval
  - Executes all aggregation queries in parallel using `Promise.all` for performance
  - Exported interfaces: `AnalyticsDateRange`, `AnalyticsResult`

- Created aggregation query functions `trace-service/db/analytics.ts`
  - `getTotalCost(db, projectId, dateRange)`: Sum of cost_cents for traces in date range
  - `getTotalTokens(db, projectId, dateRange)`: Sum of input/output tokens, returns `{ inputTokens, outputTokens, totalTokens }`
  - `getAvgLatency(db, projectId, dateRange)`: Average latency_ms for traces in date range
  - `getErrorRate(db, projectId, dateRange)`: Percentage of traces with status='error'
  - `getCostOverTime(db, projectId, dateRange, groupBy?)`: Cost aggregated by time period
    - Supports grouping by: `day` (default), `hour`, `model`, `provider`
    - Uses SQL `date_trunc()` for time-based grouping
    - Returns array of `{ period, costCents }` ordered by period
  - Exported interfaces: `DateRange`, `CostDataPoint`
  - Helper function `buildDateConditions()` for common date range filtering

---

- Created analytics query param schema `shared/validation.ts`
  - `groupBySchema`: Zod enum for aggregation grouping (`day`, `hour`, `model`, `provider`)
  - `analyticsQuerySchema`: Zod schema for GET /v1/analytics query parameters
    - `date_from` (required): ISO datetime string for date range start
    - `date_to` (required): ISO datetime string for date range end
    - `group_by` (optional): Aggregation grouping option
  - Exported TypeScript types: `GroupBy`, `AnalyticsQueryParams`

---

- Created sessions service `trace-service/services/sessions.ts`
  - `getSessionTraces(sessionId, projectId, storage)`: Returns all traces for a session ordered by timestamp ascending
  - Returns `{ sessionId, traces }` result object
  - `SessionTracesResult` interface for type-safe return values

- Created GET /v1/sessions/:id route `trace-service/routes/sessions.ts`
  - `handleGetSessionTraces(c)`: Hono handler for fetching session traces
  - Protected route using `authMiddleware` for API key validation
  - Gets session_id from URL param via `c.req.param('id')`
  - Returns `{ sessionId, traces }` on success

- Registered sessions route in `trace-service/index.ts`
  - Added `GET /v1/sessions/:id` route with auth middleware
  - Imported `handleGetSessionTraces` from routes/sessions

---

- Created GET /v1/traces route `trace-service/routes/traces.ts`
  - `getTraces(c)`: Hono handler for querying traces with filters and pagination
  - Protected route using `authMiddleware` for API key validation
  - Parses and validates query params with Zod `traceQuerySchema`
  - Supports filters: `session_id`, `provider`, `model`, `status`, `date_from`, `date_to`
  - Supports pagination: `limit` (default 100, max 1000), `offset` (default 0)
  - Returns `{ traces, total, limit, offset }` on success
  - Returns 400 with validation errors if query params are invalid

- Created GET /v1/traces/:id route `trace-service/routes/traces.ts`
  - `getTraceById(c)`: Hono handler for fetching a single trace by ID
  - Protected route using `authMiddleware`
  - Gets trace_id from URL param via `c.req.param('id')`
  - Returns trace object on success
  - Returns 404 if trace not found

- Added trace query params validation schema `shared/validation.ts`
  - `traceQuerySchema`: Zod schema for GET /v1/traces query parameters
  - Fields: `session_id` (UUID), `provider`, `model`, `status`, `date_from`/`date_to` (ISO datetime)
  - Pagination: `limit` (1-1000, default 100), `offset` (min 0, default 0)
  - Exported `TraceQueryParams` TypeScript type

- Registered trace query routes in `trace-service/index.ts`
  - Added `GET /v1/traces` route with auth middleware
  - Added `GET /v1/traces/:id` route with auth middleware

---

- Created POST /v1/traces/batch route `trace-service/routes/traces.ts`
  - `handleBatchTraces(c)`: Hono handler for batch trace ingestion
  - Protected route using `authMiddleware` for API key validation
  - Parses JSON body and validates with Zod via `ingestTraces` service
  - Gets `projectId` from context (set by auth middleware)
  - Returns 202 Accepted with `{ count, traces }` on success
  - Returns 400 with validation errors if Zod parsing fails
  - Returns 400 if JSON body is invalid

- Registered ingestion route in `trace-service/index.ts`
  - Added `POST /v1/traces/batch` route with auth middleware
  - Imported `authMiddleware` from middleware/auth
  - Imported `handleBatchTraces` from routes/traces

---

- Created traces service `trace-service/services/traces.ts`
  - `ingestTraces(projectId, rawTraces, storage)`: Ingests a batch of traces for a project
    - Validates incoming traces using `batchTraceSchema` from shared validation
    - Upserts sessions for any `session_id` referenced in traces
    - Transforms snake_case input fields to camelCase for database storage
    - Returns `{ count, traces }` with inserted trace objects
  - `getTrace(traceId, projectId, storage)`: Single trace lookup by ID, scoped to project
    - Returns trace or null if not found
  - `queryTraces(projectId, filters, storage)`: Query traces with filters and pagination
    - Supports filters: sessionId, provider, model, status, dateFrom, dateTo
    - Returns `{ traces, total, limit, offset }`
  - Helper function `toNewTrace(input, projectId)`: Transforms incoming TraceInput to NewTrace format
  - Exported interfaces: `IngestResult`, `QueryResult`

---

## 2026-01-25 (earlier)

### Added

- Installed uuid dependency for API key and trace ID generation
  - Added `uuid@13.0.0` to `trace-service/package.json` dependencies
  - Added `@types/uuid@11.0.0` as dev dependency for TypeScript support

- Created auth query helper `trace-service/auth/queries.ts`
  - `hashApiKey(key)`: Hashes API key using SHA-256 for deterministic storage and lookup
  - `getProjectIdByKeyHash(keyHash, db)`: Looks up project ID by API key hash, returns project ID or null

- Created auth middleware `trace-service/middleware/auth.ts`
  - `authMiddleware(c, next)`: Hono middleware for protected routes
  - Extracts Bearer token from Authorization header
  - Hashes token and validates against database
  - Sets `projectId` in context on success
  - Returns 401 on missing/invalid token
- Created `trace-service/config.ts` with centralized configuration management
  - `loadConfig()` function reads and validates environment variables
  - Supports `DATABASE_URL` (required), `PORT` (default: 3000), `ADMIN_KEY` (optional)
  - Exports typed `Config` interface

- Installed Drizzle ORM dependencies for database management
  - Added `drizzle-orm` and `postgres` as runtime dependencies
  - Added `drizzle-kit` as dev dependency for migrations
  - Created `drizzle.config.ts` with PostgreSQL configuration
  - Added npm scripts: `db:generate`, `db:migrate`, `db:push`, `db:studio`

- Created Drizzle schema file `trace-service/db/schema.ts`
  - `projects` table: `id` (UUID), `name`, `created_at`
  - `api_keys` table: `id`, `project_id` (FK), `key_hash`, `created_at`
  - `sessions` table: `id`, `project_id` (FK), `created_at`, `metadata` (JSONB)
  - `traces` table: `trace_id`, `project_id`, `session_id`, `timestamp`, `latency_ms`, `provider`, `model_requested`, `model_used`, `provider_request_id`, `request_body`, `response_body`, `input_tokens`, `output_tokens`, `output_text`, `finish_reason`, `status`, `error`, `cost_cents`, `metadata`
  - Added indexes: `traces_project_id_idx`, `traces_timestamp_idx`, `traces_project_session_idx`
  - Exported TypeScript types for all tables (`Project`, `NewProject`, `Trace`, `NewTrace`, etc.)

- Created database connection `trace-service/db/index.ts`
  - Initializes postgres client using `DATABASE_URL` environment variable
  - Exports `db` instance using `drizzle(postgres(...), { schema })`
  - Exports `Database` type for use in other modules

- Generated initial Drizzle migration
  - Run: `bun run db:generate` in `trace-service/`
  - Migration file: `trace-service/drizzle/0000_orange_shocker.sql`
  - Creates tables: `projects`, `api_keys`, `sessions`, `traces`
  - Includes indexes: `traces_project_id_idx`, `traces_timestamp_idx`, `traces_project_session_idx`
  - Run `bun run db:migrate` with `DATABASE_URL` env var to apply migration

- Created storage adapter interface `trace-service/db/adapter.ts`
  - `StorageAdapter` interface with methods: `insertTrace`, `getTrace`, `queryTraces`, `countTraces`, `upsertSession`, `getSessionTraces`
  - `TraceQueryFilters` interface for filtering trace queries (sessionId, provider, model, status, date range, pagination)
  - `TraceQueryResult` interface for paginated results
  - Documented for contributors who want to implement custom storage backends

- Created PostgreSQL storage adapter `trace-service/db/postgres.ts`
  - `PostgresStorage` class implementing `StorageAdapter` interface
  - Takes Drizzle `db` instance in constructor
  - `insertTrace()`: Inserts a new trace with project scoping
  - `getTrace()`: Retrieves a single trace by ID, scoped to project
  - `queryTraces()`: Queries traces with filters (sessionId, provider, model, status, date range) and pagination, returns results with total count
  - `countTraces()`: Counts traces matching filters
  - `upsertSession()`: Inserts or updates session with conflict handling on ID
  - `getSessionTraces()`: Gets all traces for a session ordered by timestamp ascending
  - Default production storage backend for Pulse

- Installed Hono web framework
  - Added `hono@4.11.5` to `trace-service/package.json` dependencies
  - Hono works natively with Bun runtime for HTTP server functionality

- Created Hono app entry point `trace-service/index.ts`
  - Imports and uses `loadConfig()` for configuration
  - Creates Hono app instance
  - Serves with `Bun.serve()` on configured port (default: 3000)
  - Added `/health` endpoint returning `{ status: "ok", service: "pulse" }`
  - Exports `app` for testing and extension

- Created admin auth middleware `trace-service/middleware/admin.ts`
  - `adminAuthMiddleware(c, next)`: Hono middleware for admin-protected routes
  - Validates `ADMIN_KEY` environment variable is configured (returns 503 if not set)
  - Checks `X-Admin-Key` header or `admin_key` query parameter
  - Returns 401 if key is missing or invalid
  - Calls next() on successful authentication

- Created admin service `trace-service/services/admin.ts`
  - `generateApiKey()`: Generates API key with `pulse_sk_` prefix using UUID v4
  - `createProject(name, db)`: Creates a new project with an API key
    - Generates API key, hashes it using SHA-256 (via `hashApiKey` from auth/queries)
    - Inserts project into database, then inserts API key hash
    - Returns `{ projectId, apiKey, name }` - plaintext API key only returned once
  - `CreateProjectResult` interface for type-safe return values

- Created admin routes `trace-service/routes/admin.ts`
  - `handleCreateProject(c)`: Hono handler for POST /admin/projects
  - Parses request body for `name` field
  - Validates name is present and non-empty
  - Calls `createProject()` service with database instance
  - Returns 201 with `{ projectId, apiKey, name }` on success
  - Returns 400 if name is missing or empty

- Registered admin route in `trace-service/index.ts`
  - Added `POST /admin/projects` route protected by `adminAuthMiddleware`
  - Route creates new projects with API keys for SDK authentication

- Installed Zod validation library
  - Added `zod@^4.3.6` to `trace-service/package.json` dependencies
  - Used for request/response validation in the server

- Created trace validation schema `shared/validation.ts`
  - `providerSchema`: Enum for supported LLM providers (`openai`, `anthropic`, `openrouter`)
  - `statusSchema`: Enum for trace status (`success`, `error`)
  - `traceSchema`: Full Zod schema for trace validation
    - Required fields: `trace_id` (UUID), `timestamp` (ISO datetime), `provider`, `model_requested`, `request_body`, `status`, `latency_ms`
    - Optional fields: `model_used`, `provider_request_id`, `response_body`, `input_tokens`, `output_tokens`, `output_text`, `finish_reason`, `error`, `cost_cents`, `session_id`, `metadata`
  - `batchTraceSchema`: Array of traces with max 100 items limit
  - Exported TypeScript types: `Provider`, `TraceStatus`, `TraceInput`, `BatchTraceInput`
  - Created `shared/package.json` with `@pulse/shared` package name and zod dependency

