import React, { useState, useMemo, useEffect, useRef } from 'react';
import * as FiIcons from 'react-icons/fi';
import { motion } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import PanelDetailsModal from './PanelDetailsModal';
import { useRealtimeTelemetry } from '../hooks/useRealtime';

const { FiArrowUpRight, FiCheckCircle, FiClock, FiRadio } = FiIcons;

// Extracted MetricRow for silent rendering
const MetricRow = React.memo(({ row, icon, onClick }) => {
  const [pulse, setPulse] = useState(false);
  const prevValue = useRef(row.value || row.conversion || row.detail);
  const prevProgress = useRef(row.progress);

  useEffect(() => {
    const currentValue = row.value || row.conversion || row.detail;
    if (prevValue.current !== currentValue || prevProgress.current !== row.progress) {
      setPulse(true);
      const timer = setTimeout(() => setPulse(false), 1000);
      prevValue.current = currentValue;
      prevProgress.current = row.progress;
      return () => clearTimeout(timer);
    }
  }, [row.value, row.conversion, row.detail, row.progress]);

  return (
    <motion.article
      role="button"
      tabIndex="0"
      onClick={() => onClick(row)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onClick(row);
      }}
      initial={false}
      animate={{ backgroundColor: pulse ? 'rgba(102,227,164,0.1)' : 'transparent' }}
      transition={{ duration: 0.5 }}
      style={{
        padding: '16px',
        borderBottom: '1px solid rgba(199,224,213,0.11)',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        cursor: 'pointer'
      }}
      className="hover:bg-[rgba(199,224,213,0.05)] transition-colors"
    >
      <div className="row-title" style={{ flex: '1', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span className="row-icon" style={{ color: '#84958e' }}><SafeIcon icon={icon} /></span>
        <div>
          <b style={{ display: 'block', color: '#e8efeb', fontSize: '14px' }}>{row.name}</b>
          <small style={{ color: '#84958e', fontSize: '12px' }}>{row.owner || row.type || row.metric}</small>
        </div>
      </div>

      <span className="row-value" style={{ fontWeight: '600', color: '#e8efeb' }}>
        {row.value || row.conversion || row.detail}
      </span>

      <span className={`row-status ${row.status.toLowerCase().replaceAll(' ', '-')}`} style={{
        padding: '4px 8px',
        borderRadius: '999px',
        fontSize: '12px',
        fontWeight: 'bold',
        marginLeft: '16px'
      }}>
        {row.status}
      </span>

      {row.progress !== undefined && (
        <div className="row-progress" style={{ width: '100px', height: '6px', backgroundColor: 'rgba(199,224,213,0.1)', borderRadius: '3px', overflow: 'hidden', marginLeft: '16px' }}>
          <i style={{ display: 'block', height: '100%', width: `${row.progress}%`, backgroundColor: '#66e3a4' }} />
        </div>
      )}
    </motion.article>
  );
}, (prevProps, nextProps) => {
  // Silent rendering: only re-render if value, status, or progress changed
  return (
    prevProps.row.value === nextProps.row.value &&
    prevProps.row.conversion === nextProps.row.conversion &&
    prevProps.row.detail === nextProps.row.detail &&
    prevProps.row.status === nextProps.row.status &&
    prevProps.row.progress === nextProps.row.progress
  );
});

function mapMetricsToRows(rows, metrics, kind) {
  // Here we dynamically override values from static rows with live telemetry metrics
  // while keeping the structure intact.
  return rows.map(row => {
    let updatedRow = { ...row };

    if (kind === 'onyx') {
      if (row.name.includes('desktop-east')) {
        updatedRow.detail = `Last action ${Math.floor(metrics.executionCounts / 10)}s ago`;
        updatedRow.status = metrics.activeAgents > 0 ? 'Active' : 'Connected';
      }
      if (row.name === 'lead_scoring') {
        updatedRow.status = metrics.blockedThreats > 5 ? 'Review' : 'Enabled';
      }
    } else if (kind === 'growth') {
      if (row.name === 'Standalone digital packs') {
         updatedRow.progress = Math.min(100, Math.max(0, 48 + (metrics.activeAgents * 2)));
      }
      if (row.name === 'Affiliate fraud review') {
         updatedRow.value = `${metrics.blockedThreats} alerts`;
         updatedRow.status = metrics.blockedThreats > 0 ? 'Review' : 'Healthy';
      }
    } else if (kind === 'marketing') {
      if (row.name === 'Growth Blueprint clusters') {
        const visits = (18.4 + (metrics.executionCounts / 100)).toFixed(1);
        updatedRow.metric = `${visits}k visits`;
      }
      if (row.name === 'Day 0–30 nurture') {
        updatedRow.status = metrics.echoDlq > 0 ? 'Needs attention' : 'Monitor';
      }
    }

    return updatedRow;
  });
}

function DepartmentPanel({ title, kicker, rows: initialRows, kind }) {
  const { metrics } = useRealtimeTelemetry();
  const [selected, setSelected] = useState(null);
  const icon = kind === 'onyx' ? FiRadio : kind === 'marketing' ? FiClock : FiCheckCircle;

  const liveRows = useMemo(() => {
    return mapMetricsToRows(initialRows, metrics, kind);
  }, [initialRows, metrics, kind]);

  return (
    <>
      <section className="panel department-panel bg-[#101e1b] border border-[rgba(199,224,213,0.11)] rounded-2xl shadow-xl overflow-hidden">
        <div className="panel-heading p-6 flex justify-between items-center border-b border-[rgba(199,224,213,0.11)]">
          <div>
            <span className="kicker block text-[#66e3a4] text-xs font-mono tracking-widest uppercase mb-1">{kicker}</span>
            <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          </div>
          <button
            className="text-button flex items-center gap-2 px-4 py-2 bg-[rgba(102,227,164,0.1)] text-[#66e3a4] rounded-lg text-sm font-semibold transition-colors hover:bg-[rgba(102,227,164,0.2)] disabled:opacity-50"
            type="button"
            onClick={() => setSelected(liveRows[0])}
            disabled={!liveRows.length}
          >
            Open matrix <SafeIcon icon={FiArrowUpRight} />
          </button>
        </div>
        <div className="department-table flex flex-col">
          {liveRows.map((row) => (
            <MetricRow
              key={row.name}
              row={row}
              icon={icon}
              onClick={setSelected}
            />
          ))}
        </div>
      </section>
      <PanelDetailsModal item={selected} onClose={() => setSelected(null)} />
    </>
  );
}

export default DepartmentPanel;
