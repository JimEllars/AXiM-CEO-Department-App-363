import React, { useMemo, useState } from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { telemetry as fallbackTelemetry } from '../data/dashboardData';
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
    () => (events.length ? normalizeEvents(events) : fallbackTelemetry),
    [events]
  );
  const query = search.trim().toLowerCase();
  const filtered = source.filter((item) =>
    `${item.dept} ${item.event} ${item.state}`.toLowerCase().includes(query)
  );

  return (
    <>
      <section className="panel telemetry-panel">
        <div className="panel-heading">
          <div>
            <span className="kicker">Cross-departmental mesh</span>
            <h2>Live telemetry</h2>
          </div>
          <button
            className="text-button"
            type="button"
            onClick={() => setSelected(filtered[0] || source[0])}
            disabled={!source.length}
          >
            Open matrix <SafeIcon icon={FiArrowUpRight} />
          </button>
        </div>
        <div className="telemetry-list">
          {filtered.length === 0 && <div className="empty-state">No matching signals</div>}
          {filtered.map((item, index) => {
            const department = item.dept.toLowerCase().replaceAll(' ', '-');
            const isHealthy = ['Healthy', 'Resolved'].includes(item.state);

            return (
              <article
                key={`${department}-${item.time}-${index}`}
                role="button"
                tabIndex="0"
                onClick={() => setSelected(item)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') setSelected(item);
                }}
              >
                <span className={`department-badge dept-${department}`}>
                  {item.dept}
                </span>
                <div>
                  <b>{item.event}</b>
                  <small>{item.time} · AXiM Core</small>
                </div>
                <span className={isHealthy ? 'state healthy' : 'state review'}>
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