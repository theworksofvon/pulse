/**
 * E2E Integration Tests
 *
 * Tests that verify the full flow:
 * 1. Test server makes real LLM API calls with Pulse SDK
 * 2. Traces are sent to the real trace-service
 * 3. Traces can be retrieved from the trace-service API
 *
 * Requires:
 * - trace-service running
 * - test-server running
 * - Valid API keys configured
 */

import { describe, expect, it, beforeAll } from "bun:test";

type ProviderName = "openai" | "anthropic";

interface Trace {
  traceId: string;
  timestamp: string;
  provider: string;
  modelRequested: string;
  modelUsed?: string;
  status: "success" | "error";
  inputTokens?: number;
  outputTokens?: number;
  latencyMs: number;
  costCents?: number;
}

interface TracesResponse {
  traces: Trace[];
  total: number;
}

interface HealthResponse {
  status: string;
  providers: Record<ProviderName, boolean>;
}

interface RunResponse {
  status: string;
  providers: Record<ProviderName, {
    configured: boolean;
    invoked: boolean;
    success: boolean;
    error?: string;
    model?: string;
    responseSnippet?: string | null;
  }>;
}

const TEST_SERVER_URL = process.env.TEST_SERVER_URL || "http://localhost:3001";
const TRACE_SERVICE_URL = process.env.TRACE_SERVICE_URL || "http://localhost:3000";
const PULSE_API_KEY = process.env.PULSE_API_KEY;

if (!PULSE_API_KEY) {
  throw new Error("PULSE_API_KEY is required to run E2E tests");
}

/**
 * Helper to wait for traces to be flushed and processed
 */
async function waitForTraces(ms = 2000): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Helper to fetch traces from trace-service
 */
async function getTraces(params: { limit?: number; provider?: string } = {}): Promise<TracesResponse> {
  const url = new URL(`${TRACE_SERVICE_URL}/v1/traces`);
  if (params.limit) url.searchParams.set("limit", String(params.limit));
  if (params.provider) url.searchParams.set("provider", params.provider);

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${PULSE_API_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch traces: ${response.status}`);
  }

  return response.json() as Promise<TracesResponse>;
}

/**
 * Helper to check test server health and available providers
 */
async function getTestServerHealth(): Promise<HealthResponse["providers"]> {
  const response = await fetch(`${TEST_SERVER_URL}/health`);
  const data = (await response.json()) as HealthResponse;
  return data.providers;
}

async function triggerRun(provider: ProviderName): Promise<void> {
  const response = await fetch(`${TEST_SERVER_URL}/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider }),
  });

  expect(response.ok).toBe(true);
  const data = (await response.json()) as RunResponse;
  expect(data.status).toBe("ok");
  expect(data.providers[provider]).toMatchObject({ configured: true, invoked: true, success: true });
}

describe("E2E Integration Tests", () => {
  let availableProviders: HealthResponse["providers"];

  beforeAll(async () => {
    // Check which providers are available
    try {
      availableProviders = await getTestServerHealth();
      console.log("Available providers:", availableProviders);
    } catch {
      throw new Error(`Test server not reachable at ${TEST_SERVER_URL}. Make sure it's running.`);
    }
  });

  describe("OpenAI Integration", () => {
    it("should capture trace for OpenAI completion", async () => {
      if (!availableProviders.openai) {
        console.log("Skipping: OpenAI not configured");
        return;
      }

      await triggerRun("openai");

      // Wait for trace to be flushed
      await waitForTraces();

      // Verify trace was recorded in trace-service
      const tracesResponse = await getTraces({ provider: "openai", limit: 1 });
      expect(tracesResponse.traces.length).toBeGreaterThan(0);

      const trace = tracesResponse.traces[0];
      if (!trace) {
        throw new Error("Expected at least one OpenAI trace");
      }
      expect(trace.provider).toBe("openai");
      expect(trace.status).toBe("success");
      expect(trace.modelRequested).toContain("gpt-4o-mini");
      expect(trace.inputTokens).toBeGreaterThan(0);
      expect(trace.outputTokens).toBeGreaterThan(0);
      expect(trace.latencyMs).toBeGreaterThan(0);
      expect(trace.costCents).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Anthropic Integration", () => {
    it("should capture trace for Anthropic completion", async () => {
      if (!availableProviders.anthropic) {
        console.log("Skipping: Anthropic not configured");
        return;
      }

      await triggerRun("anthropic");

      // Wait for trace to be flushed
      await waitForTraces();

      // Verify trace was recorded in trace-service
      const tracesResponse = await getTraces({ provider: "anthropic", limit: 1 });
      expect(tracesResponse.traces.length).toBeGreaterThan(0);

      const trace = tracesResponse.traces[0];
      if (!trace) {
        throw new Error("Expected at least one Anthropic trace");
      }
      expect(trace.provider).toBe("anthropic");
      expect(trace.status).toBe("success");
      expect(trace.modelRequested).toContain("claude");
      expect(trace.inputTokens).toBeGreaterThan(0);
      expect(trace.outputTokens).toBeGreaterThan(0);
      expect(trace.latencyMs).toBeGreaterThan(0);
      expect(trace.costCents).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Trace Data Validation", () => {
    it("should have valid trace structure", async () => {
      // Get any recent trace
      const tracesResponse = await getTraces({ limit: 1 });

      if (tracesResponse.traces.length === 0) {
        console.log("Skipping: No traces available");
        return;
      }

      const trace = tracesResponse.traces[0];
      if (!trace) {
        throw new Error("Expected at least one trace to validate");
      }

      // Validate required fields
      expect(trace.traceId).toMatch(/^[0-9a-f-]{36}$/i);
      expect(trace.timestamp).toBeDefined();
      expect(new Date(trace.timestamp).toISOString()).toBe(trace.timestamp);
      expect(["openai", "anthropic"]).toContain(trace.provider);
      expect(trace.modelRequested).toBeDefined();
      expect(["success", "error"]).toContain(trace.status);
      expect(typeof trace.latencyMs).toBe("number");
    });
  });
});
