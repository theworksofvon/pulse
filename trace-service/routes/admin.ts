import type { Context } from "hono";
import { createProject } from "../services/admin";
import { db } from "../db";

/**
 * Handler for POST /admin/projects
 * Creates a new project and returns the project info with API key.
 */
export async function handleCreateProject(c: Context): Promise<Response> {
  const body = await c.req.json<{ name?: string }>();

  if (!body.name || typeof body.name !== "string") {
    return c.json({ error: "Missing required field: name" }, 400);
  }

  const name = body.name.trim();
  if (name.length === 0) {
    return c.json({ error: "Project name cannot be empty" }, 400);
  }

  const result = await createProject(name, db);

  return c.json(result, 201);
}
