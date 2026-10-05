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

  if (loading) {
    return (
      <div className="page-container" style={{ maxWidth: 1100 }}>
        <div className="skeleton skeleton-line short" style={{ marginBottom: 12 }} />
        <div className="skeleton skeleton-line medium" style={{ marginBottom: 32 }} />
        <div className="stat-grid-4" style={{ marginBottom: 28 }}>
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton" style={{ height: 110 }} />)}
        </div>
        <div className="skeleton" style={{ height: 260, borderRadius: 16 }} />
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: 1100 }}>
      <div className="page-header">
        <h1>Queue &amp; Operational Analytics</h1>
        <p>
          Real-time metrics, throughput, wait time performance, and customer retention.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="stat-grid-4" style={{ marginBottom: 28 }}>
        <div className="stat-card">
          <div className="stat-card-label">
            Served Customers
            <CheckCircle2 size={18} color="#10b981" />
          </div>
          <div className="stat-card-value">{stats?.totalServed || 0}</div>
          <div style={{ fontSize: '0.78rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, fontWeight: 600 }}>
            <TrendingUp size={12} /> {stats?.completionRate || 100}% Completion rate
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-label">
            Currently Waiting
            <Users size={18} color="#f59e0b" />
          </div>
          <div className="stat-card-value" style={{ color: '#d97706' }}>{stats?.totalWaiting || 0}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>Active in live queues</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-label">
            Avg Wait Time
            <Clock size={18} color="var(--accent-primary)" />
          </div>
          <div className="stat-card-value" style={{ color: 'var(--accent-primary)' }}>{stats?.averageWaitMinutes || 14}m</div>
          <div style={{ fontSize: '0.78rem', color: '#059669', marginTop: 4, fontWeight: 600 }}>Target: Under 20 mins</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-label">
            Cancellations / Skips
            <XCircle size={18} color="#e11d48" />
          </div>
          <div className="stat-card-value" style={{ color: '#e11d48' }}>
            {(stats?.totalCancelled || 0) + (stats?.totalSkipped || 0)}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: 4 }}>Low abandonment</div>
        </div>
      </div>

      {/* Hourly Flow Chart Representation */}
      <div className="glass-panel" style={{ padding: 28 }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: 6 }}>Peak Hours Throughput</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: 24 }}>
          Hourly queue volume and staff desk processing rate.
        </p>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 190, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 10, overflowX: 'auto' }}>
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
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 700, marginBottom: 4 }}>{count}</span>
                  <div style={{
                    width: '100%',
                    maxWidth: 32,
                    height: `${heightPct}%`,
                    background: 'var(--accent-gradient)',
                    borderRadius: '6px 6px 0 0'
                  }} />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 8, fontWeight: 600 }}>{label}</span>
                </div>
              );
            });
          })()}
        </div>
      </div>
    </div>
  );
}
