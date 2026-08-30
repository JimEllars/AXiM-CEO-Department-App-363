import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SESSION_KEY } from '../routes/AppRouter';

function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    if (token && email) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token, email, role: 'Chief Executive Officer' }));
      navigate('/app', { replace: true });
    } else {
      navigate('/access', { replace: true });
    }
  }, [location, navigate]);

  return <div>Authenticating...</div>;
}

export default AuthCallback;
