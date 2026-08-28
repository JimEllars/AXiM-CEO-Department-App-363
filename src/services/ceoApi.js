import { readSession } from '../routes/AppRouter';
const workerUrl = import.meta.env.VITE_CEO_WORKER_URL?.replace(/\/$/, '');
const REQUEST_TIMEOUT_MS = 7000;

function createTimeoutSignal(parentSignal) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const abortParent = () => controller.abort();
  parentSignal?.addEventListener('abort', abortParent, { once: true });

  return {
    signal: controller.signal,
    cleanup: () => {
      window.clearTimeout(timer);
      parentSignal?.removeEventListener('abort', abortParent);
    }
  };
}

async function requestJson(url, options = {}) {
  const timeout = createTimeoutSignal(options.signal);

  try {
    const response = await fetch(url, {
      ...options,
      signal: timeout.signal
    });

    if (!response.ok) {
      if (response.status === 401) {
      window.dispatchEvent(new CustomEvent('session-expired'));
      throw new Error('Unauthorized');
    }
    throw new Error(`Request failed with ${response.status}`);
    }

    return await response.json();
  } finally {
    timeout.cleanup();
  }
}

export async function fetchMetrics(signal) {
  if (!workerUrl) {
    return [];
  }

  try {
    const data = await requestJson(`${workerUrl}/api/v1/metrics`, {
      signal,
      headers: { Accept: "application/json", ...getAuthHeaders() }
    });
    return Array.isArray(data) ? data : [];
  } catch (error) {
    if (error.name !== 'AbortError') console.error('fetchMetrics error:', error);
    return [];
  }
}

export async function fetchTelemetry(signal) {
  if (!workerUrl) {
    return { events: [], volatile: true, unavailable: true };
  }

  try {
    const data = await requestJson(`${workerUrl}/api/v1/telemetry?limit=25`, {
      signal,
      headers: { Accept: 'application/json', ...getAuthHeaders() }
    });
    return {
      ...data,
      events: Array.isArray(data?.events) ? data.events : []
    };
  } catch (error) {
    if (error.name !== 'AbortError') console.error('fetchTelemetry error:', error);
    return { events: [], volatile: true, unavailable: true };
  }
}

export async function fetchWorkerHealth(signal) {
  if (!workerUrl) {
    return { status: 'demo' };
  }

  return requestJson(`${workerUrl}/health`, {
    signal,
    headers: { Accept: 'application/json' }
  });
}


export async function resolveDirective(actionId, resolution, sessionToken) {
  if (!workerUrl) {
    throw new Error('Worker URL not configured');
  }

  const authHeader = sessionToken ? { Authorization: `Bearer ${sessionToken}` } : getAuthHeaders();

  return requestJson(`${workerUrl}/api/v1/hitl-resolve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...authHeader
    },
    body: JSON.stringify({ action_id: actionId, resolution })
  });
}

export function hasWorkerConnection() {
  return Boolean(workerUrl);
}

function getAuthHeaders() {
  const session = readSession();
  const token = session?.token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
