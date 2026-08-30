import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { readSession } from '../routes/AppRouter';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(SUPABASE_URL || 'https://example.supabase.co', SUPABASE_ANON_KEY || 'dummy_key');

let sharedChannel = null;
let subscribers = new Set();
let isConnected = false;
let retryCount = 0;
let retryTimeout = null;
let currentMetrics = {
  grossRevenue: 0,
  contributionMargin: 77.6,
  activeAgents: 0,
  executionCounts: 0,
  edgeLatency: 84,
  blockedThreats: 0,
  echoDlq: 0
};

function notify() {
  for (const callback of subscribers) {
    callback({ metrics: currentMetrics, isConnected });
  }
}

function connectRealtime() {
  if (!SUPABASE_URL) return;
  if (sharedChannel) return;

  const session = readSession();
  if (session?.token) {
    supabase.realtime.setAuth(session.token);
  }

  sharedChannel = supabase.channel('ceo_telemetry_stream');

  sharedChannel
    .on('broadcast', { event: '*' }, (payload) => {
      if (payload.payload) {
        currentMetrics = { ...currentMetrics, ...payload.payload };
        notify();
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
      // Keeping a fallback increment for mock/testing if it's just a generic DB change
      if (payload.new && Object.keys(payload.new).length > 0) {
         currentMetrics = { ...currentMetrics, ...payload.new };
      } else {
         currentMetrics = {
            ...currentMetrics,
            activeAgents: currentMetrics.activeAgents + 1,
            executionCounts: currentMetrics.executionCounts + 10,
            blockedThreats: currentMetrics.blockedThreats + Math.floor(Math.random() * 5)
         };
      }
      notify();
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        isConnected = true;
        retryCount = 0;
        notify();
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        isConnected = false;
        notify();
        sharedChannel = null;

        // Exponential backoff
        const delay = Math.min(1000 * (2 ** retryCount), 30000);
        retryCount++;
        clearTimeout(retryTimeout);
        retryTimeout = setTimeout(connectRealtime, delay);
      }
    });
}

function disconnectRealtime() {
  if (subscribers.size === 0) {
    if (sharedChannel) {
      supabase.removeChannel(sharedChannel);
      sharedChannel = null;
    }
    clearTimeout(retryTimeout);
    isConnected = false;
  }
}

export function useRealtimeTelemetry() {
  const [state, setState] = useState({ metrics: currentMetrics, isConnected });

  useEffect(() => {
    subscribers.add(setState);

    if (subscribers.size === 1) {
      connectRealtime();
    }

    return () => {
      subscribers.delete(setState);
      disconnectRealtime();
    };
  }, []);

  return state;
}
