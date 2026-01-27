# Build stage
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy shared module first (needed by trace-service)
COPY shared ./shared

# Copy trace-service package files
COPY trace-service/package.json trace-service/bun.lock* ./trace-service/
COPY trace-service/dashboard/pulse-dashboard/package.json trace-service/dashboard/pulse-dashboard/bun.lock* ./trace-service/dashboard/pulse-dashboard/

# Install dependencies
WORKDIR /app/trace-service
RUN bun install
RUN cd dashboard/pulse-dashboard && bun install

# Copy trace-service source files
COPY trace-service .

# Build dashboard
RUN cd dashboard/pulse-dashboard && bun run build

# Production stage
FROM oven/bun:1-slim

WORKDIR /app

# Copy shared module (for relative imports)
COPY --from=builder /app/shared ../shared

# Copy package files and install deps (need drizzle-kit for migrations)
COPY --from=builder /app/trace-service/package.json ./
COPY --from=builder /app/trace-service/bun.lock* ./
RUN bun install

# Copy source code
COPY --from=builder /app/trace-service/*.ts ./
COPY --from=builder /app/trace-service/auth ./auth
COPY --from=builder /app/trace-service/db ./db
COPY --from=builder /app/trace-service/drizzle ./drizzle
COPY --from=builder /app/trace-service/middleware ./middleware
COPY --from=builder /app/trace-service/routes ./routes
COPY --from=builder /app/trace-service/services ./services

# Copy built dashboard
COPY --from=builder /app/trace-service/static ./static

# Copy drizzle config for migrations
COPY --from=builder /app/trace-service/drizzle.config.ts ./

# Copy entrypoint script
COPY trace-service/entrypoint.sh ./
RUN chmod +x entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
