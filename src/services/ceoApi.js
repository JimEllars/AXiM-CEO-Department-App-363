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
      throw new Error(`Request failed with ${response.status}`);
    }

    return await response.json();
  } finally {
    timeout.cleanup();
  }
}

export async function fetchTelemetry(signal) {
  if (!workerUrl) {
    return { events: [], volatile: true, unavailable: true };
  }

  return requestJson(`${workerUrl}/api/v1/telemetry?limit=25`, {
    signal,
    headers: { Accept: 'application/json' }
  });
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

export function hasWorkerConnection() {
  return Boolean(workerUrl);
}