import { describe, test, expect, afterAll } from "bun:test";
import { BASE_URL, adminFetch, cleanupTestData } from "./setup";
import { env } from "../config";

describe("Admin Endpoints", () => {
  afterAll(async () => {
    console.log("[admin.test] Cleaning up test data...");
    await cleanupTestData();
  });

  describe("POST /admin/projects", () => {
    test("creates a project with valid admin key", async () => {
      const response = await adminFetch("/admin/projects", env.ADMIN_KEY!, {
        method: "POST",
        body: JSON.stringify({ name: "Integration Test Project" }),
      });
      const data = await response.json() as { projectId: string, apiKey: string, name: string };

      expect(response.status).toBe(201);
      expect(data).toHaveProperty("projectId");
      expect(data).toHaveProperty("apiKey");
      expect(data.apiKey).toMatch(/^pulse_sk_/);
      expect(data.name).toBe("Integration Test Project");
    });

    test("returns 401 with invalid admin key", async () => {
      const response = await adminFetch("/admin/projects", "invalid-key", {
        method: "POST",
        body: JSON.stringify({ name: "Should Fail" }),
      });

      expect(response.status).toBe(401);
    });

    test("returns 401 with missing admin key", async () => {
      const response = await fetch(`${BASE_URL}/admin/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Should Fail" }),
      });

      expect(response.status).toBe(401);
    });

    test("accepts admin key as query param", async () => {
      const response = await fetch(
        `${BASE_URL}/admin/projects?admin_key=${env.ADMIN_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Query Param Project" }),
        }
      );
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty("projectId");
    });
  });
});
