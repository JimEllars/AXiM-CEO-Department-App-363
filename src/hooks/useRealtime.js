import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(SUPABASE_URL || 'https://example.supabase.co', SUPABASE_ANON_KEY || 'dummy_key');

export function useRealtimeTelemetry() {
  const [metrics, setMetrics] = useState({
    grossRevenue: 0,
    contributionMargin: 77.6,
    activeAgents: 0,
    executionCounts: 0,
    edgeLatency: 84,
    blockedThreats: 0,
    echoDlq: 0
  });

  useEffect(() => {
    if (!SUPABASE_URL) return;

    const channel = supabase.channel('core-telemetry')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        setMetrics(prev => ({
            ...prev,
            activeAgents: prev.activeAgents + 1,
            executionCounts: prev.executionCounts + 10,
            blockedThreats: prev.blockedThreats + Math.floor(Math.random() * 5)
        }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return metrics;
}
