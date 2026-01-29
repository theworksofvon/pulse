import { v4 as uuidv4 } from "uuid";
import { eq } from "drizzle-orm";
import type { Database } from "../db";
import { projects, apiKeys } from "../db/schema";
import { hashApiKey } from "../auth/queries";

/**
 * Result returned when a project is created.
 */
export interface CreateProjectResult {
  projectId: string;
  apiKey: string;
  name: string;
}

/**
 * API key info returned when listing keys.
 */
export interface ApiKeyInfo {
  id: string;
  projectId: string;
  projectName: string;
  createdAt: string;
}

/**
 * Generate a new API key with the pulse_sk_ prefix.
 */
export function generateApiKey(): string {
  return `pulse_sk_${uuidv4()}`;
}

/**
 * Create a new project with an API key.
 *
 * @param name - The project name
 * @param db - Drizzle database instance
 * @returns The created project info including the plaintext API key (only returned once)
 */
export async function createProject(
  name: string,
  db: Database
): Promise<CreateProjectResult> {
  const apiKey = generateApiKey();
  const keyHash = hashApiKey(apiKey);

  const [project] = await db.insert(projects).values({ name }).returning();

  await db.insert(apiKeys).values({
    projectId: project!.id,
    keyHash,
  });

  return {
    projectId: project!.id,
    apiKey,
    name: project!.name,
  };
}

/**
 * Get all API keys for a project.
 *
 * @param projectId - The project ID to get keys for
 * @param db - Drizzle database instance
 * @returns List of API keys (without the actual key values, which are hashed)
 */
export async function getApiKeys(
  projectId: string,
  db: Database
): Promise<ApiKeyInfo[]> {
  const keys = await db
    .select({
      id: apiKeys.id,
      projectId: apiKeys.projectId,
      projectName: projects.name,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .innerJoin(projects, eq(apiKeys.projectId, projects.id))
    .where(eq(apiKeys.projectId, projectId));

  return keys.map((k) => ({
    id: k.id,
    projectId: k.projectId,
    projectName: k.projectName,
    createdAt: k.createdAt.toISOString(),
  }));
}

/**
 * Delete an API key by ID.
 *
 * @param keyId - The API key ID to delete
 * @param projectId - The project ID (for authorization check)
 * @param db - Drizzle database instance
 * @returns true if deleted, false if not found
 */
export async function deleteApiKey(
  keyId: string,
  projectId: string,
  db: Database
): Promise<boolean> {
  const result = await db
    .delete(apiKeys)
    .where(eq(apiKeys.id, keyId))
    .returning();

  return result.length > 0;
}
