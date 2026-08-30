import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchTelemetry, hasWorkerConnection } from '../services/ceoApi';
import { useRealtimeTelemetry } from './useRealtime';

export function useTelemetry() {
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState(hasWorkerConnection() ? 'connecting' : 'demo');
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const requestRef = useRef(null);
  const { isConnected: realtimeConnected } = useRealtimeTelemetry();
  const realtimeConnectedRef = useRef(realtimeConnected);

  useEffect(() => {
    realtimeConnectedRef.current = realtimeConnected;
    if (realtimeConnected) {
      setStatus('connected');
      setError('');
    } else if (hasWorkerConnection() && status === 'connected') {
      // Revert to fetching once disconnected if previously connected via realtime
      // (Optional behavior, handled mostly by fallback polling anyway)
    }
  }, [realtimeConnected, status]);

  const refresh = useCallback(async (externalSignal, isBackground = false) => {
    if (!hasWorkerConnection()) {
      setStatus('demo');
      setError('');
      return;
    }

    if (isBackground && realtimeConnectedRef.current) {
       // Skip background polling if realtime is connected
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

    if (!isBackground) {
      setStatus((current) => current === 'connected' ? current : 'connecting');
    }

    try {
      const result = await fetchTelemetry(controller.signal);
      const newEvents = Array.isArray(result.events) ? result.events : [];
      setEvents((prev) => JSON.stringify(prev) !== JSON.stringify(newEvents) ? newEvents : prev);

      // Don't downgrade status from connected if realtime is handling it, but it should be connected either way
      setStatus('connected');
      setError('');
      setLastUpdated(new Date());
    } catch (requestError) {
      if (requestError.name !== 'AbortError') {
        if (requestError.message === 'Unauthorized') {
          setStatus('offline');
          setError('Session Expired. Reconnect to resume live updates.');
        } else {
          setStatus('offline');
          setError('Worker telemetry is unavailable.');
        }
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
    const timer = window.setInterval(() => refresh(undefined, true), 45000);

    return () => {
      controller.abort();
      requestRef.current?.abort();
      window.clearInterval(timer);
    };
  }, [refresh]);

  return { events, status, error, lastUpdated, refresh };
}
