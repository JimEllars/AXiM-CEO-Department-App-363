import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AccessGateway from '../pages/AccessGateway';
import ExecutiveDashboard from '../pages/ExecutiveDashboard';

const SESSION_KEY = 'axim-demo-session';
const VALID_ROLES = new Set([
  'Chief Executive Officer',
  'VP Business Development',
  'VP Marketing'
]);

function readSession() {
  try {
    const rawSession = sessionStorage.getItem(SESSION_KEY);
    if (!rawSession) return null;

    const session = JSON.parse(rawSession);
    if (!session || typeof session !== 'object') return null;
    if (!VALID_ROLES.has(session.role)) return null;

    return session;
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
}

function ProtectedRoleRoute({ children }) {
  return readSession() ? children : <Navigate to="/access" replace />;
}

function AppRouter() {
  return (
    <Routes>
      <Route path="/access" element={<AccessGateway />} />
      <Route
        path="/app"
        element={(
          <ProtectedRoleRoute>
            <ExecutiveDashboard />
          </ProtectedRoleRoute>
        )}
      />
      <Route path="*" element={<Navigate to="/access" replace />} />
    </Routes>
  );
}

export { SESSION_KEY, readSession };
export default AppRouter;