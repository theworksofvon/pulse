import type { Database } from "../db/index";
import type { GroupBy } from "../../shared/validation";
import {
  getTotalCost,
  getTotalTokens,
  getAvgLatency,
  getErrorRate,
  getCostOverTime,
  type CostDataPoint,
} from "../db/analytics";

/**
 * Date range for analytics queries.
 */
export interface AnalyticsDateRange {
  dateFrom: Date;
  dateTo: Date;
}

/**
 * Result of an analytics query.
 */
export interface AnalyticsResult {
  totalCost: number;
  totalTokens: {
    input: number;
    output: number;
    total: number;
  };
  avgLatency: number;
  errorRate: number;
  costOverTime: CostDataPoint[];
}

/**
 * Get analytics for a project within a date range.
 * Aggregates cost, tokens, latency, and error rate.
 */
export async function getAnalytics(
  projectId: string,
  dateRange: AnalyticsDateRange,
  db: Database,
  groupBy?: GroupBy
): Promise<AnalyticsResult> {
  const dbDateRange = {
    dateFrom: dateRange.dateFrom,
    dateTo: dateRange.dateTo,
  };

  const [totalCost, tokens, avgLatency, errorRate, costOverTime] =
    await Promise.all([
      getTotalCost(db, projectId, dbDateRange),
      getTotalTokens(db, projectId, dbDateRange),
      getAvgLatency(db, projectId, dbDateRange),
      getErrorRate(db, projectId, dbDateRange),
      getCostOverTime(db, projectId, dbDateRange, groupBy),
    ]);

  return {
    totalCost,
    totalTokens: {
      input: tokens.inputTokens,
      output: tokens.outputTokens,
      total: tokens.totalTokens,
    },
    avgLatency,
    errorRate,
    costOverTime,
  };
}
