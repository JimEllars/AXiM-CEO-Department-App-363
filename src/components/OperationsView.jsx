import React from 'react';
import DepartmentPanel from './DepartmentPanel';
import { growthRows, marketingRows, onyxRows } from '../data/dashboardData';

const viewConfig = {
  growth: { title: 'Business development', kicker: 'Growth hub / Partnerships', rows: growthRows, kind: 'growth' },
  marketing: { title: 'Marketing clusters', kicker: 'Demand engine / Acquisition', rows: marketingRows, kind: 'marketing' },
  onyx: { title: 'Onyx AI oversight', kicker: 'Governance / Agent fleet', rows: onyxRows, kind: 'onyx' }
};

function OperationsView({ view }) {
  const config = viewConfig[view] || viewConfig.growth;

  return (
    <div className="operations-view">
      <div className="view-intro">
        <span className="eyebrow">Department workspace</span>
        <h2>{config.title}</h2>
        <p>Monitor live signals, review operating thresholds, and coordinate the next executive action.</p>
      </div>
      <DepartmentPanel {...config} />
      <div className="panel insight-panel">
        <span className="kicker">Operating note</span>
        <h3>{view === 'onyx' ? 'Human approval remains required for privileged actions.' : 'Performance is within the current operating envelope.'}</h3>
        <p>Data shown here is a local operating snapshot until the AXiM Core realtime endpoint is connected.</p>
      </div>
    </div>
  );
}

export default OperationsView;