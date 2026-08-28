import React, { useState } from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import PanelDetailsModal from './PanelDetailsModal';

const { FiArrowUpRight, FiCheckCircle, FiClock, FiRadio } = FiIcons;

function DepartmentPanel({ title, kicker, rows, kind }) {
  const [selected, setSelected] = useState(null);
  const icon = kind === 'onyx' ? FiRadio : kind === 'marketing' ? FiClock : FiCheckCircle;

  return (
    <>
      <section className="panel department-panel">
        <div className="panel-heading">
          <div>
            <span className="kicker">{kicker}</span>
            <h2>{title}</h2>
          </div>
          <button
            className="text-button"
            type="button"
            onClick={() => setSelected(rows[0])}
            disabled={!rows.length}
          >
            Open matrix <SafeIcon icon={FiArrowUpRight} />
          </button>
        </div>
        <div className="department-table">
          {rows.map((row) => (
            <article
              key={row.name}
              role="button"
              tabIndex="0"
              onClick={() => setSelected(row)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') setSelected(row);
              }}
            >
              <div className="row-title">
                <span className="row-icon"><SafeIcon icon={icon} /></span>
                <div>
                  <b>{row.name}</b>
                  <small>{row.owner || row.type || row.metric}</small>
                </div>
              </div>
              <span className="row-value">{row.value || row.conversion || row.detail}</span>
              <span className={`row-status ${row.status.toLowerCase().replaceAll(' ', '-')}`}>
                {row.status}
              </span>
              {row.progress !== undefined && (
                <div className="row-progress">
                  <i style={{ width: `${row.progress}%` }} />
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
      <PanelDetailsModal item={selected} onClose={() => setSelected(null)} />
    </>
  );
}

export default DepartmentPanel;