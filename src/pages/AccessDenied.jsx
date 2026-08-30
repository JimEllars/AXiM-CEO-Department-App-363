import React from 'react';
import { Link } from 'react-router-dom';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { SESSION_KEY } from '../routes/AppRouter';

const { FiAlertTriangle } = FiIcons;

function AccessDenied() {
  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY);
  };

  return (
    <main className="access-shell" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ textAlign: 'center', maxWidth: '400px', backgroundColor: 'rgba(0,0,0,0.5)', padding: '2rem', borderRadius: '8px', border: '1px solid rgba(255,0,0,0.2)' }}>
        <SafeIcon icon={FiAlertTriangle} style={{ fontSize: '3rem', color: '#ef4444', marginBottom: '1rem' }} />
        <h1 style={{ marginBottom: '1rem', color: '#fff' }}>Access Denied</h1>
        <p style={{ color: '#aaa', marginBottom: '2rem' }}>
          Your identity is not authorized for the CEO Department Dashboard. This incident has been logged.
        </p>
        <Link to="/access" onClick={handleLogout} className="primary-button" style={{ display: 'inline-block', backgroundColor: '#ef4444', color: 'white', textDecoration: 'none' }}>
          Return to Gateway
        </Link>
      </div>
    </main>
  );
}

export default AccessDenied;
