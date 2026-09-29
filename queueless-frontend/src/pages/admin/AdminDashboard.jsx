import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { 
  ShieldCheck, 
  Building, 
  Users, 
  Layers, 
  CheckCircle, 
  AlertTriangle, 
  PauseCircle, 
  History,
  Activity
} from 'lucide-react';

export default function AdminDashboard() {
  const [tab, setTab] = useState('businesses');
  const [stats, setStats] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [statsRes, bizRes, usersRes, logsRes] = await Promise.all([
        api.getPlatformAnalytics(),
        api.getAdminBusinesses(),
        api.getAdminUsers(),
        api.getAdminAuditLogs(),
      ]);

      if (statsRes.success) setStats(statsRes.data);
      if (bizRes.success) setBusinesses(bizRes.data);
      if (usersRes.success) setUsers(usersRes.data);
      if (logsRes.success) setAuditLogs(logsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleUpdateStatus = async (bizId, newStatus) => {
    try {
      const res = await api.updateBusinessStatus(bizId, newStatus);
      if (res.success) {
        setBusinesses(prev => prev.map(b => b.id === bizId ? { ...b, status: newStatus } : b));
      }
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>Loading platform administrator dashboard...</div>;

  return (
    <div style={{ maxWidth: 1300, margin: '0 auto', padding: '32px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#818cf8', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase' }}>
            <ShieldCheck size={18} /> Platform Administration
          </div>
          <h1 style={{ fontSize: '2.2rem', marginTop: 4 }}>QueueLess Command Center</h1>
        </div>

        {/* Tab Controls */}
        <div style={{ display: 'flex', gap: 8, background: 'rgba(255,255,255,0.03)', padding: 4, borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
          <button 
            onClick={() => setTab('businesses')} 
            className={tab === 'businesses' ? 'btn-primary' : 'btn-secondary'} 
            style={{ padding: '6px 14px', fontSize: '0.85rem' }}
          >
            <Building size={14} /> Businesses ({businesses.length})
          </button>
          <button 
            onClick={() => setTab('users')} 
            className={tab === 'users' ? 'btn-primary' : 'btn-secondary'} 
            style={{ padding: '6px 14px', fontSize: '0.85rem' }}
          >
            <Users size={14} /> Users ({users.length})
          </button>
          <button 
            onClick={() => setTab('logs')} 
            className={tab === 'logs' ? 'btn-primary' : 'btn-secondary'} 
            style={{ padding: '6px 14px', fontSize: '0.85rem' }}
          >
            <History size={14} /> Audit Trail ({auditLogs.length})
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid-cols-4" style={{ marginBottom: 32 }}>
        <div className="glass-panel" style={{ padding: 20 }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Platform Users</span>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: 4 }}>{stats?.totalUsers || 0}</div>
          <div style={{ fontSize: '0.75rem', color: '#818cf8', marginTop: 4 }}>Across all 3 roles</div>
        </div>

        <div className="glass-panel" style={{ padding: 20 }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Registered Businesses</span>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: 4 }}>{stats?.totalBusinesses || 0}</div>
          <div style={{ fontSize: '0.75rem', color: '#34d399', marginTop: 4 }}>Multi-tenant SaaS accounts</div>
        </div>

        <div className="glass-panel" style={{ padding: 20 }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Active Subscriptions</span>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: 4 }}>{stats?.activeSubscriptions || 0}</div>
          <div style={{ fontSize: '0.75rem', color: '#fbbf24', marginTop: 4 }}>Paid & Trial Tiers</div>
        </div>

        <div className="glass-panel" style={{ padding: 20 }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Queue Volume</span>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: 4 }}>{stats?.totalEntries || 0}</div>
          <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: 4 }}>{stats?.totalServed || 0} successfully served</div>
        </div>
      </div>

      {/* Content Tabs */}
      {tab === 'businesses' && (
        <div className="glass-panel" style={{ padding: 24 }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: 16 }}>Registered Businesses & Approvals</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 16px' }}>Business Name</th>
                  <th style={{ padding: '12px 16px' }}>Category</th>
                  <th style={{ padding: '12px 16px' }}>Owner</th>
                  <th style={{ padding: '12px 16px' }}>Plan</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {businesses.map((biz) => {
                  const owner = biz.members?.find(m => m.isOwner)?.user;
                  return (
                    <tr key={biz.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 600 }}>{biz.name}</td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>{biz.category}</td>
                      <td style={{ padding: '14px 16px' }}>{owner?.fullName || 'N/A'}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span className="badge badge-waiting">{biz.subscription?.plan?.name || 'Trial'}</span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span className={`badge ${biz.status === 'ACTIVE' ? 'badge-serving' : 'badge-waiting'}`}>
                          {biz.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {biz.status !== 'ACTIVE' ? (
                            <button 
                              onClick={() => handleUpdateStatus(biz.id, 'ACTIVE')} 
                              className="btn-success" 
                              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                            >
                              Approve
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleUpdateStatus(biz.id, 'SUSPENDED')} 
                              className="btn-danger" 
                              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                            >
                              Suspend
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="glass-panel" style={{ padding: 24 }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: 16 }}>All Platform Users</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 16px' }}>Full Name</th>
                  <th style={{ padding: '12px 16px' }}>Email</th>
                  <th style={{ padding: '12px 16px' }}>Phone</th>
                  <th style={{ padding: '12px 16px' }}>Application Role</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>{u.fullName}</td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>{u.email}</td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-dim)' }}>{u.phone || 'N/A'}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className="badge badge-called">{u.role}</span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className={`badge ${u.isActive ? 'badge-serving' : 'badge-waiting'}`}>
                        {u.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'logs' && (
        <div className="glass-panel" style={{ padding: 24 }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: 16 }}>Security & Administration Audit Trail</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {auditLogs.map((log) => (
              <div 
                key={log.id} 
                style={{ 
                  background: '#f8fafc', 
                  border: '1px solid var(--border-subtle)', 
                  borderRadius: 10, 
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.85rem',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                }}
              >
                <div>
                  <span style={{ fontWeight: 700, color: '#4f46e5', marginRight: 10 }}>{log.action}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{log.details}</span>
                </div>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>
                  {new Date(log.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
