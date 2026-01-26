let server: ReturnType<typeof Bun.serve> | null = null;
let cleanupDb: (() => Promise<void>) | null = null;
let isShuttingDown = false;

export function setServer(s: ReturnType<typeof Bun.serve>): void {
  server = s;
}

export function setDbCleanup(cleanup: () => Promise<void>): void {
  cleanupDb = cleanup;
}

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;

  console.log(`${new Date().toISOString()} Received ${signal}, shutting down...`);

  if (server) {
    server.stop();
    console.log(`${new Date().toISOString()} HTTP server stopped`);
  }

  if (cleanupDb) {
    await cleanupDb();
    console.log(`${new Date().toISOString()} Database connection closed`);
  }

  console.log(`${new Date().toISOString()} Shutdown complete`);
  process.exit(0);
}

export function registerShutdownHandlers(): void {
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}
