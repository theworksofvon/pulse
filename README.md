# Pulse

Observability for LLM applications. Think Grafana, but for prompts.

## What it does

Pulse captures every LLM call your application makes—prompts, responses, latency, cost, tokens—and gives you tools to understand what's happening.

- **Trace explorer**: Browse and search all your LLM calls
- **Session tracking**: Group related calls (conversations, agent runs)
- **Experiments**: A/B test prompts and models, compare results side by side
- **Evals**: Score outputs with heuristics or LLM-as-judge
- **Dashboards**: Track cost, latency, and quality over time

## Concepts

### Trace

A **trace** is a single LLM API call. Every time your application sends a request to an LLM provider, Pulse captures it as a trace. Each trace includes:

- **Request**: The prompt, model, and parameters you sent
- **Response**: The completion text, finish reason, and any errors
- **Metrics**: Input/output token counts, latency (ms), and cost (cents)
- **Context**: Provider, model requested vs. model used, timestamp
- **Metadata**: Custom fields you attach (user ID, feature name, etc.)

### Session

A **session** groups related traces together. Use sessions to track:

- **Conversations**: Multi-turn chat interactions with a user
- **Agent runs**: A sequence of LLM calls made by an autonomous agent
- **Workflows**: Any logical unit of work involving multiple LLM calls

Sessions let you see the full context of how traces relate to each other, calculate aggregate metrics (total cost, duration), and debug issues across an entire interaction.

### Provider

A **provider** is the LLM service handling your requests. Pulse currently supports:

- **OpenAI**: GPT-4, GPT-3.5, etc.
- **Anthropic**: Claude 3 Opus, Sonnet, Haiku, etc.
- **OpenRouter**: Access to multiple models through a single API

### Project

A **project** is a container for your traces and API keys. Use projects to separate environments (production, staging) or different applications. Each project has its own API key for authentication.

## Why

LLM calls are non-deterministic. A prompt that works today might fail tomorrow. Without visibility into what your models are actually doing, you're debugging blind.

Pulse gives you the data to answer questions like:
- Why did this response fail?
- Which prompt variant performs better?
- How much context do I actually need?
- Where is my cost coming from?

## How it works

```
Your app → Pulse SDK (wraps LLM clients) → Pulse API → Storage
                                                          ↓
                                               Web UI for exploration
```

The SDK wraps your existing LLM client (OpenAI, Anthropic, Replicate, etc.) and logs calls automatically. Zero config, minimal overhead.

```typescript
import { observe } from '@pulse/sdk';
import OpenAI from 'openai';

const openai = observe(new OpenAI());

// All calls are now tracked
await openai.chat.completions.create({ ... });
```

## Status

Early development. Building in public.

## License

MIT
