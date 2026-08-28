import React, { useState } from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import SafeIcon from '../common/SafeIcon';
import { SESSION_KEY } from '../routes/AppRouter';

const { FiArrowRight, FiLock, FiShield, FiZap } = FiIcons;

const roles = ['Chief Executive Officer', 'VP Business Development', 'VP Marketing'];

function AccessGateway() {
  const [role, setRole] = useState(roles[0]);
  const navigate = useNavigate();

  const enterDemo = (event) => {
    event.preventDefault();
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ role, demo: true }));
    navigate('/app');
  };

  return (
    <main className="access-shell">
      <section className="access-story">
        <div className="brand-lockup"><span className="brand-mark">A</span><b>AXiM</b></div>
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
          <span className="eyebrow"><SafeIcon icon={FiZap} /> Executive operating system</span>
          <h1>Decisions at the speed of the edge.</h1>
          <p>One command surface for governance, growth, telemetry, and autonomous agent oversight.</p>
        </motion.div>
        <div className="trust-line">
          <SafeIcon icon={FiShield} />
          <span>Designed for Cloudflare Zero Trust enforcement</span>
        </div>
      </section>

      <motion.section className="access-panel" initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }}>
        <div className="access-card">
          <div className="access-icon"><SafeIcon icon={FiLock} /></div>
          <span className="kicker">Internal access</span>
          <h2>Executive gateway</h2>
          <p className="muted">Choose a role to preview its command workspace.</p>
          <form onSubmit={enterDemo}>
            <label htmlFor="role">Workspace role</label>
            <select id="role" value={role} onChange={(event) => setRole(event.target.value)}>
              {roles.map((item) => <option key={item}>{item}</option>)}
            </select>
            <button className="primary-button" type="submit">
              Enter demo workspace <SafeIcon icon={FiArrowRight} />
            </button>
          </form>
          <p className="security-note">
            Demo only—this gateway does not authenticate users. Connect Cloudflare Access before production.
          </p>
        </div>
      </motion.section>
    </main>
  );
}

export default AccessGateway;