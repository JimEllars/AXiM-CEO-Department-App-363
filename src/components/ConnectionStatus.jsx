import React from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiCloudOff, FiLoader, FiRefreshCw, FiWifi } = FiIcons;

function ConnectionStatus({ status, error, lastUpdated, onRefresh }) {
  const connected = status === 'connected';
  const offline = status === 'offline';
  const connecting = status === 'connecting';

  const label = connected
    ? `Worker connected${lastUpdated ? ` · ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}`
    : offline
      ? error
      : connecting
        ? 'Connecting to AXiM Core'
        : 'Local operating snapshot';

  return (
    <div className={`connection-status ${status}`} role="status" aria-live="polite">
      <SafeIcon icon={connected ? FiWifi : connecting ? FiLoader : FiCloudOff} />
      <span>{label}</span>
      {offline && (
        <button type="button" onClick={onRefresh} aria-label="Retry worker connection">
          <SafeIcon icon={FiRefreshCw} />
        </button>
      )}
    </div>
  );
}

export default ConnectionStatus;