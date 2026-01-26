import type { Context } from "hono";
import { db } from "../db";
import { PostgresStorage } from "../db/postgres";
import { ingestTraces, queryTraces, getTrace } from "../services/traces";
import { ZodError } from "zod";
import { traceQuerySchema } from "../../shared/validation";

const storage = new PostgresStorage(db);

/**
 * Handler for POST /v1/traces/batch
 * Ingests a batch of traces for the authenticated project.
 */
export async function handleBatchTraces(c: Context): Promise<Response> {
  const projectId = c.get("projectId") as string;

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  try {
    const result = await ingestTraces(projectId, body, storage);
    return c.json(result, 202);
  } catch (err) {
    if (err instanceof ZodError) {
      return c.json({ error: "Validation failed", details: err.issues }, 400);
    }
    throw err;
  }
}

/**
 * Handler for GET /v1/traces
 * Query traces for the authenticated project with optional filters.
 */
export async function getTraces(c: Context): Promise<Response> {
  const projectId = c.get("projectId") as string;

  const rawQuery = c.req.query();
  let params;
  try {
    params = traceQuerySchema.parse(rawQuery);
  } catch (err) {
    if (err instanceof ZodError) {
      return c.json({ error: "Invalid query parameters", details: err.issues }, 400);
    }
    throw err;
  }

  const filters = {
    sessionId: params.session_id,
    provider: params.provider,
    model: params.model,
    status: params.status,
    dateFrom: params.date_from ? new Date(params.date_from) : undefined,
    dateTo: params.date_to ? new Date(params.date_to) : undefined,
    limit: params.limit,
    offset: params.offset,
  };

  const result = await queryTraces(projectId, filters, storage);
  return c.json(result, 200);
}

/**
 * Handler for GET /v1/traces/:id
 * Get a single trace by ID for the authenticated project.
 */
export async function getTraceById(c: Context): Promise<Response> {
  const projectId = c.get("projectId") as string;
  const traceId = c.req.param("id");

  const trace = await getTrace(traceId, projectId, storage);

  if (!trace) {
    return c.json({ error: "Trace not found" }, 404);
  }

  return c.json(trace, 200);
}
