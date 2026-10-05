import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Calendar, Clock, History, ChevronRight } from 'lucide-react';

export default function QueueHistory({ onSelectTicket }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await api.getCustomerHistory();
        if (res.success) {
          setHistory(res.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, []);

  return (
    <div className="page-container" style={{ maxWidth: 900 }}>
      <div className="page-header">
        <h1>Your Queue History</h1>
        <p>Past visits, appointments, and token tickets.</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 80, borderRadius: 16 }} />
          ))}
        </div>
      ) : history.length === 0 ? (
        <div className="glass-panel empty-state">
          <div className="empty-state-icon">
            <History size={26} />
          </div>
          <h3>No queue entries yet</h3>
          <p>Your past queue visits and tickets will appear here once you join a queue.</p>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
          {history.map((item, index) => (
            <div
              key={item.id}
              className="history-item"
              style={{ borderBottom: index < history.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
              onClick={() => onSelectTicket(item.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onSelectTicket(item.id)}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span className="history-token">
                    #Q-{String(item.queueNumber).padStart(2, '0')}
                  </span>
                  <span style={{ fontWeight: 600 }}>{item.queue?.service?.name}</span>
                </div>
                <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: '0.82rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                  <span>{item.queue?.service?.branch?.business?.name}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Calendar size={12} color="var(--accent-primary)" />
                    {new Date(item.queue?.date || item.createdAt).toLocaleDateString('en-US', {
                      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
                    })}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className={`badge badge-${item.status.toLowerCase().replace('_', '-')}`}>
                  {item.status.replace('_', ' ')}
                </span>
                <ChevronRight size={18} color="var(--text-dim)" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
