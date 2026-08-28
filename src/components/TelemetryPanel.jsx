import React, { useMemo, useState } from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

import PanelDetailsModal from './PanelDetailsModal';

const { FiArrowUpRight, FiRadio } = FiIcons;

function normalizeEvents(events) {
  return events
    .map((item) => {
      const event = item.event || item;

      return {
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
          : 'No payload details were supplied.'
      };
    })
    .filter((item) => item.dept && item.event);
}

function TelemetryPanel({ search = '', events = [] }) {
  const [selected, setSelected] = useState(null);
  const source = useMemo(
    () => normalizeEvents(events),
    [events]
  );
  const query = search.trim().toLowerCase();
  const filtered = source.filter((item) =>
    `${item.dept} ${item.event} ${item.state}`.toLowerCase().includes(query)
  );

  return (
    <>
      <section className="panel telemetry-panel bg-[#101e1b] border border-[rgba(199,224,213,0.11)] rounded-2xl p-6 shadow-xl">
        <div className="panel-heading flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <span className="kicker block text-[#66e3a4] text-xs font-mono tracking-widest uppercase mb-1">Cross-departmental mesh</span>
            <h2 className="text-2xl font-bold tracking-tight">Live telemetry</h2>
          </div>
          <button
            className="text-button flex items-center gap-2 px-4 py-2 bg-[rgba(102,227,164,0.1)] text-[#66e3a4] rounded-lg text-sm font-semibold transition-colors hover:bg-[rgba(102,227,164,0.2)] disabled:opacity-50"
            type="button"
            onClick={() => setSelected(filtered[0] || (source && source[0]))}
            disabled={!source.length}
          >
            Open matrix <SafeIcon icon={FiArrowUpRight} />
          </button>
        </div>
        <div className="telemetry-list space-y-3">
          {filtered.length === 0 && <div className="empty-state text-[#84958e] text-center py-8 font-mono text-sm border border-dashed border-[rgba(199,224,213,0.11)] rounded-lg">No matching signals</div>}
          {filtered.map((item, index) => {
            const department = item.dept.toLowerCase().replaceAll(' ', '-');
            const isHealthy = ['Healthy', 'Resolved'].includes(item.state);

            return (
              <article
                key={`${department}-${item.time}-${index}`}
                role="button"
                tabIndex="0"
                className="group flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl border border-[rgba(199,224,213,0.05)] bg-[#0b1614] hover:border-[rgba(102,227,164,0.3)] transition-all cursor-pointer"
                onClick={() => setSelected(item)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') setSelected(item);
                }}
              >
                <span className={`department-badge flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-lg font-mono text-xs font-bold ${department === "cfo" ? "bg-blue-900/30 text-blue-400" : department === "onyx" ? "bg-purple-900/30 text-purple-400" : "bg-emerald-900/30 text-emerald-400"}`}>
                  {item.dept}
                </span>
                <div className="flex-1 min-w-0">
                  <b className="block text-sm font-semibold text-[#e8efeb] truncate">{item.event}</b>
                  <small className="block text-xs text-[#84958e] mt-1">{item.time} · AXiM Core</small>
                </div>
                <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono whitespace-nowrap ${isHealthy ? "bg-[rgba(102,227,164,0.1)] text-[#66e3a4]" : "bg-[rgba(242,185,107,0.1)] text-[#f2b96b]"}`}>
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