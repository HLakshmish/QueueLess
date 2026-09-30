import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { CheckCircle2, Clock, Users, ArrowUpRight, TrendingUp, XCircle } from 'lucide-react';

export default function BusinessAnalytics() {
  const { activeBusiness } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      if (!activeBusiness) return;
      try {
        const res = await api.getBusinessAnalytics(activeBusiness.id);
        if (res.success) {
          setStats(res.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [activeBusiness]);

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading analytics...</div>;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: '2rem' }}>Queue & Operational Analytics</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Real-time metrics, throughput, wait time performance, and customer retention.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid-cols-4" style={{ marginBottom: 28 }}>
        <div className="glass-panel" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Served Customers</span>
            <CheckCircle2 size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{stats?.totalServed || 0}</div>
          <div style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
            <TrendingUp size={12} /> {stats?.completionRate || 100}% Completion rate
          </div>
        </div>

        <div className="glass-panel" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Currently Waiting</span>
            <Users size={18} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#d97706' }}>{stats?.totalWaiting || 0}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Active in live queues</div>
        </div>

        <div className="glass-panel" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Avg Wait Time</span>
            <Clock size={18} color="#4f46e5" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#4f46e5' }}>{stats?.averageWaitMinutes || 14}m</div>
          <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: 4 }}>Target: Under 20 mins</div>
        </div>

        <div className="glass-panel" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Cancellations / Skips</span>
            <XCircle size={18} color="#e11d48" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#e11d48' }}>
            {(stats?.totalCancelled || 0) + (stats?.totalSkipped || 0)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 4 }}>Low abandonment</div>
        </div>
      </div>

      {/* Hourly Flow Chart Representation */}
      <div className="glass-panel" style={{ padding: 28 }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: 16 }}>Peak Hours Throughput</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 24 }}>
          Hourly queue volume and staff desk processing rate.
        </p>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 180, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 10, overflowX: 'auto' }}>
          {(() => {
            const dist = stats?.hourlyDistribution || Array(24).fill(0);
            const maxVal = Math.max(...dist, 1);
            const displayHours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
            return displayHours.map((h) => {
              const count = dist[h] || 0;
              const heightPct = Math.max(10, Math.round((count / maxVal) * 100));
              const label = `${String(h).padStart(2, '0')}:00`;
              return (
                <div key={h} style={{ flex: 1, minWidth: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: '0.75rem', color: '#4f46e5', fontWeight: 700, marginBottom: 4 }}>{count}</span>
                  <div style={{
                    width: '100%',
                    maxWidth: 32,
                    height: `${heightPct}%`,
                    background: 'linear-gradient(180deg, #4f46e5 0%, #c7d2fe 100%)',
                    borderRadius: '6px 6px 0 0'
                  }} />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 8 }}>{label}</span>
                </div>
              );
            });
          })()}
        </div>
      </div>
    </div>
  );
}
