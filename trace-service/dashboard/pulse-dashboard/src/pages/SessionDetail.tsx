import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getSession } from '../lib/apiClient';
import type { Session, Trace } from '../lib/apiClient';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

const BackIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const CopyIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

function formatDuration(startStr: string, endStr: string): string {
  const start = new Date(startStr);
  const end = new Date(endStr);
  const diffMs = end.getTime() - start.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const mins = Math.floor(diffSecs / 60);
  const secs = diffSecs % 60;
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}

function formatTokens(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return String(count);
}

function formatCost(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatLatency(ms: number): string {
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(2)}s`;
  }
  return `${ms}ms`;
}

interface SessionStats {
  traceCount: number;
  totalTokens: number;
  totalCost: number;
  duration: string;
  errorCount: number;
}

function calculateSessionStats(traces: Trace[]): SessionStats {
  const sorted = [...traces].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const totalTokens = sorted.reduce((sum, t) => sum + (t.inputTokens || 0) + (t.outputTokens || 0), 0);
  const totalCost = sorted.reduce((sum, t) => sum + (t.costCents || 0), 0);
  const errorCount = sorted.filter(t => t.status === 'error').length;
  const duration = sorted.length >= 2
    ? formatDuration(sorted[0].timestamp, sorted[sorted.length - 1].timestamp)
    : '0s';

  return {
    traceCount: sorted.length,
    totalTokens,
    totalCost,
    duration,
    errorCount,
  };
}

interface CopyButtonProps {
  text: string;
  className?: string;
}

function CopyButton({ text, className = '' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={`p-1 hover:bg-neutral-800 rounded text-neutral-500 hover:text-neutral-300 transition-colors ${className}`}
      title="Copy to clipboard"
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </button>
  );
}

interface TraceCardProps {
  trace: Trace;
  isLatest: boolean;
  onClick: () => void;
}

function TraceCard({ trace, isLatest, onClick }: TraceCardProps) {
  const isError = trace.status === 'error';

  return (
    <div
      onClick={onClick}
      className={`bg-neutral-900 border rounded-lg p-3 hover:bg-neutral-850 cursor-pointer transition-colors ${
        isLatest ? 'border-accent/30' : 'border-neutral-800'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isError ? 'bg-error' : 'bg-success'}`}></span>
          <span className="text-xs font-mono text-neutral-300">{trace.traceId.slice(0, 8)}</span>
          {isLatest && (
            <span className="text-[10px] px-1.5 py-0.5 bg-accent/10 text-accent rounded">Latest</span>
          )}
        </div>
        <span className="text-xs text-neutral-500">{formatTime(trace.timestamp)}</span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="text-neutral-500">{trace.modelUsed || trace.modelRequested}</span>
        </div>
        <div className="flex items-center gap-3 text-neutral-500">
          <span>{formatTokens((trace.inputTokens || 0) + (trace.outputTokens || 0))} tok</span>
          <span>{formatLatency(trace.latencyMs)}</span>
          <span>{formatCost(trace.costCents)}</span>
        </div>
      </div>
    </div>
  );
}

export default function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSession = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getSession(id);
      setSession(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingSpinner text="Loading session..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-rose-400 mb-4">{error}</div>
          <button
            onClick={fetchSession}
            className="px-4 py-2 bg-accent text-white rounded hover:bg-accent/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-neutral-100 mb-2">Session not found</h1>
          <p className="text-neutral-500 mb-6">The session you're looking for doesn't exist.</p>
          <Link
            to="/sessions"
            className="text-accent hover:underline"
          >
            Back to Sessions
          </Link>
        </div>
      </div>
    );
  }

  const traces = [...session.traces].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const stats = calculateSessionStats(traces);
  const firstTrace = traces[0];
  const user = firstTrace?.metadata?.user as string | undefined;
  const feature = firstTrace?.metadata?.feature as string | undefined;
  const environment = firstTrace?.metadata?.environment as string | undefined;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-14 flex items-center justify-between px-6 border-b border-neutral-800 flex-shrink-0 bg-neutral-950">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/sessions')}
            className="p-1.5 hover:bg-neutral-800 rounded text-neutral-500 hover:text-white transition-colors"
            title="Back to Sessions"
          >
            <BackIcon />
          </button>
          <span className="text-sm font-mono text-accent">{session.session_id}</span>
          <CopyButton text={session.session_id} />
          {stats.errorCount > 0 ? (
            <span className="text-xs px-1.5 py-0.5 bg-error/10 text-error rounded">
              {stats.errorCount} Error{stats.errorCount > 1 ? 's' : ''}
            </span>
          ) : (
            <span className="text-xs px-1.5 py-0.5 bg-success/10 text-success rounded">OK</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/traces?session_id=${session.session_id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-accent hover:text-accent/80 transition-colors"
          >
            <ExternalLinkIcon />
            View in Traces
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto p-6">
          {/* Stats Grid */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 mb-6">
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center">
                <div className="text-lg font-semibold">{stats.traceCount}</div>
                <div className="text-xs text-neutral-500">Traces</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold">{formatTokens(stats.totalTokens)}</div>
                <div className="text-xs text-neutral-500">Tokens</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-accent">{formatCost(stats.totalCost)}</div>
                <div className="text-xs text-neutral-500">Cost</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold">{stats.duration}</div>
                <div className="text-xs text-neutral-500">Duration</div>
              </div>
            </div>
          </div>

          {/* Metadata */}
          {(user || feature || environment || firstTrace) && (
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl px-5 py-4 mb-6">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {user && (
                  <div>
                    <span className="text-neutral-500">User</span>
                    <div className="font-mono text-xs mt-1">{user}</div>
                  </div>
                )}
                {feature && (
                  <div>
                    <span className="text-neutral-500">Feature</span>
                    <div className="text-xs mt-1">{feature}</div>
                  </div>
                )}
                {firstTrace && (
                  <div>
                    <span className="text-neutral-500">Started</span>
                    <div className="text-xs mt-1">{formatDate(firstTrace.timestamp)}</div>
                  </div>
                )}
                {environment && (
                  <div>
                    <span className="text-neutral-500">Environment</span>
                    <div className="text-xs mt-1">{environment}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Traces Timeline */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium">Traces</h3>
            </div>

            {traces.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center bg-neutral-900 border border-neutral-800 rounded-xl">
                <svg className="w-12 h-12 text-neutral-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
                <h3 className="text-sm font-medium text-neutral-400 mb-1">No traces in this session</h3>
                <p className="text-xs text-neutral-500">Traces will appear here once recorded</p>
              </div>
            ) : (
              <div className="relative">
                {/* Timeline connector line */}
                <div className="absolute left-[7px] top-4 bottom-4 w-[2px] bg-neutral-800"></div>

                <div className="space-y-2 relative">
                  {traces.map((trace, index) => (
                    <div key={trace.traceId} className="relative pl-6">
                      {/* Timeline dot */}
                      <div className={`absolute left-0 top-4 w-4 h-4 rounded-full border-2 ${
                        trace.status === 'error'
                          ? 'bg-error/20 border-error'
                          : 'bg-success/20 border-success'
                      }`}></div>

                      <TraceCard
                        trace={trace}
                        isLatest={index === traces.length - 1}
                        onClick={() => navigate(`/traces/${trace.traceId}`)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
