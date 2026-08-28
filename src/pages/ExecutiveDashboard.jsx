import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ConnectionStatus from '../components/ConnectionStatus';
import DashboardHeader from '../components/DashboardHeader';
import DirectiveDesk from '../components/DirectiveDesk';
import MetricGrid from '../components/MetricGrid';
import OperationsView from '../components/OperationsView';
import PhaseGates from '../components/PhaseGates';
import Sidebar from '../components/Sidebar';
import TelemetryPanel from '../components/TelemetryPanel';
import { useTelemetry } from '../hooks/useTelemetry';
import { readSession, SESSION_KEY } from '../routes/AppRouter';

function ExecutiveDashboard() {
  const [active, setActive] = useState('overview');
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState('');
  const [lastSync, setLastSync] = useState('Now');
  const navigate = useNavigate();
  const session = useMemo(() => readSession() || {}, []);
  const { events, status, error, lastUpdated, refresh } = useTelemetry();

  useEffect(() => {
    const timer = window.setInterval(() => setLastSync('Just now'), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleShortcut = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        document.querySelector('.search-box input')?.focus();
      }

      if (event.key === 'Escape' && document.activeElement?.matches('.search-box input')) {
        document.activeElement.blur();
      }
    };

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  useEffect(() => {
    if (lastUpdated) {
      setLastSync(lastUpdated.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      }));
    }
  }, [lastUpdated]);

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    navigate('/access', { replace: true });
  };

  const overview = active === 'overview';

  return (
    <div className={`dashboard-shell ${collapsed ? 'nav-collapsed' : ''}`}>
      <Sidebar
        active={active}
        collapsed={collapsed}
        onNavigate={setActive}
        onToggle={() => setCollapsed((value) => !value)}
        onLogout={logout}
      />
      <main className="dashboard-main">
        <DashboardHeader
          role={session.role || 'Executive'}
          search={search}
          onSearch={setSearch}
        />
        <div className="system-banner">
          <span><i /> All systems operational</span>
          <span>Contribution health <b>77.6%</b></span>
          <span>Core API <b>84ms</b></span>
          <span>Last sync <b>{lastSync}</b></span>
        </div>
        <ConnectionStatus
          status={status}
          error={error}
          lastUpdated={lastUpdated}
          onRefresh={() => refresh()}
        />
        {overview ? (
          <>
            <MetricGrid />
            <div className="dashboard-grid">
              <TelemetryPanel search={search} events={events} />
              <PhaseGates />
              <DirectiveDesk />
            </div>
          </>
        ) : (
          <OperationsView view={active} />
        )}
      </main>
    </div>
  );
}

export default ExecutiveDashboard;