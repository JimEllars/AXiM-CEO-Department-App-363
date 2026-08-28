import React, { useEffect, useRef } from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiX } = FiIcons;

function PanelDetailsModal({ item, onClose }) {
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!item) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="context-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="panel-detail-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={closeRef}
          className="modal-close"
          type="button"
          onClick={onClose}
          aria-label="Close details"
        >
          <SafeIcon icon={FiX} />
        </button>
        <span className="kicker">Operating detail</span>
        <h3 id="panel-detail-title">{item.name || item.event}</h3>
        <p>{item.context || item.detail || item.event || 'No additional detail available.'}</p>
        <div className="detail-meta">
          {item.status && <span>{item.status}</span>}
          {item.value && <span>{item.value}</span>}
          {item.conversion && <span>{item.conversion} conversion</span>}
        </div>
      </div>
    </div>
  );
}

export default PanelDetailsModal;