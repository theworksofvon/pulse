import { useState, useEffect, useCallback } from 'react';
import { getTraces } from '../lib/apiClient';
import type { Trace } from '../lib/apiClient';
import SessionsTable from '../components/sessions/SessionsTable';
import type { SessionSummary } from '../components/sessions/SessionsTable';
import { TableSkeleton } from '../components/ui/TableSkeleton';

const CalendarIcon = () => (
  <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg className="w-3.5 h-3.5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

function groupTracesIntoSessions(traces: Trace[]): SessionSummary[] {
  const sessionMap = new Map<string, Trace[]>();

  for (const trace of traces) {
    if (!trace.sessionId) continue;
    const existing = sessionMap.get(trace.sessionId) || [];
    existing.push(trace);
    sessionMap.set(trace.sessionId, existing);
  }

  const sessions: SessionSummary[] = [];
  for (const [session_id, sessionTraces] of sessionMap) {
    const sorted = sessionTraces.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    const totalTokens = sorted.reduce((sum, t) => sum + (t.inputTokens || 0) + (t.outputTokens || 0), 0);
    const totalCost = sorted.reduce((sum, t) => sum + (t.costCents || 0), 0);
    const errorCount = sorted.filter(t => t.status === 'error').length;

    sessions.push({
      session_id,
      first_trace_time: sorted[0].timestamp,
      last_trace_time: sorted[sorted.length - 1].timestamp,
      trace_count: sorted.length,
      total_tokens: totalTokens,
      total_cost_cents: totalCost,
      error_count: errorCount,
      user: sorted[0].metadata?.user as string | undefined,
    });
  }

  // Sort by most recent first
  return sessions.sort(
    (a, b) => new Date(b.first_trace_time).getTime() - new Date(a.first_trace_time).getTime()
  );
}

export default function Sessions() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch traces with session_ids and group them
      // In production, this would be a dedicated sessions endpoint
      const response = await getTraces({ limit: 500 });
      const grouped = groupTracesIntoSessions(response.traces);
      setSessions(grouped);
      setTotal(grouped.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const filteredSessions = searchQuery
    ? sessions.filter(
        s =>
          s.session_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (s.user && s.user.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : sessions;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-14 flex items-center justify-between px-6 border-b border-neutral-800 flex-shrink-0 bg-neutral-950">
        <div className="flex items-center gap-4">
          <h1 className="text-sm font-medium">Sessions</h1>
          <span className="text-xs text-neutral-500">{total.toLocaleString()} total</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Date Range Button */}
          <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-neutral-300 rounded border border-neutral-700 hover:bg-neutral-850 hover:border-neutral-600 transition-colors">
            <CalendarIcon />
            <span>Last 7 days</span>
            <ChevronDownIcon />
          </button>
          {/* Live Indicator */}
          <div className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-neutral-500">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
            </span>
            Live
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <div className="px-6 py-3 border-b border-neutral-800 flex-shrink-0">
        <div className="flex items-center justify-between gap-4">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="flex items-center gap-2 px-3 py-2 bg-neutral-900 border border-neutral-800 rounded">
              <SearchIcon />
              <input
                type="text"
                placeholder="Search by session ID or user..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm text-neutral-300 placeholder:text-neutral-500 outline-none"
              />
            </div>
          </div>
          {/* Sort Button */}
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-neutral-400 rounded border border-neutral-700 hover:bg-neutral-850 hover:border-neutral-600 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
            Sort: Recent
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-6">
        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg">
            <div className="flex items-center justify-between gap-4">
              <p className="text-rose-400 text-sm">{error}</p>
              <button
                onClick={fetchSessions}
                className="text-sm text-accent hover:underline whitespace-nowrap"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="max-w-5xl mx-auto">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
              <TableSkeleton rows={10} columns={7} />
            </div>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto">
            <SessionsTable sessions={filteredSessions} />
          </div>
        )}
      </div>
    </div>
  );
}
