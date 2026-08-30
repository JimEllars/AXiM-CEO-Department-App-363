import React, { useState } from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { phases as initialPhases } from '../data/dashboardData';
import { submitGateDecision } from '../services/ceoApi';

const { FiCheck, FiLock } = FiIcons;

function PhaseGates() {
  const [phases, setPhases] = useState(initialPhases);
  const [loadingGate, setLoadingGate] = useState(null);

  const handleDecision = async (phase, decision) => {
    setLoadingGate(phase.name);
    try {
      await submitGateDecision({
        gate_id: phase.name.toLowerCase(),
        decision,
        notes: `Decision ${decision} made from dashboard`
      });

      setPhases(current =>
        current.map(p =>
          p.name === phase.name ? { ...p, state: decision === 'APPROVE' ? 'APPROVED' : p.state } : p
        )
      );
    } catch (err) {
      console.error('Failed to submit decision:', err);
    } finally {
      setLoadingGate(null);
    }
  };

  const activePhasesCount = phases.filter(p => p.state === 'Live' || p.state === 'APPROVED').length;

  return (
    <section className="panel phase-panel">
      <div className="panel-heading">
        <div><span className="kicker">Strategy execution</span><h2>Phase gates</h2></div>
        <span className="status-chip">{activePhasesCount} / {phases.length} live</span>
      </div>
      <div className="phase-list">
        {phases.map((phase, index) => (
          <article key={phase.name}>
            <span className={`phase-number ${phase.state.toLowerCase()}`}>
              {(phase.state === 'Live' || phase.state === 'APPROVED') ? <SafeIcon icon={FiCheck} /> : index}
            </span>
            <div className="phase-content">
              <div>
                <b>{phase.name}</b>
                <span className="phase-controls">
                  {phase.state === 'Locked' && <SafeIcon icon={FiLock} />}
                  {phase.state}
                  {(phase.state === 'Gated' || phase.state === 'Locked') && (
                    <button
                      className="btn-approve"
                      onClick={() => handleDecision(phase, 'APPROVE')}
                      disabled={loadingGate === phase.name}
                      style={{ marginLeft: '10px', cursor: 'pointer', opacity: loadingGate === phase.name ? 0.5 : 1 }}
                    >
                      {loadingGate === phase.name ? 'Approving...' : 'Approve'}
                    </button>
                  )}
                </span>
              </div>
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