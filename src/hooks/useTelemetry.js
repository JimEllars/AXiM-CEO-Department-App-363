import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchTelemetry, hasWorkerConnection } from '../services/ceoApi';

export function useTelemetry() {
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState(hasWorkerConnection() ? 'connecting' : 'demo');
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const requestRef = useRef(null);

  const refresh = useCallback(async (externalSignal) => {
    if (!hasWorkerConnection()) {
      setStatus('demo');
      setError('');
      return;
    }

    requestRef.current?.abort();

    const controller = new AbortController();
    requestRef.current = controller;

    if (externalSignal) {
      if (externalSignal.aborted) {
        controller.abort();
      } else {
        externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
      }
    }

    setStatus((current) => current === 'connected' ? current : 'connecting');

    try {
      const result = await fetchTelemetry(controller.signal);
      setEvents(Array.isArray(result.events) ? result.events : []);
      setStatus('connected');
      setError('');
      setLastUpdated(new Date());
    } catch (requestError) {
      if (requestError.name !== 'AbortError') {
        setStatus('offline');
        setError('Worker telemetry is unavailable.');
      }
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    refresh(controller.signal);
    const timer = window.setInterval(() => refresh(), 15000);

    return () => {
      controller.abort();
      requestRef.current?.abort();
      window.clearInterval(timer);
    };
  }, [refresh]);

  return { events, status, error, lastUpdated, refresh };
}