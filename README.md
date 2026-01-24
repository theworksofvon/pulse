# Pulse

Observability for LLM applications. Think Grafana, but for prompts.

## What it does

Pulse captures every LLM call your application makes—prompts, responses, latency, cost, tokens—and gives you tools to understand what's happening.

- **Trace explorer**: Browse and search all your LLM calls
- **Session tracking**: Group related calls (conversations, agent runs)
- **Experiments**: A/B test prompts and models, compare results side by side
- **Evals**: Score outputs with heuristics or LLM-as-judge
- **Dashboards**: Track cost, latency, and quality over time

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
