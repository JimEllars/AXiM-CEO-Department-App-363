import React from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { phases } from '../data/dashboardData';

const { FiCheck, FiLock } = FiIcons;

function PhaseGates() {
  return (
    <section className="panel phase-panel">
      <div className="panel-heading">
        <div><span className="kicker">Strategy execution</span><h2>Phase gates</h2></div>
        <span className="status-chip">2 / 4 live</span>
      </div>
      <div className="phase-list">
        {phases.map((phase, index) => (
          <article key={phase.name}>
            <span className={`phase-number ${phase.state.toLowerCase()}`}>
              {phase.state === 'Live' ? <SafeIcon icon={FiCheck} /> : index}
            </span>
            <div className="phase-content">
              <div><b>{phase.name}</b><span>{phase.state === 'Locked' && <SafeIcon icon={FiLock} />}{phase.state}</span></div>
              <small>{phase.detail}</small>
              <div className="progress-track"><i style={{ width: `${phase.progress}%` }} /></div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default PhaseGates;