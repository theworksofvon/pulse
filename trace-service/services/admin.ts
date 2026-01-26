import { v4 as uuidv4 } from "uuid";
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
