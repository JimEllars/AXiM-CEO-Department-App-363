const fs = require('fs');
const code = `import React, { useEffect, useRef, useState } from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { directives as initialDirectives } from '../data/dashboardData';
import { readPersistedState, writePersistedState } from '../utils/persistedState';
import { resolveDirective } from '../services/ceoApi';
import { readSession } from '../routes/AppRouter';

const { FiCheck, FiClock, FiMessageSquare, FiX, FiInfo, FiAlertCircle, FiSend } = FiIcons;

function DirectiveDesk() {
  const [directives, setDirectives] = useState(() =>
    readPersistedState('pending-directives', initialDirectives)
  );
  const [context, setContext] = useState(null);
  const [loadingMap, setLoadingMap] = useState({});
  const [notification, setNotification] = useState(null);
  const closeButtonRef = useRef(null);

  // New state for arbitrary dispatch
  const [customDirective, setCustomDirective] = useState('');
  const [dispatchStatus, setDispatchStatus] = useState(null);

  useEffect(() => {
    writePersistedState('pending-directives', directives);
  }, [directives]);

  useEffect(() => {
    if (!context) return undefined;

    closeButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setContext(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [context]);

  const handleResolve = async (title, resolution) => {
    setLoadingMap((prev) => ({ ...prev, [title]: true }));
    try {
      await resolveDirective(title, resolution);
      setDirectives((items) => items.filter((item) => item.title !== title));
      setNotification({ type: 'success', text: \`Successfully processed: \${resolution}\` });
      if (context?.title === title) setContext(null);
    } catch (error) {
      setNotification({ type: 'error', text: error.message || 'Failed to process action.' });
    } finally {
      setLoadingMap((prev) => ({ ...prev, [title]: false }));
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleCustomDispatch = async (e) => {
    e.preventDefault();
    if (!customDirective.trim()) return;

    setDispatchStatus('IN_PROGRESS');
    try {
      const url = import.meta.env.VITE_CEO_WORKER_URL?.replace(/\\/$/, '') || '';
      const session = readSession();
      const res = await fetch(\`\${url}/api/v1/directives/dispatch\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${session?.token || ''}\`
        },
        body: JSON.stringify({
          directive_body: customDirective,
          target: 'onyx'
        })
      });

      if (res.ok) {
        setDispatchStatus('COMPLETED');
        setCustomDirective('');
      } else {
        setDispatchStatus('FAILED');
      }
    } catch (err) {
      setDispatchStatus('FAILED');
    }

    setTimeout(() => {
        if (dispatchStatus !== 'FAILED' && dispatchStatus !== 'IN_PROGRESS') {
             setDispatchStatus(null);
        }
    }, 3000);
  };

  return (
    <section className="panel directive-panel">
      <div className="panel-heading">
        <div>
          <span className="kicker">Human-in-the-loop</span>
          <h2>Directive desk</h2>
        </div>
        <span className="alert-count">{directives.length}</span>
      </div>

      {notification && (
        <div className={\`notification-banner \${notification.type}\`} style={{ padding: '0.5rem 1rem', marginBottom: '1rem', borderRadius: '4px', backgroundColor: notification.type === 'error' ? '#fee2e2' : '#dcfce7', color: notification.type === 'error' ? '#991b1b' : '#166534', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <SafeIcon icon={notification.type === 'error' ? FiAlertCircle : FiCheck} />
          {notification.text}
        </div>
      )}

      {/* Custom Directive Dispatch Form */}
      <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
         <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: '#84958e', marginBottom: '0.5rem', fontWeight: 700 }}>Dispatch Swarm Directive</span>
         <form onSubmit={handleCustomDispatch} style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              placeholder="E.g., Summon Onyx for log analysis..."
              value={customDirective}
              onChange={(e) => setCustomDirective(e.target.value)}
              style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'white', fontSize: '0.875rem' }}
            />
            <button
              type="submit"
              disabled={dispatchStatus === 'IN_PROGRESS' || !customDirective.trim()}
              className="approve-button"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <SafeIcon icon={FiSend} /> Dispatch
            </button>
         </form>
         {dispatchStatus && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', fontWeight: 'bold', display: 'inline-block', padding: '0.25rem 0.5rem', borderRadius: '4px',
              backgroundColor: dispatchStatus === 'COMPLETED' ? 'rgba(102, 227, 164, 0.2)' : dispatchStatus === 'IN_PROGRESS' ? 'rgba(117, 185, 255, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              color: dispatchStatus === 'COMPLETED' ? '#66e3a4' : dispatchStatus === 'IN_PROGRESS' ? '#75b9ff' : '#ef4444'
             }}>
               Status: {dispatchStatus}
            </div>
         )}
      </div>

      <div className="directive-list">
        {directives.length === 0 && (
          <div className="empty-state">
            <SafeIcon icon={FiCheck} /> Queue cleared
          </div>
        )}
        {directives.map((item) => (
          <article key={item.title}>
            <div className="directive-main">
              <span className={\`priority-dot \${item.priority.toLowerCase()}\`} />
              <div>
                <b>{item.title}</b>
                <small>{item.source} · {item.priority} priority</small>
              </div>
              <span className="due">
                <SafeIcon icon={FiClock} /> {item.due}
              </span>
            </div>
            <div className="directive-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => setContext(item)}
                disabled={loadingMap[item.title]}
              >
                <SafeIcon icon={FiMessageSquare} /> Context
              </button>
              <button
                className="approve-button"
                type="button"
                onClick={() => handleResolve(item.title, 'APPROVE')}
                disabled={loadingMap[item.title]}
              >
                <SafeIcon icon={FiCheck} /> Approve
              </button>
            </div>
          </article>
        ))}
      </div>
      {context && (
        <div className="modal-backdrop" role="presentation" onClick={() => setContext(null)}>
          <div
            className="context-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="directive-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              ref={closeButtonRef}
              className="modal-close"
              type="button"
              onClick={() => setContext(null)}
              aria-label="Close context"
            >
              <SafeIcon icon={FiX} />
            </button>
            <span className="kicker">{context.source} directive</span>
            <h3 id="directive-title">{context.title}</h3>
            <p>{context.context}</p>
            <div className="modal-actions" style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
              <button
                className="approve-button"
                type="button"
                onClick={() => handleResolve(context.title, 'APPROVE')}
                disabled={loadingMap[context.title]}
              >
                <SafeIcon icon={FiCheck} /> Approve
              </button>
              <button
                className="secondary-button"
                style={{ backgroundColor: '#fee2e2', color: '#991b1b', borderColor: '#f87171' }}
                type="button"
                onClick={() => handleResolve(context.title, 'REJECT')}
                disabled={loadingMap[context.title]}
              >
                <SafeIcon icon={FiX} /> Reject
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => handleResolve(context.title, 'REQUEST_INFO')}
                disabled={loadingMap[context.title]}
              >
                <SafeIcon icon={FiInfo} /> Request Info
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default DirectiveDesk;
`;
fs.writeFileSync('src/components/DirectiveDesk.jsx', code, 'utf8');
