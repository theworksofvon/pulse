import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { env } from "./config";
import { closeDb } from "./db";
import { adminAuthMiddleware } from "./middleware/admin";
import { authMiddleware } from "./middleware/auth";
import { errorHandler } from "./middleware/errors";
import { logger } from "./middleware/logger";
import { handleCreateProject, handleGetApiKeys, handleDeleteApiKey } from "./routes/admin";
import { handleBatchTraces, getTraces, getTraceById } from "./routes/traces";
import { handleGetSessionTraces } from "./routes/sessions";
import { handleGetAnalytics } from "./routes/analytics";
import { registerShutdownHandlers, setServer, setDbCleanup } from "./shutdown";

const app = new Hono();

app.onError(errorHandler);
app.use("*", logger);

app.get("/health", (c) => {
  return c.json({ status: "ok", service: "pulse" });
});

app.use("/dashboard/*", serveStatic({ root: "./static", rewriteRequestPath: (path) => path.replace(/^\/dashboard/, "") }));
app.get("/dashboard", serveStatic({ path: "./static/index.html" }));

app.post("/admin/projects", adminAuthMiddleware, handleCreateProject);
app.get("/admin/api-keys", authMiddleware, handleGetApiKeys);
app.delete("/admin/api-keys/:id", authMiddleware, handleDeleteApiKey);

app.post("/v1/traces/batch", authMiddleware, handleBatchTraces);
app.get("/v1/traces", authMiddleware, getTraces);
app.get("/v1/traces/:id", authMiddleware, getTraceById);
app.get("/v1/sessions/:id", authMiddleware, handleGetSessionTraces);
app.get("/v1/analytics", authMiddleware, handleGetAnalytics);

const server = Bun.serve({
  fetch: app.fetch,
  port: env.PORT,
});

setServer(server);
setDbCleanup(closeDb);
registerShutdownHandlers();

console.log(`Pulse server running on port ${env.PORT}`);

export { app };
