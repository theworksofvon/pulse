interface Config {
  databaseUrl: string;
  port: number;
  adminKey: string | undefined;
}

export function loadConfig(): Config {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const port = parseInt(process.env.PORT ?? "3000", 10);
  if (isNaN(port)) {
    throw new Error("PORT must be a valid number");
  }

  const adminKey = process.env.ADMIN_KEY;

  return {
    databaseUrl,
    port,
    adminKey,
  };
}

export type { Config };
