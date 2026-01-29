const getBaseUrl = (): string => {
  return import.meta.env.VITE_API_BASE_URL || window.location.origin;
};

const getAuthHeaders = (): HeadersInit => {
  const apiKey = localStorage.getItem('pulse_api_key');
  return apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
};

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const errorText = await response.text();
    let message = `Request failed with status ${response.status}`;
    try {
      const errorJson = JSON.parse(errorText);
      message = errorJson.error || errorJson.message || message;
    } catch {
      if (errorText) message = errorText;
    }
    throw new Error(message);
  }
  return response.json();
};

export interface GetTracesParams {
  session_id?: string;
  provider?: string;
  model?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

export interface Trace {
  traceId: string;
  timestamp: string;
  provider: 'openai' | 'anthropic' | 'openrouter';
  modelRequested: string;
  modelUsed: string;
  latencyMs: number;
  status: 'success' | 'error';
  costCents: number;
  sessionId?: string;
  metadata?: Record<string, unknown>;
  requestBody?: unknown;
  responseBody?: unknown;
  error?: unknown;
  inputTokens?: number;
  outputTokens?: number;
  outputText?: string;
  finishReason?: string;
}

export interface TracesResponse {
  traces: Trace[];
  total: number;
}

export interface Session {
  session_id: string;
  traces: Trace[];
}

export interface GetAnalyticsParams {
  date_from?: string;
  date_to?: string;
  group_by?: 'day' | 'hour' | 'model' | 'provider';
}

export interface CostOverTimeByProvider {
  period: string;
  provider: string;
  costCents: number;
}

export interface CostByProvider {
  provider: string;
  costCents: number;
  requests: number;
}

export interface StatsByModel {
  provider: string;
  model: string;
  requests: number;
  costCents: number;
  avgLatency: number;
  totalTokens: number;
  errorRate: number;
}

export interface LatencyBucket {
  bucket: string;
  count: number;
}

export interface TotalTokens {
  input: number;
  output: number;
  total: number;
}

export interface ComputedMetrics {
  costPerRequest: number;
  tokensPerRequest: number;
  costPer1kTokens: number;
  tracesPerSession: number;
  avgInputTokens: number;
  avgOutputTokens: number;
}

export interface AnalyticsResponse {
  totalCost: number;
  totalRequests: number;
  totalSessions: number;
  totalTokens: TotalTokens;
  avgLatency: number;
  errorRate: number;
  costOverTime: CostOverTimeByProvider[];
  costByProvider: CostByProvider[];
  topModels: StatsByModel[];
  computed: ComputedMetrics;
}

export interface Project {
  project_id: string;
  name: string;
  api_key: string;
  created_at: string;
}

export interface ApiKeyInfo {
  id: string;
  projectId: string;
  projectName: string;
  createdAt: string;
}

export interface ApiKeysResponse {
  keys: ApiKeyInfo[];
}

export const getTraces = async (params: GetTracesParams = {}): Promise<TracesResponse> => {
  const url = new URL(`${getBaseUrl()}/v1/traces`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url.toString(), {
    headers: getAuthHeaders(),
  });
  return handleResponse<TracesResponse>(response);
};

export const getTrace = async (id: string): Promise<Trace> => {
  const response = await fetch(`${getBaseUrl()}/v1/traces/${id}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse<Trace>(response);
};

export const getSession = async (id: string): Promise<Session> => {
  const response = await fetch(`${getBaseUrl()}/v1/sessions/${id}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse<Session>(response);
};

export const getAnalytics = async (params: GetAnalyticsParams = {}): Promise<AnalyticsResponse> => {
  const url = new URL(`${getBaseUrl()}/v1/analytics`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url.toString(), {
    headers: getAuthHeaders(),
  });
  return handleResponse<AnalyticsResponse>(response);
};

export const createProject = async (name: string): Promise<Project> => {
  const response = await fetch(`${getBaseUrl()}/admin/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ name }),
  });
  return handleResponse<Project>(response);
};

export const getApiKeys = async (): Promise<ApiKeysResponse> => {
  const response = await fetch(`${getBaseUrl()}/admin/api-keys`, {
    headers: getAuthHeaders(),
  });
  return handleResponse<ApiKeysResponse>(response);
};

export const deleteApiKey = async (keyId: string): Promise<{ success: boolean }> => {
  const response = await fetch(`${getBaseUrl()}/admin/api-keys/${keyId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return handleResponse<{ success: boolean }>(response);
};
