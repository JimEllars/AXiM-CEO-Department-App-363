import React, { useMemo, useState, useEffect, useRef } from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import PanelDetailsModal from './PanelDetailsModal';

const { FiArrowUpRight, FiRadio } = FiIcons;

function normalizeEvents(events) {
  return (events || [])
    .map((item, index) => {
      const event = item.event || item;

      return {
        id: event.id || item.id || index.toString() + Math.random().toString(),
        dept: event.source_department || item.dept || 'CORE',
        event: event.event_type || item.event || 'Telemetry signal',
        time: item.received_at ? 'received live' : item.time || 'recently',
        state: item.resolved
          ? 'Resolved'
          : event.priority === 'CRITICAL'
            ? 'Critical'
            : item.state || 'Review',
        context: event.payload
          ? JSON.stringify(event.payload)
          : 'No payload details were supplied.',
        raw: item
      };
    })
    .filter((item) => item.dept && item.event);
}

function TelemetryPanel({ search = '', events = [] }) {
  const [selected, setSelected] = useState(null);
  const [stream, setStream] = useState([]);
  const listRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Bind live events and implement aggressive state capping (max 100)
  useEffect(() => {
    setStream(prev => {
      const normalized = normalizeEvents(events);
      // We assume `events` contains the latest batch or the full list updated by useTelemetry.
      // We will merge and keep the top 100.

      const combined = [...normalized, ...prev];
      // Deduplicate by id if possible, otherwise just use combination
      const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());

      return unique.slice(0, 100);
    });
  }, [events]);

  const source = stream;

  const query = search.trim().toLowerCase();
  const filtered = useMemo(() => source.filter((item) =>
    `${item.dept} ${item.event} ${item.state}`.toLowerCase().includes(query)
  ), [source, query]);

  // Smooth auto-scrolling
  const handleScroll = () => {
    if (!listRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    // Check if scrolled up
    if (scrollTop < 0) { // Since flex-col might render differently, wait, normal scrolling:
      // In a normal list, scrolling up means scrollTop < scrollHeight - clientHeight
    }
  };

  useEffect(() => {
    if (autoScroll && listRef.current) {
      listRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }, [stream, autoScroll]);

  return (
    <>
      <section className="panel telemetry-panel backdrop-blur-md bg-slate-900/85 border border-slate-800 rounded-2xl p-6 shadow-xl shadow-black/40 flex flex-col h-full max-h-[600px]">
        <div className="panel-heading flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 shrink-0">
          <div>
            <span className="kicker block text-[#66e3a4] text-xs font-mono tracking-widest uppercase mb-1">Cross-departmental mesh</span>
            <h2 className="text-2xl font-bold tracking-tight">Live telemetry</h2>
          </div>
          <button
            className="text-button flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-lg text-sm font-semibold transition-colors hover:bg-[rgba(102,227,164,0.2)] disabled:opacity-50"
            type="button"
            onClick={() => setSelected(filtered[0] || (source && source[0]))}
            disabled={!source.length}
          >
            Open matrix <SafeIcon icon={FiArrowUpRight} />
          </button>
        </div>
        <div
          className="telemetry-list space-y-3 overflow-y-auto flex-1 pr-2"
          ref={listRef}
          onScroll={(e) => {
            const { scrollTop } = e.currentTarget;
            if (scrollTop > 50) {
              setAutoScroll(false);
            } else if (scrollTop === 0) {
              setAutoScroll(true);
            }
          }}
        >
          {filtered.length === 0 && <div className="empty-state text-[#84958e] text-center py-8 font-mono text-sm border border-dashed border-[rgba(199,224,213,0.11)] rounded-lg">No matching signals</div>}
          {filtered.map((item, index) => {
            const department = item.dept.toLowerCase().replaceAll(' ', '-');
            const isHealthy = ['Healthy', 'Resolved'].includes(item.state);
            const isCritical = ['Critical', 'Error'].includes(item.state) || item.state.toLowerCase().includes('dlq');

            // Subtle background categorization
            let bgClass = "bg-[#0b1614]";
            let borderClass = "border-[rgba(199,224,213,0.05)]";
            let hoverBorderClass = "hover:border-[rgba(102,227,164,0.3)]";

            if (isCritical || department === 'asguard') {
              bgClass = "bg-[rgba(239,68,68,0.05)]"; // subtle red
              borderClass = "border-[rgba(239,68,68,0.1)]";
              hoverBorderClass = "hover:border-[rgba(239,68,68,0.4)]";
            } else if (isHealthy) {
              bgClass = "bg-[rgba(102,227,164,0.02)]"; // subtle green
              borderClass = "border-[rgba(102,227,164,0.05)]";
            }

            return (
              <article
                key={`${item.id}-${index}`}
                role="button"
                tabIndex="0"
                className={`group flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl border ${bgClass} ${borderClass} ${hoverBorderClass} transition-all cursor-pointer`}
                onClick={() => setSelected(item)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') setSelected(item);
                }}
              >
                <span className={`department-badge flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-lg font-mono text-xs font-bold ${department === "cfo" ? "bg-blue-900/30 text-blue-400" : department === "onyx" ? "bg-purple-900/30 text-purple-400" : department === "asguard" || isCritical ? "bg-red-900/30 text-red-400" : "bg-emerald-900/30 text-emerald-400"}`}>
                  {item.dept}
                </span>
                <div className="flex-1 min-w-0">
                  <b className="block text-sm font-semibold text-[#e8efeb] truncate">{item.event}</b>
                  <small className="block text-xs text-[#84958e] mt-1">{item.time} · AXiM Core</small>
                </div>
                <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono whitespace-nowrap ${isHealthy ? "bg-[rgba(102,227,164,0.1)] text-[#66e3a4]" : isCritical ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400"}`}>
                  <SafeIcon icon={FiRadio} /> {item.state}
                </span>
              </article>
            );
          })}
        </div>
      </section>
      <PanelDetailsModal item={selected} onClose={() => setSelected(null)} />
    </>
  );
}

export default TelemetryPanel;
