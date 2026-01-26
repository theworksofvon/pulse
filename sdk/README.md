# @pulse/sdk

TypeScript SDK for instrumenting LLM clients and capturing traces to your Pulse server.

## Installation

```bash
bun add @pulse/sdk
```

## Quick Start

```typescript
import { initPulse, observe } from '@pulse/sdk';
import OpenAI from 'openai';

// Initialize SDK
initPulse({
  apiKey: 'pulse_sk_your_api_key',
  apiUrl: 'http://localhost:3000', // Your Pulse server
});

// Wrap your LLM client
const openai = observe(new OpenAI());

// Use as normal - traces are captured automatically
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

## Supported Providers

### OpenAI

```typescript
import OpenAI from 'openai';

const openai = observe(new OpenAI());

const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

### Anthropic

```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = observe(new Anthropic());

const response = await anthropic.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

### OpenRouter

OpenRouter uses the OpenAI client with a custom base URL:

```typescript
import OpenAI from 'openai';

const openrouter = observe(
  new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
  })
);

const response = await openrouter.chat.completions.create({
  model: 'anthropic/claude-3.5-sonnet',
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

The SDK auto-detects OpenRouter when the base URL contains 'openrouter'.

## Configuration

```typescript
initPulse({
  // Required
  apiKey: 'pulse_sk_your_api_key',

  // Optional
  apiUrl: 'http://localhost:3000', // Pulse server URL
  batchSize: 10,                   // Traces per batch (1-100)
  flushInterval: 5000,             // Flush interval in ms (min: 1000)
  enabled: true,                   // Enable/disable tracing
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | Required | API key (must start with `pulse_sk_`) |
| `apiUrl` | `string` | `http://localhost:3000` | Pulse server URL |
| `batchSize` | `number` | `10` | Number of traces to batch before sending |
| `flushInterval` | `number` | `5000` | Milliseconds between automatic flushes |
| `enabled` | `boolean` | `true` | Enable or disable trace capture |

## Session Tracking

Group related traces together with session IDs:

```typescript
const openai = observe(new OpenAI(), 'auto', {
  sessionId: 'user-session-123',
});

// All traces from this client will include the session ID
```

## Custom Metadata

Attach additional context to traces:

```typescript
const openai = observe(new OpenAI(), 'auto', {
  sessionId: 'conversation-456',
  metadata: {
    userId: 'user-789',
    feature: 'chat',
    environment: 'production',
  },
});
```

## Provider Detection

The SDK automatically detects the provider from the client:

```typescript
// Auto-detection (default)
const client = observe(new OpenAI());

// Explicit provider
const client = observe(new OpenAI(), 'openai');
const client = observe(new Anthropic(), 'anthropic');
```

## Graceful Shutdown

The SDK automatically flushes remaining traces on process exit (SIGINT, SIGTERM). No manual cleanup is required.

## Captured Data

Each trace includes:

- Request and response bodies
- Model requested and used
- Token counts (input/output)
- Latency in milliseconds
- Cost in cents (when available)
- Status (success/error)
- Finish reason
- Session ID and metadata (if provided)

## Error Handling

The SDK captures errors without affecting your application:

```typescript
try {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: 'Hello!' }],
  });
} catch (error) {
  // Error trace is captured automatically
  // Original error is re-thrown
}
```

## Types

```typescript
import type {
  PulseConfig,
  Provider,
  Trace,
  TraceStatus,
  ObserveOptions,
} from '@pulse/sdk';
```
