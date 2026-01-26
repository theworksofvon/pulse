# Pulse Development Tasks

## Code Style

**Layering:**
- **Routers** - Thin, HTTP only (parse request, call service, return response)
- **Services** - Business logic (coordinate adapters, validation, orchestration)
- **Adapters** - Data access (DB queries, external APIs)

**Prefer functions, use classes where appropriate:**
- Functions for simple operations, route handlers, utilities
- Classes for grouped logic with shared state (e.g., `DbClient`)
- Focus on what makes the code most readable

## Project Structure

```
pulse/
├── server/                    # Pulse Server (Hono + DB)
│   ├── db/
│   │   ├── adapter.ts         # StorageAdapter interface (exported for contributors)
│   │   ├── postgres.ts        # Postgres implementation (default)
│   │   ├── schema.ts          # Drizzle schema
│   │   └── analytics.ts       # Aggregation queries
│   ├── services/              # Business logic layer
│   │   ├── admin.ts           # Project creation, API key generation
│   │   ├── traces.ts          # Trace ingestion, querying
│   │   ├── sessions.ts        # Session queries
│   │   └── analytics.ts       # Analytics aggregation
│   ├── routes/                # Hono route handlers (thin, HTTP only)
│   ├── middleware/            # Auth, logger, error handlers
│   └── auth/                  # API key helpers
│
├── sdk/                       # LLM client instrumentation
│   └── src/
│       ├── core/              # Lifecycle, state, config, flush
│       ├── transport/         # HTTP client to Pulse server
│       ├── providers/         # OpenAI, Anthropic, OpenRouter patchers
│       ├── lib/               # Utilities (normalize, pricing, uuid)
│       ├── types.ts           # Public types
│       └── index.ts           # Public API
│
└── shared/                    # Shared types, validation schemas
```

---

## Phase 1: Database & Storage

### Config Management

- [x] **Create centralized config**
  - File: `server/config.ts`
  - Function: `loadConfig()` - reads env vars
  - Env vars: `DATABASE_URL`, `PORT` (default: 3000), `ADMIN_KEY` (optional)
  - Export typed config object

### Drizzle ORM Setup

- [x] **Install Drizzle dependencies**
  - File: `server/package.json`
  - Run: `bun add drizzle-orm postgres`
  - Run: `bun add -D drizzle-kit`
  - Add drizzle-kit config to package.json for migrations

- [x] **Create Drizzle schema file**
  - File: `server/db/schema.ts`
  - Define `projects` table: `id`, `name`, `created_at`
  - Define `api_keys` table: `id`, `project_id`, `key_hash`, `created_at`
  - Define `traces` table: `trace_id`, `project_id`, `session_id`, `timestamp`, `latency_ms`, `provider`, `model_requested`, `model_used`, `provider_request_id`, `request_body`, `response_body`, `input_tokens`, `output_tokens`, `output_text`, `finish_reason`, `status`, `error`, `cost_cents`, `metadata`
  - Define `sessions` table: `id`, `project_id`, `created_at`, `metadata`
  - Use `pgTable` from Drizzle

- [x] **Create database connection**
  - File: `server/db/index.ts`
  - Export `db` instance using `drizzle(postgres({ url }))`
  - Use env var: `DATABASE_URL`

- [x] **Generate and run initial migration**
  - Run: `bunx drizzle-kit generate`
  - Run: `bunx drizzle-kit migrate`
  - Add indexes: `project_id`, `timestamp`, `(project_id, session_id)`

### Storage Adapter Pattern

> **Intent:** Internal flexibility (Postgres, SQLite, etc.) + documented for contributors who want to add adapters. Most users self-host with Postgres; advanced users can fork and implement custom storage.

- [x] **Create storage adapter interface**
  - File: `server/db/adapter.ts`
  - Interface: `StorageAdapter` with methods: `insertTrace`, `getTrace`, `queryTraces`, `countTraces`, `upsertSession`, `getSessionTraces`
  - Export this interface - documented for contributors/advanced users who want to implement custom storage

- [x] **Create Postgres adapter**
  - File: `server/db/postgres.ts`
  - Class: `PostgresStorage` implements `StorageAdapter`
  - Takes Drizzle `db` instance in constructor
  - Implements all interface methods using Drizzle queries
  - This is the default implementation for production use

---

## Phase 2: Pulse Server

### Server Setup

- [x] **Install Hono**
  - Run: `bun add hono`
  - Hono works natively with Bun runtime

- [x] **Create Hono app entry point**
  - File: `server/index.ts`
  - Create Hono app: `const app = new Hono()`
  - Serve with Bun: `Bun.serve({ fetch: app.fetch, port })`
  - Port from env: `PORT` (default: 3000)

- [x] **Create auth middleware**
  - File: `server/middleware/auth.ts`
  - Hono middleware: `async function authMiddleware(c, next)`
  - Extract Bearer token from `c.req.header('Authorization')`
  - Hash and validate against DB
  - Set `c.set('projectId', projectId)` on success
  - Return 401 on failure

- [x] **Add GET /health endpoint**
  - File: `server/index.ts` (or `server/routes/health.ts`)
  - Return `{ status: "ok", service: "pulse" }`
  - No auth required

### Authentication

- [x] **Create auth query helper**
  - File: `server/auth/queries.ts`
  - Function: `getProjectIdByKey(keyHash, storage)` - joins api_keys → projects
  - Returns project_id or null

- [x] **Create auth middleware**
  - File: `server/middleware/auth.ts`
  - Hono middleware: `async function authMiddleware(c, next)`
  - Extract Bearer token from `c.req.header('Authorization')`
  - Hash token, call `getProjectIdByKey()`
  - Set `c.set('projectId', projectId)` on success
  - Return 401 on failure

- [x] **Install crypto dependency**
  - Run: `bun add uuid`
  - Used for API key and trace ID generation

### Admin API

- [x] **Create admin auth middleware**
  - File: `server/middleware/admin.ts`
  - Hono middleware: validates `ADMIN_KEY` env var if set
  - Check header `X-Admin-Key` or use query param
  - Return 401 if missing/invalid

- [x] **Create admin service**
  - File: `server/services/admin.ts`
  - Function: `createProject(name, storage)` - creates project, generates API key, hashes and stores key
  - Function: `generateApiKey()` - returns `pulse_sk_<uuid>`
  - Function: `hashApiKey(key)` - uses `Bun.password.hash()` for storage
  - Function: `verifyApiKey(key, hash)` - uses `Bun.password.verify()` for validation
  - Returns `{ projectId, apiKey, name }`

- [x] **Create POST /admin/projects route**
  - File: `server/routes/admin.ts`
  - Hono handler: `async function createProject(c)`
  - Protected by admin auth middleware
  - Parse body: `{ name: string }`
  - Call `adminService.createProject()` with storage
  - Return result with `c.json()`

- [x] **Register admin route**
  - Update: `server/index.ts`
  - `app.post('/admin/projects', adminAuthMiddleware, createProject)`

### Validation

- [x] **Install Zod**
  - Run: `bun add zod`

- [x] **Create trace validation schema**
  - File: `shared/validation.ts`
  - Zod schema `traceSchema`: `trace_id` (UUID), `timestamp` (ISO datetime), `provider` (enum: openai|anthropic), `model_requested` (string), `request_body` (object), `response_body` (optional object), `error` (optional object), `status` (enum: success|error), `latency_ms` (number), `input_tokens` (optional number), `output_tokens` (optional number), `output_text` (optional string), `finish_reason` (optional string), `cost_cents` (optional number), `session_id` (optional string), `metadata` (optional object)
  - Export `traceSchema` and `batchTraceSchema` (array, max 100 items)

### Trace Ingestion

- [x] **Create traces service**
  - File: `server/services/traces.ts`
  - Function: `ingestTraces(projectId, traces, storage)` - validates, inserts traces, upserts sessions
  - Function: `getTrace(traceId, projectId, storage)` - single trace lookup
  - Function: `queryTraces(projectId, filters, storage)` - filtered trace list with pagination
  - Returns `{ count, traces }` or trace object

- [x] **Create POST /v1/traces/batch route**
  - File: `server/routes/traces.ts`
  - Hono handler: `async function handleBatchTraces(c)`
  - Protected route - uses auth middleware
  - Parse JSON body with `c.req.json()`
  - Validate with Zod
  - Get project_id from `c.get('projectId')`
  - Call `tracesService.ingestTraces()`
  - Return 202 with `{ count, traces }`

- [x] **Register ingestion route**
  - Update: `server/index.ts`
  - `app.post('/v1/traces/batch', authMiddleware, handleBatchTraces)`

### Query API - Traces

- [x] **Create GET /v1/traces route**
  - File: `server/routes/traces.ts`
  - Hono handler: `async function getTraces(c)`
  - Protected route - uses auth middleware
  - Parse query params with `c.req.query()`
  - Validate with Zod
  - Call `tracesService.queryTraces(projectId, filters, storage)`
  - Return `{ traces, total, limit, offset }`

- [x] **Create GET /v1/traces/:id route**
  - File: `server/routes/traces.ts`
  - Hono handler: `async function getTraceById(c)`
  - Protected route
  - Get trace_id from `c.req.param('id')`
  - Call `tracesService.getTrace(traceId, projectId, storage)`
  - Return trace or 404

- [x] **Register trace query routes**
  - Update: `server/index.ts`
  - `app.get('/v1/traces', authMiddleware, getTraces)`
  - `app.get('/v1/traces/:id', authMiddleware, getTraceById)`

### Query API - Sessions

- [x] **Create sessions service**
  - File: `server/services/sessions.ts`
  - Function: `getSessionTraces(sessionId, projectId, storage)` - returns traces ordered by timestamp asc
  - Returns `{ sessionId, traces }`

- [x] **Create GET /v1/sessions/:id route**
  - File: `server/routes/sessions.ts`
  - Hono handler: `async function getSessionTraces(c)`
  - Protected route
  - Get session_id from `c.req.param('id')`
  - Call `sessionsService.getSessionTraces()`
  - Return `{ sessionId, traces }`

- [x] **Register sessions route**
  - Update: `server/index.ts`
  - `app.get('/v1/sessions/:id', authMiddleware, getSessionTraces)`

### Query API - Analytics

- [x] **Create analytics query param schema**
  - File: `shared/validation.ts`
  - Zod schema: `date_from`, `date_to` (required), `group_by` (optional: day|hour|model|provider)

- [x] **Create analytics service**
  - File: `server/services/analytics.ts`
  - Function: `getAnalytics(projectId, dateRange, storage)` - calls aggregation functions
  - Returns `{ totalCost, totalTokens, avgLatency, errorRate, costOverTime }`

- [x] **Create aggregation query functions**
  - File: `server/db/analytics.ts`
  - Function: `getTotalCost(projectId, dateRange)` - sum cost_cents
  - Function: `getTotalTokens(projectId, dateRange)` - sum input + output tokens
  - Function: `getAvgLatency(projectId, dateRange)` - avg latency_ms
  - Function: `getErrorRate(projectId, dateRange)` - percentage of error status
  - Function: `getCostOverTime(projectId, dateRange, groupBy)` - grouped sums with date trunc

- [x] **Create GET /v1/analytics route**
  - File: `server/routes/analytics.ts`
  - Hono handler: `async function getAnalytics(c)`
  - Protected route
  - Validate params from `c.req.query()`
  - Call `analyticsService.getAnalytics()`
  - Return analytics object

- [x] **Register analytics route**
  - Update: `server/index.ts`
  - `app.get('/v1/analytics', authMiddleware, getAnalytics)`

### Error Handling & Logging

- [x] **Add request logging middleware**
  - File: `server/middleware/logger.ts`
  - Hono middleware: `async function logger(c, next)`
  - Log: method, path, status, duration_ms
  - Use console.log with ISO timestamps

- [x] **Add global error handler**
  - File: `server/middleware/errors.ts`
  - Hono error handler: `app.onError((err, c) => ...)`
  - Catch all unhandled errors
  - Return 500 with `{ error: string }`
  - Log full error stack for debugging

### Graceful Shutdown

- [x] **Add graceful shutdown handler**
  - File: `server/shutdown.ts`
  - Listen for SIGTERM, SIGINT
  - Close DB connection
  - Log shutdown completion
  - Exit process cleanly

---

## Phase 3: SDK

### SDK Structure

```
sdk/src/
├── core/              # Core SDK functionality (lifecycle, state, config)
├── transport/         # Network layer (HTTP to Pulse server)
├── providers/         # LLM client instrumentation
├── lib/               # Pure utilities (normalize, pricing, uuid)
├── types.ts           # Public types
└── index.ts           # Public API (init, observe)
```

### SDK Setup

- [x] **Create SDK package**
  - File: `sdk/package.json`
  - Name: `@pulse/sdk`
  - Type: module
  - Exports: `initPulse`, `observe` functions
  - Main entry: `src/index.ts`

- [x] **Install LLM client dependencies**
  - Run: `bun add openai`
  - Run: `bun add @anthropic-ai/sdk`
  - Run: `bun add -D @types/node`

- [x] **Create SDK types**
  - File: `sdk/src/types.ts`
  - Interface: `PulseConfig` - `apiKey`, `apiUrl?`, `batchSize?`, `flushInterval?`, `enabled?`
  - Interface: `Trace` - matches trace validation schema from shared
  - Type: `Provider` - `'openai' | 'anthropic' | 'openrouter'`
  - Type: `TraceStatus` - `'success' | 'error'`
  - Interface: `NormalizedResponse` - `{ content, inputTokens, outputTokens, finishReason, model, costCents? }`

### Core Layer

- [x] **Create config module**
  - File: `sdk/src/core/config.ts`
  - Function: `loadConfig(config)` - validates and merges with defaults
  - Default values: `apiUrl`, `batchSize: 10`, `flushInterval: 5000`, `enabled: true`
  - Returns validated config object

- [x] **Create state management**
  - File: `sdk/src/core/state.ts`
  - Module-level state: `config`, `traceBuffer`, `flushTimer`
  - Function: `getConfig()` - get config or throw if not initialized
  - Function: `addToBuffer(trace)` - add trace, trigger flush if buffer full
  - Function: `clearBuffer()` - clear buffer after flush
  - Function: `isEnabled()` - check if SDK is enabled

- [x] **Create flush scheduler**
  - File: `sdk/src/core/flush.ts`
  - Function: `startFlushInterval()` - setInterval for periodic flush
  - Function: `stopFlushInterval()` - clear interval
  - Function: `flushBuffer()` - sends traces via transport, clears buffer
  - Default interval: 5000ms (from config)

- [x] **Create graceful shutdown handler**
  - File: `sdk/src/core/shutdown.ts`
  - Function: `registerShutdownHandlers()`
  - Listen for `process.on('beforeexit')`, `SIGINT`, `SIGTERM`
  - Flush remaining buffer before exit
  - Stop flush interval

### Transport Layer

- [x] **Create HTTP client**
  - File: `sdk/src/transport/http.ts`
  - Function: `sendTraces(config, traces)` - POST to `/v1/traces/batch`
  - Uses native `fetch()`
  - Headers: `Authorization: Bearer <apiKey>`, `Content-Type: application/json`
  - Handles network errors gracefully (log, don't throw)
  - Returns void

### Lib Layer (Pure Utilities)

- [x] **Create response normalizers**
  - File: `sdk/src/lib/normalize.ts`
  - Function: `normalizeOpenAIResponse(response)` - extracts content, tokens, finish_reason, model, cost
  - Function: `normalizeAnthropicResponse(response)` - extracts content, tokens, stop_reason, model
  - Returns `NormalizedResponse` type
  - OpenAI/OpenRouter: `response.choices[0].message.content`
  - Anthropic: join `response.content[]` text blocks
  - Map stop reasons: `end_turn` → `stop`, `max_tokens` → `length`
  - Map token names: `prompt/completion` → `input/output`
  - OpenRouter: extract `cost` field if present

- [x] **Create pricing utilities**
  - File: `sdk/src/lib/pricing.ts`
  - Const map: model name → `{ inputCentsPer1M, outputCentsPer1M }`
  - Include: `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`, `gpt-3.5-turbo`, `claude-3-5-sonnet`, `claude-3-5-haiku`, `claude-3-opus`
  - Source URLs in comments
  - Function: `calculateCost(model, inputTokens, outputTokens)` - returns cost_cents or null

- [x] **Create UUID utility**
  - File: `sdk/src/lib/uuid.ts`
  - Function: `generateUUID()` - returns random UUID v4
  - Uses `crypto.randomUUID()` (built-in) or fallback

### Providers Layer

- [x] **Create base provider utilities**
  - File: `sdk/src/providers/base.ts`
  - Function: `buildTrace(request, response, provider, metadata)` - builds trace object
  - Function: `calculateElapsedTime(startTime)` - returns latency_ms
  - Shared trace building logic used by all providers

- [x] **Create OpenAI patcher**
  - File: `sdk/src/providers/openai.ts`
  - Function: `patchOpenAI(client, provider, config)` - wraps client methods
  - Provider param: `'openai' | 'openrouter'` (both use OpenAI client)
  - Wrap methods: `chat.completions.create`, `embeddings.create`
  - Returns proxy or patched object

- [x] **Implement chat.completions interception**
  - File: `sdk/src/providers/openai.ts`
  - Function: `wrapChatCompletion(original, provider)` - wrapper function
  - Capture request params, start timer
  - Await response, call `normalizeOpenAIResponse()`
  - Call `buildTrace()` with normalized data
  - Get cost from response (OpenRouter) or call `calculateCost()`
  - Add trace to buffer via `addToBuffer()`
  - Return original result unchanged

- [x] **Handle OpenAI errors**
  - File: `sdk/src/providers/openai.ts`
  - Wrap in try/catch
  - On error: build trace with `status: 'error'`, capture error message
  - Still add trace to buffer
  - Re-throw error to caller

- [x] **Create Anthropic patcher**
  - File: `sdk/src/providers/anthropic.ts`
  - Function: `patchAnthropic(client, config)` - wraps client
  - Wrap method: `messages.create`
  - Returns proxy or patched object

- [x] **Implement messages.create interception**
  - File: `sdk/src/providers/anthropic.ts`
  - Function: `wrapMessagesCreate(original)` - wrapper function
  - Capture request params (model, messages, system, max_tokens), start timer
  - Note: Anthropic has `system` as separate field (not in messages array)
  - Await response, call `normalizeAnthropicResponse()`
  - Call `buildTrace()` with normalized data
  - Handle streaming responses (capture final message only, accumulate events)
  - Add trace to buffer via `addToBuffer()`

- [x] **Handle Anthropic errors**
  - File: `sdk/src/providers/anthropic.ts`
  - Wrap in try/catch
  - On error: build trace with `status: 'error'`, capture error message
  - Still add trace to buffer
  - Re-throw error

### Public API

- [x] **Implement initPulse function**
  - File: `sdk/src/index.ts`
  - Function: `initPulse(config)` - main entry point
  - Calls `loadConfig()`, stores in state
  - Calls `startFlushInterval()`
  - Calls `registerShutdownHandlers()`
  - Returns void

- [x] **Implement observe function**
  - File: `sdk/src/index.ts`
  - Function: `observe(client, provider, options)` - main export
  - Provider: `'openai' | 'anthropic' | 'openrouter' | 'auto'` (detect from client constructor or baseURL)
  - Auto-detect: OpenAI client + baseURL includes 'openrouter' → 'openrouter'
  - Calls appropriate patcher function
  - Returns same client instance with methods wrapped
  - Re-export types

- [x] **Create SDK README**
  - File: `sdk/README.md`
  - Installation: `bun add @pulse/sdk`
  - Usage examples with OpenAI, Anthropic, OpenRouter
  - Configuration options reference

---

## Phase 4: Unit Tests

> Pure logic tests only — no DB, no external services.

- [x] **Test trace validation schema**
  - File: `shared/tests/validation.test.ts`
  - Valid trace passes Zod parse
  - Missing required fields fail
  - Invalid enum values fail
  - Batch > 100 items fails

- [x] **Test cost calculation**
  - File: `sdk/tests/pricing.test.ts`
  - Known model + tokens = expected cost
  - Unknown model returns null
  - Edge cases: zero tokens, large numbers

---

## API Provider Reference

### Quick Comparison

| Aspect | OpenAI | Anthropic | OpenRouter |
|--------|--------|-----------|------------|
| API Style | `chat.completions` | `messages` | `chat.completions` (OpenAI-compatible) |
| System Message | In messages array | Separate `system` field | In messages array |
| Content Format | String | Array of content blocks | String |
| Response Wrapper | `choices[]` array | Direct `content[]` array | `choices[]` array |
| Stop Field | `finish_reason` | `stop_reason` | `finish_reason` + `native_finish_reason` |
| Token Fields | `prompt_tokens` / `completion_tokens` | `input_tokens` / `output_tokens` | `prompt_tokens` / `completion_tokens` |
| Cost Tracking | No | No | Yes (`cost`, `cost_details`) |

### Stop Reason Mapping

| Scenario | OpenAI/OpenRouter | Anthropic | Normalized To |
|----------|-------------------|-----------|---------------|
| Normal end | `stop` | `end_turn` | `stop` |
| Max tokens | `length` | `max_tokens` | `length` |
| Stop sequence | `stop` | `stop_sequence` | `stop` |
| Tool use | `tool_calls` | `tool_use` | `tool_calls` |

### Response Content Extraction

- **OpenAI/OpenRouter**: `response.choices[0].message.content` (string)
- **Anthropic**: `response.content[0].text` (array of content blocks, join text fields)

### Token Field Mapping

| OpenAI/OpenRouter | Anthropic | Internal (Trace Schema) |
|-------------------|-----------|-------------------------|
| `prompt_tokens` | `input_tokens` | `input_tokens` |
| `completion_tokens` | `output_tokens` | `output_tokens` |

### Required Fields

- **OpenAI**: `model`, `messages`
- **Anthropic**: `model`, `messages`, `max_tokens` (required!)
- **OpenRouter**: `model`, `messages`

### Unique Features

- **OpenRouter only**: Real-time cost tracking, provider routing, reasoning field
- **Anthropic only**: Full prompt caching with ephemeral options
- **OpenAI/OpenRouter only**: `frequency_penalty`, `presence_penalty`, multiple completions (`n`)

### SDK Implementation Notes

1. **OpenRouter** uses OpenAI client with different `baseURL` — no separate SDK needed
2. Auto-detect OpenRouter: check if `baseURL` includes 'openrouter'
3. OpenAI and OpenRouter share the same response normalizer (compatible formats)
4. Normalize all responses to unified trace format immediately
5. Map provider-specific fields to internal schema
6. Prefer response cost (OpenRouter provides it) over calculated cost

---

## Dependencies Summary

**Server:**
```bash
bun add hono drizzle-orm postgres zod uuid
bun add -D drizzle-kit
```

**SDK:**
```bash
bun add openai @anthropic-ai/sdk
```

---

## Resources

### Hono
- Docs: https://hono.dev/
- Bun guide: https://hono.dev/getting-started/bun

### Drizzle ORM
- Docs: https://orm.drizzle.team/docs/get-started-postgresql
- Schema reference: https://orm.drizzle.team/docs/core-schema
- Migrations: https://orm.drizzle.team/docs/kit-migrations

### Zod
- Docs: https://zod.dev/

### OpenAI SDK
- Docs: https://github.com/openai/openai-node

### Anthropic TypeScript SDK
- Docs: https://github.com/anthropics/anthropic-typescript
