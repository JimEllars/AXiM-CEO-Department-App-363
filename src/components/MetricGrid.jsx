import React from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { metrics } from '../data/dashboardData';

const { FiArrowUpRight } = FiIcons;

function MetricGrid() {
  return (
    <section className="metric-grid">
      {metrics.map((metric, index) => (
        <motion.article
          className="metric-card"
          key={metric.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.06 }}
        >
          <div className="metric-top">
            <span>{metric.label}</span>
            <span className={`metric-change ${metric.tone}`}>{metric.change}</span>
          </div>
          <strong>{metric.value}</strong>
          <div className="spark-bars">
            {[32, 48, 39, 61, 54, 73, 68, 86].map((height, item) => (
              <i key={item} style={{ height: `${height}%` }} />
            ))}
          </div>
          <small><SafeIcon icon={FiArrowUpRight} /> Versus previous period</small>
        </motion.article>
      ))}
    </section>
  );
}

export default MetricGrid;