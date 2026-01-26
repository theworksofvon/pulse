import type { Context } from "hono";
import { db } from "../db";
import { PostgresStorage } from "../db/postgres";
import { getSessionTraces } from "../services/sessions";

const storage = new PostgresStorage(db);

/**
 * Handler for GET /v1/sessions/:id
 * Get all traces for a session, ordered by timestamp ascending.
 */
export async function handleGetSessionTraces(c: Context): Promise<Response> {
  const projectId = c.get("projectId") as string;
  const sessionId = c.req.param("id");

  const result = await getSessionTraces(sessionId, projectId, storage);

  return c.json(result, 200);
}
