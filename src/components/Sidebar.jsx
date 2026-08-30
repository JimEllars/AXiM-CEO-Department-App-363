import React from 'react';
import * as FiIcons from 'react-icons/fi';
import { FiPhoneCall } from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const {
  FiActivity, FiBriefcase, FiChevronLeft, FiGrid, FiLogOut,
  FiMenu, FiRadio, FiTarget
} = FiIcons;

const navigation = [
  { id: 'overview', label: 'Executive overview', icon: FiGrid },
  { id: 'growth', label: 'Business development', icon: FiBriefcase },
  { id: 'marketing', label: 'Marketing clusters', icon: FiTarget },
  { id: 'onyx', label: 'Onyx AI oversight', icon: FiRadio },
  { id: 'comms', label: 'Comms Hub', icon: FiPhoneCall }
];

function Sidebar({ active, collapsed, onNavigate, onToggle, onLogout }) {
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-brand">
        <span className="brand-mark">A</span>
        {!collapsed && <div><b>AXiM</b><small>CEO Department</small></div>}
      </div>
      <button className="collapse-button" onClick={onToggle} aria-label="Toggle navigation">
        <SafeIcon icon={collapsed ? FiMenu : FiChevronLeft} />
      </button>
      <nav>
        {navigation.map((item) => (
          <button
            className={active === item.id ? 'nav-item active' : 'nav-item'}
            key={item.id}
            onClick={() => onNavigate(item.id)}
            title={item.label}
          >
            <SafeIcon icon={item.icon} />
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <span className="live-indicator"><SafeIcon icon={FiActivity} />{!collapsed && 'Core connected'}</span>
        <button className="nav-item" onClick={onLogout}>
          <SafeIcon icon={FiLogOut} />{!collapsed && <span>End session</span>}
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;