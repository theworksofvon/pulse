import { useState, useEffect } from 'react';
import { StatCard } from '../components/dashboard/StatCard';
import { TimeRangeTabs } from '../components/dashboard/TimeRangeTabs';
import type { TimeRange } from '../components/dashboard/TimeRangeTabs';
import { RecentTracesTable } from '../components/dashboard/RecentTracesTable';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import ProviderSplitChart from '../components/analytics/ProviderSplitChart';
import CostChart from '../components/analytics/CostChart';
import { getAnalytics, getTraces } from '../lib/apiClient';
import type { AnalyticsResponse, Trace } from '../lib/apiClient';

// Icons for stat cards
const DollarIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const BoltIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const AlertIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const RefreshIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const TokensIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
);

const SessionsIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
  </svg>
);

function getDateRange(range: TimeRange): { date_from: string; date_to: string } {
  const now = new Date();
  const to = now.toISOString();
  let from: Date;

  switch (range) {
    case '24h':
      from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
  }

  return { date_from: from.toISOString(), date_to: to };
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toLocaleString();
}

function formatCost(cost: number): string {
  if (cost >= 1000) {
    return '$' + (cost / 1000).toFixed(1) + 'K';
  }
  return '$' + cost.toFixed(2);
}

function formatLatency(ms: number): string {
  if (ms >= 1000) {
    return (ms / 1000).toFixed(2) + 's';
  }
  return Math.round(ms) + 'ms';
}

export default function Dashboard() {
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [recentTraces, setRecentTraces] = useState<Trace[]>([]);
  const [loading, setLoading] = useState(true);
  const [tracesLoading, setTracesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const { date_from, date_to } = getDateRange(timeRange);
      const response = await getAnalytics({ date_from, date_to, group_by: 'day' });
      setAnalytics(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentTraces = async () => {
    setTracesLoading(true);
    try {
      const response = await getTraces({ limit: 10 });
      setRecentTraces(response.traces);
    } catch (err) {
      // Don't show error for traces, just leave empty
      console.error('Failed to load recent traces:', err);
    } finally {
      setTracesLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [timeRange]);

  useEffect(() => {
    fetchRecentTraces();
  }, []);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-14 flex items-center justify-between px-6 border-b border-neutral-800 flex-shrink-0 bg-neutral-950">
        <div className="flex items-center gap-4">
          <h1 className="text-sm font-medium">Overview</h1>
        </div>
        <div className="flex items-center gap-3">
          <TimeRangeTabs value={timeRange} onChange={setTimeRange} />
          <button
            onClick={fetchStats}
            disabled={loading}
            className="p-1.5 rounded border border-neutral-700 hover:bg-neutral-850 hover:border-neutral-600 transition-colors disabled:opacity-50"
          >
            <span className={loading ? 'animate-spin inline-block' : ''}>
              <RefreshIcon />
            </span>
          </button>
          <div className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-neutral-500">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
            </span>
            Live
          </div>
        </div>
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg">
              <div className="flex items-center justify-between gap-4">
                <p className="text-rose-400 text-sm">{error}</p>
                <button
                  onClick={fetchStats}
                  className="text-sm text-accent hover:underline whitespace-nowrap"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatCard
              label="Total Cost"
              value={analytics ? formatCost(analytics.totalCost) : '--'}
              icon={<DollarIcon />}
              color="emerald"
              subtitle={`${timeRange} period`}
            />
            <StatCard
              label="Requests"
              value={analytics ? formatNumber(analytics.totalRequests) : '--'}
              icon={<BoltIcon />}
              color="blue"
              subtitle={`${timeRange} period`}
            />
            <StatCard
              label="Avg Latency"
              value={analytics ? formatLatency(analytics.avgLatency) : '--'}
              icon={<ClockIcon />}
              color="amber"
              subtitle={`${timeRange} period`}
            />
            <StatCard
              label="Error Rate"
              value={analytics ? analytics.errorRate.toFixed(1) + '%' : '--'}
              icon={<AlertIcon />}
              color="rose"
              subtitle={analytics ? `${Math.round(analytics.totalRequests * (analytics.errorRate / 100))} failed` : `${timeRange} period`}
            />
          </div>

          {/* Second Stats Row */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatCard
              label="Sessions"
              value={analytics ? formatNumber(analytics.totalSessions) : '--'}
              icon={<SessionsIcon />}
              color="purple"
              subtitle={`${timeRange} period`}
            />
            <StatCard
              label="Tokens"
              value={analytics ? formatNumber(analytics.totalTokens.input + analytics.totalTokens.output) : '--'}
              icon={<TokensIcon />}
              color="purple"
              subtitle={`${analytics ? formatNumber(analytics.totalTokens.input) : '0'} in / ${analytics ? formatNumber(analytics.totalTokens.output) : '0'} out`}
            />
            <StatCard
              label="Cost/Request"
              value={analytics ? '$' + analytics.computed.costPerRequest.toFixed(4) : '--'}
              icon={<DollarIcon />}
              color="cyan"
              subtitle={`${timeRange} period`}
            />
            <StatCard
              label="Tokens/Request"
              value={analytics ? Math.round(analytics.computed.tokensPerRequest).toLocaleString() : '--'}
              icon={<TokensIcon />}
              color="indigo"
              subtitle={`${timeRange} period`}
            />
          </div>

          {loading && !analytics && (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner text="Loading analytics..." />
            </div>
          )}

          {/* Charts Row */}
          {analytics && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              {/* Cost Over Time Chart */}
              <div className="col-span-2 bg-neutral-900 border border-neutral-800 rounded p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-medium">Cost Over Time</h3>
                    <p className="text-xs text-neutral-500 mt-0.5">Daily spending by provider</p>
                  </div>
                </div>
                <CostChart
                  data={analytics.costOverTime.map(d => ({
                    period: d.period,
                    cost: d.costCents / 100,
                    provider: d.provider,
                  }))}
                  groupBy="day"
                />
              </div>

              {/* Provider Split */}
              <div className="bg-neutral-900 border border-neutral-800 rounded p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-medium">By Provider</h3>
                    <p className="text-xs text-neutral-500 mt-0.5">Cost distribution</p>
                  </div>
                </div>
                <ProviderSplitChart data={analytics.costByProvider} />
              </div>
            </div>
          )}

          {/* Recent Traces */}
          <RecentTracesTable traces={recentTraces} loading={tracesLoading} />
        </div>
      </div>
    </div>
  );
}
