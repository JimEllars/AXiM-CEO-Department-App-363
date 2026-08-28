import React, { useEffect, useRef, useState } from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { directives as initialDirectives } from '../data/dashboardData';
import { readPersistedState, writePersistedState } from '../utils/persistedState';

const { FiCheck, FiClock, FiMessageSquare, FiX } = FiIcons;

function DirectiveDesk() {
  const [directives, setDirectives] = useState(() =>
    readPersistedState('pending-directives', initialDirectives)
  );
  const [context, setContext] = useState(null);
  const closeButtonRef = useRef(null);

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

  const resolve = (title) => {
    setDirectives((items) => items.filter((item) => item.title !== title));
    setContext(null);
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
      <div className="directive-list">
        {directives.length === 0 && (
          <div className="empty-state">
            <SafeIcon icon={FiCheck} /> Queue cleared
          </div>
        )}
        {directives.map((item) => (
          <article key={item.title}>
            <div className="directive-main">
              <span className={`priority-dot ${item.priority.toLowerCase()}`} />
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
              >
                <SafeIcon icon={FiMessageSquare} /> Context
              </button>
              <button
                className="approve-button"
                type="button"
                onClick={() => resolve(item.title)}
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
            <button
              className="approve-button"
              type="button"
              onClick={() => resolve(context.title)}
            >
              <SafeIcon icon={FiCheck} /> Approve directive
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default DirectiveDesk;