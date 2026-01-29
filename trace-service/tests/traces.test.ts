import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import {
  BASE_URL,
  authFetch,
  createTestProject,
  createTestTraces,
  cleanupTestData,
} from "./setup";

describe("Traces Endpoints", () => {
  let testProject: { id: string; apiKey: string };
  let traceIds: string[];

  beforeAll(async () => {
    console.log("[traces.test] Setting up test project...");
    testProject = await createTestProject("Traces Test Project");
    console.log(`[traces.test] Created project: ${testProject.id}`);
    traceIds = await createTestTraces(testProject.id, 15);
    console.log(`[traces.test] Created ${traceIds.length} test traces`);
  });

  afterAll(async () => {
    console.log("[traces.test] Cleaning up test data...");
    await cleanupTestData();
  });

  describe("GET /v1/traces", () => {
    test("returns traces for authenticated project", async () => {
      const response = await authFetch("/v1/traces", testProject.apiKey);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("traces");
      expect(data).toHaveProperty("total");
      expect(data.traces.length).toBeGreaterThan(0);
      expect(data.total).toBe(15);
    });

    test("respects limit parameter", async () => {
      const response = await authFetch("/v1/traces?limit=5", testProject.apiKey);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.traces.length).toBe(5);
      expect(data.limit).toBe(5);
    });

    test("respects offset parameter", async () => {
      const response = await authFetch(
        "/v1/traces?limit=5&offset=5",
        testProject.apiKey
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.traces.length).toBe(5);
      expect(data.offset).toBe(5);
    });

    test("filters by provider", async () => {
      const response = await authFetch(
        "/v1/traces?provider=openai",
        testProject.apiKey
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      data.traces.forEach((trace: any) => {
        expect(trace.provider).toBe("openai");
      });
    });

    test("filters by status", async () => {
      const response = await authFetch(
        "/v1/traces?status=error",
        testProject.apiKey
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.traces.length).toBeGreaterThan(0);
      data.traces.forEach((trace: any) => {
        expect(trace.status).toBe("error");
      });
    });

    test("returns 401 without auth", async () => {
      const response = await fetch(`${BASE_URL}/v1/traces`);

      expect(response.status).toBe(401);
    });

    test("returns 401 with invalid api key", async () => {
      const response = await authFetch("/v1/traces", "invalid-key");

      expect(response.status).toBe(401);
    });
  });

  describe("GET /v1/traces/:id", () => {
    test("returns single trace by id", async () => {
      const traceId = traceIds[0];
      const response = await authFetch(
        `/v1/traces/${traceId}`,
        testProject.apiKey
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.traceId).toBe(traceId);
      expect(data).toHaveProperty("provider");
      expect(data).toHaveProperty("modelRequested");
    });

    test("returns 404 for non-existent trace", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const response = await authFetch(
        `/v1/traces/${fakeId}`,
        testProject.apiKey
      );

      expect(response.status).toBe(404);
    });
  });

  describe("POST /v1/traces/batch", () => {
    test("ingests batch of traces", async () => {
      const batchData = [
        {
          trace_id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          provider: "openai",
          model_requested: "gpt-4o",
          latency_ms: 500,
          status: "success",
          request_body: { model: "gpt-4o", messages: [] },
          input_tokens: 100,
          output_tokens: 200,
        },
        {
          trace_id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          provider: "anthropic",
          model_requested: "claude-3-opus",
          latency_ms: 800,
          status: "success",
          request_body: { model: "claude-3-opus", messages: [] },
          input_tokens: 150,
          output_tokens: 300,
        },
      ];

      const response = await authFetch("/v1/traces/batch", testProject.apiKey, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(batchData),
      });
      const data = await response.json();

      expect(response.status).toBe(202);
      expect(data.count).toBe(2);
    });

    test("rejects batch with invalid data", async () => {
      const invalidData = [
        {
          // Missing required fields
          provider: "openai",
        },
      ];

      const response = await authFetch("/v1/traces/batch", testProject.apiKey, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalidData),
      });

      expect(response.status).toBe(400);
    });

    test("rejects batch exceeding 100 traces", async () => {
      const largeBatch = Array.from({ length: 101 }, () => ({
        trace_id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        provider: "openai",
        model_requested: "gpt-4o",
        latency_ms: 500,
        status: "success",
        request_body: {},
      }));

      const response = await authFetch("/v1/traces/batch", testProject.apiKey, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(largeBatch),
      });

      expect(response.status).toBe(400);
    });
  });
});
