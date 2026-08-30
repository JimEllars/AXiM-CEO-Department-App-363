import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { useRealtimeTelemetry } from '../hooks/useRealtime';
import { fetchMetrics } from '../services/ceoApi';

const { FiArrowUpRight } = FiIcons;

function MetricGrid() {
  const { metrics: realtimeMetrics, isConnected } = useRealtimeTelemetry();
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const requestRef = useRef(null);
  const isConnectedRef = useRef(isConnected);

  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);

  const fetchLatestMetrics = useCallback(async (isBackground = false) => {
    if (isBackground && isConnectedRef.current) {
        return; // Skip background polling if websocket is connected
    }

    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;

    if (!isBackground) {
      setLoading(true);
    }

    try {
      const data = await fetchMetrics(controller.signal);
      setMetrics((prev) => JSON.stringify(prev) !== JSON.stringify(data) ? data : prev);
      setLoading(false);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setLoading(false);
      }
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    fetchLatestMetrics();
    const timer = window.setInterval(() => fetchLatestMetrics(true), 45000);
    return () => {
      requestRef.current?.abort();
      window.clearInterval(timer);
    };
  }, [fetchLatestMetrics]);

  if (loading) {
    return (
      <section className="metric-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="metric-card relative p-6 bg-[#101e1b] rounded-xl border border-[rgba(199,224,213,0.11)] overflow-hidden shadow-lg animate-pulse h-[178px]"
          >
            <div className="flex justify-between items-center mb-4">
              <div className="h-4 bg-[#84958e]/20 rounded w-1/2"></div>
              <div className="h-4 bg-[#84958e]/20 rounded w-1/4"></div>
            </div>
            <div className="h-8 bg-[#e8efeb]/20 rounded w-1/3 mb-4"></div>
            <div className="flex items-end h-10 gap-1 opacity-50">
              <div className="w-full bg-[#66e3a4]/20 rounded-t-sm h-[30%]"></div>
              <div className="w-full bg-[#66e3a4]/20 rounded-t-sm h-[50%]"></div>
              <div className="w-full bg-[#66e3a4]/20 rounded-t-sm h-[40%]"></div>
              <div className="w-full bg-[#66e3a4]/20 rounded-t-sm h-[60%]"></div>
              <div className="w-full bg-[#66e3a4]/20 rounded-t-sm h-[55%]"></div>
              <div className="w-full bg-[#66e3a4]/20 rounded-t-sm h-[75%]"></div>
              <div className="w-full bg-[#66e3a4]/20 rounded-t-sm h-[70%]"></div>
              <div className="w-full bg-[#66e3a4]/20 rounded-t-sm h-[85%]"></div>
            </div>
            <div className="h-3 bg-[#84958e]/20 rounded w-1/2 mt-4"></div>
          </div>
        ))}
      </section>
    );
  }

  if (!metrics || metrics.length === 0) {
    return (
      <section className="metric-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="metric-card relative p-6 bg-[#101e1b] rounded-xl border border-[rgba(199,224,213,0.11)] overflow-hidden shadow-lg h-[178px]"
          >
            <div className="metric-top flex justify-between items-center mb-3 text-sm text-[#84958e] font-semibold tracking-wider uppercase">
              <span>---</span>
              <span className="metric-change px-2 py-1 rounded text-xs font-bold bg-[rgba(199,224,213,0.1)] text-[#84958e]">---</span>
            </div>
            <strong className="block text-3xl font-bold tracking-tight text-[#e8efeb] mb-4">---</strong>
          </div>
        ))}
      </section>
    );
  }

  return (
    <section className="metric-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {metrics.map((metric, index) => {
        let displayValue = metric.value;
        if (metric.label.toLowerCase().includes('revenue')) {
           displayValue = '$' + (realtimeMetrics.grossRevenue || parseInt(metric.value.replace(/[^0-9]/g, '')) || 0).toLocaleString();
        } else if (metric.label.toLowerCase().includes('margin')) {
           displayValue = realtimeMetrics.contributionMargin + '%';
        } else if (metric.label.toLowerCase().includes('agent')) {
           displayValue = realtimeMetrics.activeAgents.toString();
        }

        return (
          <motion.article
            className="metric-card relative p-6 bg-[#101e1b] rounded-xl border border-[rgba(199,224,213,0.11)] overflow-hidden shadow-lg transition-transform hover:-translate-y-1 h-[178px]"
            key={metric.label || index}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
          >
            <div className="metric-top flex justify-between items-center mb-3 text-sm text-[#84958e] font-semibold tracking-wider uppercase">
              <span>{metric.label}</span>
              <span className={`metric-change px-2 py-1 rounded text-xs font-bold ${metric.tone === "green" ? "bg-[rgba(102,227,164,0.1)] text-[#66e3a4]" : metric.tone === "blue" ? "bg-[rgba(117,185,255,0.1)] text-[#75b9ff]" : "bg-[rgba(242,185,107,0.1)] text-[#f2b96b]"}`}>{metric.change}</span>
            </div>
            <strong className="block text-3xl font-bold tracking-tight text-[#e8efeb] mb-4">{displayValue}</strong>
            <div className="spark-bars flex items-end h-10 gap-1 opacity-50">
              {[32, 48, 39, 61, 54, 73, 68, 86].map((height, item) => (
                <i key={item} className="w-full bg-[#66e3a4] rounded-t-sm" style={{ height: `${height}%` }} />
              ))}
            </div>
            <small className="block mt-4 text-xs text-[#84958e] flex items-center gap-1"><SafeIcon icon={FiArrowUpRight} className="text-[#66e3a4]"/> Versus previous period</small>
          </motion.article>
        );
      })}
    </section>
  );
}

export default MetricGrid;
