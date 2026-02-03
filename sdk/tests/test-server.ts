/**
 * Pulse Test Runner Server
 *
 * Exposes a single /run route that triggers OpenAI and Anthropic completion calls
 * through the Pulse SDK. Used by the E2E tests to generate real traces on demand.
 */

import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { initPulse, observe } from "@pulse/sdk";

type ProviderName = "openai" | "anthropic";

interface ProviderRunResult {
  configured: boolean;
  invoked: boolean;
  success: boolean;
  error?: string;
  model?: string;
  responseSnippet?: string | null;
}

interface RunResponseBody {
  status: "ok";
  providers: Record<ProviderName, ProviderRunResult>;
}

interface HealthResponseBody {
  status: "ok";
  providers: Record<ProviderName, boolean>;
}

interface RunRequestBody {
  providers?: ProviderName[] | ProviderName;
  provider?: ProviderName[] | ProviderName;
}

const PULSE_API_KEY = process.env.PULSE_API_KEY;
const PULSE_API_URL = process.env.PULSE_API_URL || "http://localhost:3000";
const PORT = Number(process.env.TEST_SERVER_PORT || 3001);

if (!PULSE_API_KEY) {
  console.error("PULSE_API_KEY is required");
  process.exit(1);
}

initPulse({
  apiKey: PULSE_API_KEY,
  apiUrl: PULSE_API_URL,
  batchSize: 1,
  flushInterval: 1000,
});

const openaiClient = process.env.OPENAI_API_KEY
  ? observe(new OpenAI({ apiKey: process.env.OPENAI_API_KEY }), "openai")
  : null;

const anthropicClient = process.env.ANTHROPIC_API_KEY
  ? observe(new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }), "anthropic")
  : null;

function normalizeProviderList(input?: unknown): ProviderName[] | undefined {
  if (!input) return undefined;

  if (Array.isArray(input)) {
    return input.filter((value): value is ProviderName => value === "openai" || value === "anthropic");
  }

  if (typeof input === "string" && (input === "openai" || input === "anthropic")) {
    return [input];
  }

  return undefined;
}

function shouldRunProvider(name: ProviderName, list?: ProviderName[]): boolean {
  if (!list || list.length === 0) return true;
  return list.includes(name);
}

async function invokeProviders(selected?: ProviderName[]): Promise<Record<ProviderName, ProviderRunResult>> {
  const results: Record<ProviderName, ProviderRunResult> = {
    openai: {
      configured: !!openaiClient,
      invoked: false,
      success: false,
    },
    anthropic: {
      configured: !!anthropicClient,
      invoked: false,
      success: false,
    },
  };

  if (shouldRunProvider("openai", selected) && openaiClient) {
    results.openai.invoked = true;
    try {
      const response = await openaiClient.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [{ role: "user", content: "Say 'test' and nothing else" }],
        max_tokens: 32,
      });
      results.openai.success = true;
      results.openai.model = response.model;
      results.openai.responseSnippet = response.choices[0]?.message?.content ?? null;
    } catch (error) {
      results.openai.error = error instanceof Error ? error.message : "Unknown error";
    }
  } else if (!shouldRunProvider("openai", selected)) {
    results.openai.error = "Provider not requested";
  } else {
    results.openai.error = "OPENAI_API_KEY not set";
  }

  if (shouldRunProvider("anthropic", selected) && anthropicClient) {
    results.anthropic.invoked = true;
    try {
      const response = await anthropicClient.messages.create({
        model: process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-20241022",
        max_tokens: 32,
        messages: [{ role: "user", content: "Say 'test' and nothing else" }],
      });
      const textContent = response.content.find((c) => c.type === "text");
      results.anthropic.success = true;
      results.anthropic.model = response.model;
      results.anthropic.responseSnippet = textContent?.type === "text" ? textContent.text : null;
    } catch (error) {
      results.anthropic.error = error instanceof Error ? error.message : "Unknown error";
    }
  } else if (!shouldRunProvider("anthropic", selected)) {
    results.anthropic.error = "Provider not requested";
  } else {
    results.anthropic.error = "ANTHROPIC_API_KEY not set";
  }

  return results;
}

async function handleRunRequest(req: Request): Promise<Response> {
  let providerFilter: ProviderName[] | undefined;
  try {
    const body = (await req.json()) as RunRequestBody;
    providerFilter = normalizeProviderList(body?.providers ?? body?.provider);
  } catch {
    // Ignore body parsing errors and default to running all providers
  }

  const providers = await invokeProviders(providerFilter);
  const body: RunResponseBody = {
    status: "ok",
    providers,
  };
  return Response.json(body);
}

function handleHealthRequest(): Response {
  const body: HealthResponseBody = {
    status: "ok",
    providers: {
      openai: !!openaiClient,
      anthropic: !!anthropicClient,
    },
  };
  return Response.json(body);
}

const server = Bun.serve({
  port: PORT,
  fetch: async (req) => {
    const url = new URL(req.url);

    if (url.pathname === "/run" && req.method === "POST") {
      return handleRunRequest(req);
    }

    if (url.pathname === "/health" && req.method === "GET") {
      return handleHealthRequest();
    }

    return new Response("Not found", { status: 404 });
  },
});

console.log(`Pulse test runner listening on http://localhost:${server.port}/run`);
