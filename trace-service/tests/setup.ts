import { db } from "../db";
import { projects, apiKeys, sessions, traces } from "../db/schema";
import { hashApiKey } from "../auth/queries";
import { eq } from "drizzle-orm";

const BASE_URL = "http://localhost:3000";

export { BASE_URL };

/**
 * Test project data for cleanup tracking
 */
interface TestProject {
  id: string;
  apiKey: string;
}

const testProjects: TestProject[] = [];

/**
 * Create a test project with API key
 */
export async function createTestProject(name: string = "Test Project"): Promise<TestProject> {
  console.log(`[setup] Creating test project: "${name}"`);
  const apiKey = `pulse_sk_test_${crypto.randomUUID()}`;
  const keyHash = hashApiKey(apiKey);

  const [project] = await db.insert(projects).values({ name }).returning();
  await db.insert(apiKeys).values({ projectId: project!.id, keyHash });

  const testProject = { id: project!.id, apiKey };
  testProjects.push(testProject);

  console.log(`[setup] Project created: ${project!.id} (tracking ${testProjects.length} projects)`);
  return testProject;
}

/**
 * Create test traces for a project
 */
export async function createTestTraces(
  projectId: string,
  count: number = 10,
  sessionId?: string
): Promise<string[]> {
  // Create session if not provided
  let sid = sessionId;
  if (!sid) {
    const [session] = await db
      .insert(sessions)
      .values({ projectId, metadata: { test: true } })
      .returning();
    sid = session!.id;
  }

  const traceData = Array.from({ length: count }, (_, i) => ({
    projectId,
    sessionId: sid,
    timestamp: new Date(Date.now() - i * 60000), // 1 minute apart
    latencyMs: 100 + Math.floor(Math.random() * 500),
    provider: ["openai", "anthropic", "openrouter"][i % 3] as string,
    modelRequested: "gpt-4o",
    status: i === 0 ? "error" : "success", // First one is error
    requestBody: { model: "gpt-4o", messages: [] },
    inputTokens: 100 + i * 10,
    outputTokens: 200 + i * 20,
    costCents: 0.5 + i * 0.1,
  }));

  const inserted = await db.insert(traces).values(traceData).returning();
  return inserted.map((t) => t.traceId);
}

/**
 * Clean up all test data
 */
export async function cleanupTestData(): Promise<void> {
  console.log(`[setup] Cleaning up ${testProjects.length} test projects...`);
  for (const project of testProjects) {
    // Cascade delete handles sessions, traces, api_keys
    await db.delete(projects).where(eq(projects.id, project.id));
    console.log(`[setup] Deleted project: ${project.id}`);
  }
  testProjects.length = 0;
  console.log("[setup] Cleanup complete");
}

/**
 * Make authenticated request
 */
export async function authFetch(
  path: string,
  apiKey: string,
  options: RequestInit = {}
): Promise<Response> {
  const method = options.method || "GET";
  const keyPreview = apiKey.slice(0, 15) + "...";
  console.log(`[authFetch] ${method} ${path} (key: ${keyPreview})`);

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${apiKey}`,
    },
  });

  console.log(`[authFetch] ${method} ${path} -> ${response.status}`);
  return response;
}

/**
 * Make admin request
 */
export async function adminFetch(
  path: string,
  adminKey: string,
  options: RequestInit = {}
): Promise<Response> {
  const method = options.method || "GET";
  const keyPreview = adminKey ? adminKey.slice(0, 10) + "..." : "(none)";
  console.log(`[adminFetch] ${method} ${path} (admin key: ${keyPreview})`);

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      "X-Admin-Key": adminKey,
      "Content-Type": "application/json",
    },
  });

  console.log(`[adminFetch] ${method} ${path} -> ${response.status}`);
  return response;
}
