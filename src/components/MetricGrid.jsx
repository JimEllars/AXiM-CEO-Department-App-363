import React from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { fetchMetrics } from '../services/ceoApi';
import { useState, useEffect } from 'react';

const { FiArrowUpRight } = FiIcons;

function MetricGrid() {
  const [metrics, setMetrics] = useState([]);

  useEffect(() => {
    const controller = new AbortController();
    fetchMetrics(controller.signal).then(setMetrics).catch(err => {
      if (err.name !== 'AbortError') console.error('Failed to fetch metrics', err);
    });
    return () => controller.abort();
  }, []);

  return (
    <section className="metric-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {metrics.map((metric, index) => (
        <motion.article
          className="metric-card relative p-6 bg-[#101e1b] rounded-xl border border-[rgba(199,224,213,0.11)] overflow-hidden shadow-lg transition-transform hover:-translate-y-1"
          key={metric.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.06 }}
        >
          <div className="metric-top flex justify-between items-center mb-3 text-sm text-[#84958e] font-semibold tracking-wider uppercase">
            <span>{metric.label}</span>
            <span className={`metric-change px-2 py-1 rounded text-xs font-bold ${metric.tone === "green" ? "bg-[rgba(102,227,164,0.1)] text-[#66e3a4]" : metric.tone === "blue" ? "bg-[rgba(117,185,255,0.1)] text-[#75b9ff]" : "bg-[rgba(242,185,107,0.1)] text-[#f2b96b]"}`}>{metric.change}</span>
          </div>
          <strong className="block text-3xl font-bold tracking-tight text-[#e8efeb] mb-4">{metric.value}</strong>
          <div className="spark-bars flex items-end h-10 gap-1 opacity-50">
            {[32, 48, 39, 61, 54, 73, 68, 86].map((height, item) => (
              <i key={item} className="w-full bg-[#66e3a4] rounded-t-sm" style={{ height: `${height}%` }} />
            ))}
          </div>
          <small className="block mt-4 text-xs text-[#84958e] flex items-center gap-1"><SafeIcon icon={FiArrowUpRight} className="text-[#66e3a4]"/> Versus previous period</small>
        </motion.article>
      ))}
    </section>
  );
}

export default MetricGrid;