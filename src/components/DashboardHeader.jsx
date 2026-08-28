import React, { useState } from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiBell, FiCheck, FiChevronDown, FiCommand, FiSearch } = FiIcons;

function DashboardHeader({ role, search, onSearch }) {
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="dashboard-header">
      <div>
        <span className="eyebrow">Command center / Live</span>
        <h1>Good morning, Executive.</h1>
      </div>
      <div className="header-actions">
        <label className="search-box">
          <SafeIcon icon={FiSearch} />
          <input
            aria-label="Search command center"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search telemetry..."
          />
          <kbd><SafeIcon icon={FiCommand} /> K</kbd>
        </label>
        <div className="notification-wrap">
          <button
            className="icon-button"
            type="button"
            aria-label="Notifications"
            aria-expanded={showNotifications}
            onClick={() => setShowNotifications((value) => !value)}
          >
            <SafeIcon icon={FiBell} />
            <span className="notification-dot" />
          </button>
          {showNotifications && (
            <div className="notification-popover" role="status">
              <b>Command center status</b>
              <p><SafeIcon icon={FiCheck} /> No unread system notices.</p>
            </div>
          )}
        </div>
        <button className="profile-button" type="button" aria-label={`Current role: ${role}`}>
          <span>AX</span>
          <div><b>Executive</b><small>{role}</small></div>
          <SafeIcon icon={FiChevronDown} />
        </button>
      </div>
    </header>
  );
}

export default DashboardHeader;