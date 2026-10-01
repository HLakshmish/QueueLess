import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Calendar, CheckCircle, Clock } from 'lucide-react';

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
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.8rem' }}>Your Queue History</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Past visits, appointments, and token tickets.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading history...</div>
      ) : history.length === 0 ? (
        <div className="glass-panel" style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>No queue entries recorded yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {history.map((item) => (
            <div 
              key={item.id} 
              className="glass-panel" 
              style={{ 
                padding: '16px 20px', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                cursor: 'pointer'
              }}
              onClick={() => onSelectTicket(item.id)}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#818cf8' }}>
                    #{String(item.queueNumber).padStart(2, '0')}
                  </span>
                  <span style={{ fontWeight: 600 }}>{item.queue?.service?.name}</span>
                </div>
                <div style={{ display: 'flex', gap: 16, marginTop: 4, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <span>{item.queue?.service?.branch?.business?.name}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Calendar size={12} color="#007bff" /> {new Date(item.queue?.date || item.createdAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className={`badge badge-${item.status.toLowerCase().replace('_', '-')}`}>
                  {item.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
