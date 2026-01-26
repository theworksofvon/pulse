import { Hono } from "hono";
import { loadConfig } from "./config";
import { closeDb } from "./db";
import { adminAuthMiddleware } from "./middleware/admin";
import { authMiddleware } from "./middleware/auth";
import { errorHandler } from "./middleware/errors";
import { logger } from "./middleware/logger";
import { handleCreateProject } from "./routes/admin";
import { handleBatchTraces, getTraces, getTraceById } from "./routes/traces";
import { handleGetSessionTraces } from "./routes/sessions";
import { handleGetAnalytics } from "./routes/analytics";
import { registerShutdownHandlers, setServer, setDbCleanup } from "./shutdown";

const config = loadConfig();
const app = new Hono();

app.onError(errorHandler);
app.use("*", logger);

app.get("/health", (c) => {
  return c.json({ status: "ok", service: "pulse" });
});

app.post("/admin/projects", adminAuthMiddleware, handleCreateProject);

app.post("/v1/traces/batch", authMiddleware, handleBatchTraces);
app.get("/v1/traces", authMiddleware, getTraces);
app.get("/v1/traces/:id", authMiddleware, getTraceById);
app.get("/v1/sessions/:id", authMiddleware, handleGetSessionTraces);
app.get("/v1/analytics", authMiddleware, handleGetAnalytics);

const server = Bun.serve({
  fetch: app.fetch,
  port: config.port,
});

setServer(server);
setDbCleanup(closeDb);
registerShutdownHandlers();

console.log(`Pulse server running on port ${config.port}`);

export { app };
