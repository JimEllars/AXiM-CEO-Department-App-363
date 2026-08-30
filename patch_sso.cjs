const fs = require('fs');
let routerCode = `import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AccessGateway from '../pages/AccessGateway';
import ExecutiveDashboard from '../pages/ExecutiveDashboard';
import AuthCallback from '../pages/AuthCallback';
import AccessDenied from '../pages/AccessDenied';

const SESSION_KEY = 'axim-demo-session';

function readSession() {
  try {
    const rawSession = sessionStorage.getItem(SESSION_KEY);
    if (!rawSession) return null;

    const session = JSON.parse(rawSession);
    if (!session || typeof session !== 'object') return null;
    return session;
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
}

function ProtectedRoleRoute({ children }) {
  const session = readSession();

  if (!session) {
    window.location.href = \`https://passport.axim.us.com?redirect=\${encodeURIComponent(window.location.origin + '/auth/callback')}\`;
    return null;
  }

  if (!['jrellars@gmail.com'].includes(session.email) && !session.email?.endsWith('@axim.us.com')) {
      return <Navigate to="/access-denied" replace />;
  }

  return children;
}

function AppRouter() {
  return (
    <Routes>
      <Route path="/access" element={<AccessGateway />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/access-denied" element={<AccessDenied />} />
      <Route
        path="/app"
        element={(
          <ProtectedRoleRoute>
            <ExecutiveDashboard />
          </ProtectedRoleRoute>
        )}
      />
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}

export { SESSION_KEY, readSession };
export default AppRouter;
`;
fs.writeFileSync('src/routes/AppRouter.jsx', routerCode, 'utf8');

let accessGatewayCode = fs.readFileSync('src/pages/AccessGateway.jsx', 'utf8');
accessGatewayCode = accessGatewayCode.replace(
    "const enterDemo = (event) => {\n    event.preventDefault();\n    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ role, demo: true }));\n    navigate('/app');\n  };",
    `const enterDemo = (event) => {
    event.preventDefault();
    window.location.href = \`https://passport.axim.us.com?redirect=\${encodeURIComponent(window.location.origin + '/auth/callback')}\`;
  };`
);
fs.writeFileSync('src/pages/AccessGateway.jsx', accessGatewayCode, 'utf8');
