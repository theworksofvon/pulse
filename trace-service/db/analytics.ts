import { eq, and, gte, lte, sql, sum, avg, count } from "drizzle-orm";
import type { Database } from "./index";
import { traces } from "./schema";
import type { GroupBy } from "../../shared/validation";

/**
 * Date range filter for analytics queries.
 */
export interface DateRange {
  dateFrom: Date;
  dateTo: Date;
}

/**
 * Cost over time data point.
 */
export interface CostDataPoint {
  period: string;
  costCents: number;
}

/**
 * Build common date range conditions for analytics queries.
 */
function buildDateConditions(projectId: string, dateRange: DateRange) {
  return and(
    eq(traces.projectId, projectId),
    gte(traces.timestamp, dateRange.dateFrom),
    lte(traces.timestamp, dateRange.dateTo)
  );
}

/**
 * Get total cost in cents for a project within a date range.
 */
export async function getTotalCost(
  db: Database,
  projectId: string,
  dateRange: DateRange
): Promise<number> {
  const result = await db
    .select({ total: sum(traces.costCents) })
    .from(traces)
    .where(buildDateConditions(projectId, dateRange));

  return Number(result[0]?.total ?? 0);
}

/**
 * Get total tokens (input + output) for a project within a date range.
 */
export async function getTotalTokens(
  db: Database,
  projectId: string,
  dateRange: DateRange
): Promise<{ inputTokens: number; outputTokens: number; totalTokens: number }> {
  const result = await db
    .select({
      inputTokens: sum(traces.inputTokens),
      outputTokens: sum(traces.outputTokens),
    })
    .from(traces)
    .where(buildDateConditions(projectId, dateRange));

  const inputTokens = Number(result[0]?.inputTokens ?? 0);
  const outputTokens = Number(result[0]?.outputTokens ?? 0);

  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
  };
}

/**
 * Get average latency in milliseconds for a project within a date range.
 */
export async function getAvgLatency(
  db: Database,
  projectId: string,
  dateRange: DateRange
): Promise<number> {
  const result = await db
    .select({ avg: avg(traces.latencyMs) })
    .from(traces)
    .where(buildDateConditions(projectId, dateRange));

  return Number(result[0]?.avg ?? 0);
}

/**
 * Get error rate (percentage of traces with error status) for a project within a date range.
 */
export async function getErrorRate(
  db: Database,
  projectId: string,
  dateRange: DateRange
): Promise<number> {
  const conditions = buildDateConditions(projectId, dateRange);

  const [totalResult, errorResult] = await Promise.all([
    db.select({ count: count() }).from(traces).where(conditions),
    db
      .select({ count: count() })
      .from(traces)
      .where(and(conditions, eq(traces.status, "error"))),
  ]);

  const total = totalResult[0]?.count ?? 0;
  const errors = errorResult[0]?.count ?? 0;

  if (total === 0) {
    return 0;
  }

  return (errors / total) * 100;
}

/**
 * Get cost aggregated over time periods for a project within a date range.
 */
export async function getCostOverTime(
  db: Database,
  projectId: string,
  dateRange: DateRange,
  groupBy?: GroupBy
): Promise<CostDataPoint[]> {
  const conditions = buildDateConditions(projectId, dateRange);

  let periodExpr: ReturnType<typeof sql>;
  switch (groupBy) {
    case "hour":
      periodExpr = sql`date_trunc('hour', ${traces.timestamp})`;
      break;
    case "model":
      periodExpr = sql`${traces.modelRequested}`;
      break;
    case "provider":
      periodExpr = sql`${traces.provider}`;
      break;
    case "day":
    default:
      periodExpr = sql`date_trunc('day', ${traces.timestamp})`;
      break;
  }

  const result = await db
    .select({
      period: periodExpr.as("period"),
      costCents: sum(traces.costCents).as("cost_cents"),
    })
    .from(traces)
    .where(conditions)
    .groupBy(periodExpr)
    .orderBy(periodExpr);

  return result.map((row) => ({
    period: String(row.period),
    costCents: Number(row.costCents ?? 0),
  }));
}
