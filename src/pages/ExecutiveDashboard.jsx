import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ConnectionStatus from '../components/ConnectionStatus';
import DashboardHeader from '../components/DashboardHeader';
import DirectiveDesk from '../components/DirectiveDesk';
import ExecutiveCommsHub from '../components/ExecutiveCommsHub';
import MetricGrid from '../components/MetricGrid';
import OperationsView from '../components/OperationsView';
import PhaseGates from '../components/PhaseGates';
import Sidebar from '../components/Sidebar';
import TelemetryPanel from '../components/TelemetryPanel';
import { useTelemetry } from '../hooks/useTelemetry';
import { useRealtimeTelemetry } from '../hooks/useRealtime';
import { readSession, SESSION_KEY } from '../routes/AppRouter';

function ExecutiveDashboard() {
  const [active, setActive] = useState('overview');
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState('');
  const [lastSync, setLastSync] = useState('Now');
  const navigate = useNavigate();
  const session = useMemo(() => readSession() || {}, []);
  const { events, status, error, lastUpdated, refresh } = useTelemetry();
  const { metrics } = useRealtimeTelemetry();

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
    <div className={`flex h-screen overflow-hidden bg-[#07100f] ${collapsed ? 'nav-collapsed' : ''}`}>
      <Sidebar
        active={active}
        collapsed={collapsed}
        onNavigate={setActive}
        onToggle={() => setCollapsed((value) => !value)}
        onLogout={logout}
      />
      <main className="flex-1 flex flex-col h-screen overflow-y-auto overflow-x-hidden p-6 md:p-8">
        <DashboardHeader
          role={session.role || 'Executive'}
          search={search}
          onSearch={setSearch}
        />
        <div className="flex flex-wrap items-center gap-4 p-4 mt-6 bg-[rgba(102,227,164,0.05)] border border-[rgba(102,227,164,0.15)] rounded-xl text-xs font-mono text-[#66e3a4]">
          <span className="flex items-center gap-2"><i className="w-2 h-2 rounded-full bg-[#66e3a4] shadow-[0_0_8px_rgba(102,227,164,0.6)]" /> All systems operational</span>
          <span className="flex items-center gap-1.5 opacity-80">Contribution health <b className="text-white">{metrics?.contributionMargin ?? 77.6}%</b></span>
          <span className="flex items-center gap-1.5 opacity-80">Core API <b className="text-white">{metrics?.edgeLatency ?? 84}ms</b></span>
          <span className="flex items-center gap-1.5 opacity-80 ml-auto">Last sync <b className="text-white">{lastSync}</b></span>
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
            <ExecutiveCommsHub />
            <div className="dashboard-grid grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
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
