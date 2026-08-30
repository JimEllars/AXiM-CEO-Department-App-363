import React, { useState, useEffect } from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { dispatchMemo, fetchVoiceFeed } from '../services/ceoApi';

const { FiPhone, FiMic, FiMail, FiSend, FiAlertCircle, FiCheckCircle } = FiIcons;

function ExecutiveCommsHub() {
  const [voiceFeed, setVoiceFeed] = useState([]);
  const [memo, setMemo] = useState({ subject: '', priority: 'Medium', recipients: '', body: '' });
  const [dispatchStatus, setDispatchStatus] = useState(null);

  useEffect(() => {
    const loadVoiceFeed = async (signal) => {
      try {
        const data = await fetchVoiceFeed(signal);
        setVoiceFeed(data.feed || []);
      } catch (err) {
        // Ignored, handled by api service
      }
    };

    const controller = new AbortController();
    loadVoiceFeed(controller.signal);

    const interval = setInterval(() => {
      loadVoiceFeed(controller.signal);
    }, 15000);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, []);

  const handleDispatch = async (e) => {
    e.preventDefault();
    setDispatchStatus('dispatching');
    try {
      const data = await dispatchMemo(memo);
      if (data && data.success) {
        setDispatchStatus('success');
        setMemo({ subject: '', priority: 'Medium', recipients: '', body: '' });
      } else {
        setDispatchStatus('error');
      }
    } catch (err) {
      setDispatchStatus('error');
    }
    setTimeout(() => setDispatchStatus(null), 5000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4">
      <section className="panel glassmorphic">
        <div className="panel-heading">
          <div>
            <span className="kicker">Live Stream</span>
            <h2>Voice & Voicemail</h2>
          </div>
          <SafeIcon icon={FiPhone} />
        </div>
        <div className="flex flex-col gap-4 mt-4">
          {voiceFeed.length === 0 ? (
            <p className="text-gray-400 text-sm">No active calls or recent voicemails.</p>
          ) : (
            voiceFeed.map((call, idx) => (
              <div key={idx} className="bg-[rgba(255,255,255,0.05)] p-4 rounded-lg border border-[rgba(255,255,255,0.1)]">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-[#66e3a4]">{call.caller_id}</span>
                  <span className="text-xs uppercase bg-[#07100f] px-2 py-1 rounded">{call.status}</span>
                </div>
                <div className="text-sm mb-2 opacity-80">Duration: {call.duration}s</div>
                {call.noota_transcript_summary && (
                  <p className="text-sm bg-black/30 p-2 rounded italic">
                    "{call.noota_transcript_summary}"
                  </p>
                )}
                {call.audio_url && (
                  <button className="mt-3 text-xs flex items-center gap-2 bg-[#66e3a4] text-black px-3 py-1.5 rounded-full hover:bg-white transition-colors">
                    <SafeIcon icon={FiMic} /> Play Audio
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      <section className="panel glassmorphic">
        <div className="panel-heading">
          <div>
            <span className="kicker">Directives</span>
            <h2>Executive Memo Dispatcher</h2>
          </div>
          <SafeIcon icon={FiMail} />
        </div>
        <form onSubmit={handleDispatch} className="flex flex-col gap-4 mt-4">
          <input
            type="text"
            placeholder="Recipients / Departments"
            required
            className="bg-black/20 border border-[rgba(255,255,255,0.1)] rounded p-2 text-sm text-white focus:outline-none focus:border-[#66e3a4]"
            value={memo.recipients}
            onChange={(e) => setMemo({ ...memo, recipients: e.target.value })}
          />
          <input
            type="text"
            placeholder="Subject"
            required
            className="bg-black/20 border border-[rgba(255,255,255,0.1)] rounded p-2 text-sm text-white focus:outline-none focus:border-[#66e3a4]"
            value={memo.subject}
            onChange={(e) => setMemo({ ...memo, subject: e.target.value })}
          />
          <select
            className="bg-black/20 border border-[rgba(255,255,255,0.1)] rounded p-2 text-sm text-white focus:outline-none focus:border-[#66e3a4]"
            value={memo.priority}
            onChange={(e) => setMemo({ ...memo, priority: e.target.value })}
          >
            <option value="Low">Low Priority</option>
            <option value="Medium">Medium Priority</option>
            <option value="High">High Priority</option>
            <option value="Critical">Critical Priority</option>
          </select>
          <textarea
            placeholder="Message Body"
            required
            rows={5}
            className="bg-black/20 border border-[rgba(255,255,255,0.1)] rounded p-2 text-sm text-white focus:outline-none focus:border-[#66e3a4]"
            value={memo.body}
            onChange={(e) => setMemo({ ...memo, body: e.target.value })}
          />
          <button
            type="submit"
            disabled={dispatchStatus === 'dispatching'}
            className="bg-[#66e3a4] text-black font-bold py-2 px-4 rounded flex justify-center items-center gap-2 hover:bg-white transition-colors disabled:opacity-50"
          >
            <SafeIcon icon={FiSend} /> {dispatchStatus === 'dispatching' ? 'Dispatching...' : 'Dispatch Memo'}
          </button>

          {dispatchStatus === 'success' && (
            <div className="text-[#66e3a4] text-sm flex items-center gap-2">
              <SafeIcon icon={FiCheckCircle} /> Memo dispatched successfully.
            </div>
          )}
          {dispatchStatus === 'error' && (
            <div className="text-red-400 text-sm flex items-center gap-2">
              <SafeIcon icon={FiAlertCircle} /> Failed to dispatch memo.
            </div>
          )}
        </form>
      </section>
    </div>
  );
}

export default ExecutiveCommsHub;
