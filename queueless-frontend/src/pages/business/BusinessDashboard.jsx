import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { subscribeToQueue } from '../../services/socket';
import { 
  Users, 
  PhoneCall, 
  Check, 
  FastForward, 
  RotateCcw, 
  UserPlus, 
  Pause, 
  Play, 
  StopCircle, 
  Clock, 
  AlertCircle
} from 'lucide-react';

export default function BusinessDashboard() {
  const { user, activeBusiness } = useAuth();
  const [queues, setQueues] = useState([]);
  const [selectedQueue, setSelectedQueue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [walkInName, setWalkInName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');

  // Load business queues
  useEffect(() => {
    loadBusinessData();
  }, [activeBusiness]);

  async function loadBusinessData() {
    if (!activeBusiness) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api.getBusinessById(activeBusiness.id);
      if (res.success && res.data) {
        const foundQueues = [];
        for (const branch of res.data.branches || []) {
          for (const service of branch.services || []) {
            for (const q of service.queues || []) {
              foundQueues.push({ ...q, service, branch });
            }
          }
        }
        setQueues(foundQueues);
        if (foundQueues.length > 0) {
          setSelectedQueue(foundQueues[0]);
          loadQueueDetails(foundQueues[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadQueueDetails(queueId) {
    try {
      const res = await api.getQueue(queueId);
      if (res.success) {
        setSelectedQueue(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Subscribe to live WebSocket events for selected queue
  useEffect(() => {
    if (!selectedQueue?.id) return;

    const unsubscribe = subscribeToQueue(selectedQueue.id, (event) => {
      console.log('[Operator Desk] Real-time queue event:', event);
      loadQueueDetails(selectedQueue.id);
    });

    return () => {
      unsubscribe();
    };
  }, [selectedQueue?.id]);

  // Concurrency-safe Call Next
  const handleCallNext = async () => {
    if (!selectedQueue) return;
    setActionLoading(true);
    try {
      const res = await api.callNext(selectedQueue.id);
      if (res.success) {
        if (!res.data) {
          alert('No waiting customers in the queue.');
        }
        loadQueueDetails(selectedQueue.id);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleServe = async (entryId) => {
    setActionLoading(true);
    try {
      await api.serveEntry(entryId);
      loadQueueDetails(selectedQueue.id);
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSkip = async (entryId) => {
    setActionLoading(true);
    try {
      await api.skipEntry(entryId);
      loadQueueDetails(selectedQueue.id);
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecall = async (entryId) => {
    setActionLoading(true);
    try {
      await api.recallEntry(entryId);
      loadQueueDetails(selectedQueue.id);
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTogglePause = async () => {
    if (!selectedQueue) return;
    try {
      if (selectedQueue.status === 'OPEN') {
        await api.pauseQueue(selectedQueue.id);
      } else {
        await api.resumeQueue(selectedQueue.id);
      }
      loadQueueDetails(selectedQueue.id);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddWalkIn = async (e) => {
    e.preventDefault();
    if (!walkInName.trim()) return;
    setActionLoading(true);
    try {
      const res = await api.joinQueue(selectedQueue.id, {
        customerName: `${walkInName.trim()} (Walk-in)`,
        customerPhone: walkInPhone,
      });
      if (res.success) {
        setShowWalkInModal(false);
        setWalkInName('');
        setWalkInPhone('');
        loadQueueDetails(selectedQueue.id);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>Loading live queue desk...</div>;
  }

  if (!activeBusiness) {
    return (
      <div style={{ maxWidth: 600, margin: '80px auto', textAlign: 'center' }} className="glass-panel">
        <div style={{ padding: 48 }}>
          <AlertCircle size={44} color="#f59e0b" style={{ marginBottom: 16 }} />
          <h2>No Associated Business Found</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>
            Your account is not registered to a business yet. Please create or configure your business profile.
          </p>
        </div>
      </div>
    );
  }

  const entries = selectedQueue?.entries || [];
  const servingCustomer = entries.find((e) => e.status === 'SERVING' || e.status === 'CALLED');
  const waitingEntries = entries.filter((e) => ['WAITING', 'CHECKED_IN'].includes(e.status));
  const skippedEntries = entries.filter((e) => e.status === 'SKIPPED');

  return (
    <div style={{ maxWidth: 1300, margin: '0 auto', padding: '32px 20px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {activeBusiness.name}
          </div>
          <h1 style={{ fontSize: '2rem' }}>Live Queue Operator Desk</h1>
        </div>

        {/* Queue Selector & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {queues.length > 1 && (
            <select 
              className="form-input" 
              style={{ width: 'auto' }}
              value={selectedQueue?.id}
              onChange={(e) => {
                const found = queues.find(q => q.id === e.target.value);
                setSelectedQueue(found);
                loadQueueDetails(e.target.value);
              }}
            >
              {queues.map(q => (
                <option key={q.id} value={q.id}>{q.service?.name} ({q.title})</option>
              ))}
            </select>
          )}

          <button onClick={() => setShowWalkInModal(true)} className="btn-secondary">
            <UserPlus size={16} /> Add Walk-in
          </button>

          <button onClick={handleTogglePause} className="btn-secondary">
            {selectedQueue?.status === 'OPEN' ? <><Pause size={16} /> Pause Queue</> : <><Play size={16} /> Resume Queue</>}
          </button>
        </div>
      </div>

      {/* Main Grid: Left Control Console & Right Waiting Roster */}
      <div className="grid-cols-3" style={{ gridTemplateColumns: '1fr 2fr', gap: 24 }}>
        {/* Left: Active Desk Controller */}
        <div>
          {/* Hero Call Next Action Card */}
          <div className="glass-panel-glow" style={{ padding: 28, textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
              Now Serving / Called
            </div>

            {servingCustomer ? (
              <div style={{ padding: '16px 0' }}>
                <div className="queue-number-hero">
                  #{String(servingCustomer.queueNumber).padStart(2, '0')}
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: 8 }}>
                  {servingCustomer.customerName}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
                  <span className={`badge badge-${servingCustomer.status.toLowerCase()}`}>
                    {servingCustomer.status}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'center' }}>
                  <button 
                    onClick={() => handleServe(servingCustomer.id)} 
                    disabled={actionLoading}
                    className="btn-success"
                    style={{ flex: 1 }}
                  >
                    <Check size={16} /> Mark Served
                  </button>
                  <button 
                    onClick={() => handleSkip(servingCustomer.id)} 
                    disabled={actionLoading}
                    className="btn-warning"
                  >
                    <FastForward size={16} /> Skip
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ padding: '24px 0', color: 'var(--text-dim)' }}>
                <div style={{ fontSize: '3rem', fontWeight: 800 }}>--</div>
                <p>No customer currently called to desk</p>
              </div>
            )}

            {/* Big Action: Call Next Button */}
            <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border-subtle)' }}>
              <button 
                onClick={handleCallNext} 
                disabled={actionLoading || waitingEntries.length === 0}
                className="btn-primary" 
                style={{ width: '100%', justifyContent: 'center', padding: '14px 20px', fontSize: '1.1rem' }}
              >
                <PhoneCall size={20} />
                Call Next Customer ({waitingEntries.length})
              </button>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 8 }}>
                Concurrency safe: PostgreSQL atomic state transaction
              </div>
            </div>
          </div>

          {/* Quick Stats Widget */}
          <div className="glass-panel" style={{ padding: 20 }}>
            <h4 style={{ fontSize: '1rem', marginBottom: 12 }}>Queue Overview</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Status</span>
              <span className={`badge ${selectedQueue?.status === 'OPEN' ? 'badge-serving' : 'badge-waiting'}`}>
                {selectedQueue?.status}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Waiting in Line</span>
              <strong>{waitingEntries.length}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
              <span style={{ color: 'var(--text-muted)' }}>Estimated Wait Time</span>
              <strong>~{waitingEntries.length * (selectedQueue?.service?.avgDurationMinutes || 15)} mins</strong>
            </div>
          </div>
        </div>

        {/* Right: Waiting Roster */}
        <div>
          <div className="glass-panel" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: '1.3rem' }}>
                Waiting Customers ({waitingEntries.length})
              </h3>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Real-time WebSocket Live Feed
              </div>
            </div>

            {waitingEntries.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-dim)' }}>
                <Users size={36} style={{ marginBottom: 12, opacity: 0.5 }} />
                <p>No waiting customers in the queue right now.</p>
                <button onClick={() => setShowWalkInModal(true)} className="btn-secondary" style={{ marginTop: 12 }}>
                  Add First Walk-In
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {waitingEntries.map((entry, index) => (
                  <div 
                    key={entry.id}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 12,
                      padding: '14px 18px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#4f46e5', minWidth: 44 }}>
                        #{String(entry.queueNumber).padStart(2, '0')}
                      </span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '1rem' }}>{entry.customerName}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', gap: 12 }}>
                          <span>Wait: ~{index * (selectedQueue?.service?.avgDurationMinutes || 15)}m</span>
                          {entry.notes && <span>• {entry.notes}</span>}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className={`badge badge-${entry.status.toLowerCase().replace('_', '-')}`}>
                        {entry.status}
                      </span>
                      <button 
                        onClick={() => handleSkip(entry.id)} 
                        className="btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        title="Skip this customer"
                      >
                        Skip
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Skipped Section */}
            {skippedEntries.length > 0 && (
              <div style={{ marginTop: 32, borderTop: '1px solid var(--border-subtle)', paddingTop: 20 }}>
                <h4 style={{ fontSize: '1rem', color: '#b45309', marginBottom: 12 }}>
                  Skipped Customers ({skippedEntries.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {skippedEntries.map((entry) => (
                    <div 
                      key={entry.id}
                      style={{
                        background: '#fffbeb',
                        border: '1px solid #fde68a',
                        borderRadius: 10,
                        padding: '10px 16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontWeight: 800, color: '#b45309' }}>#{entry.queueNumber}</span>
                        <span style={{ fontWeight: 600 }}>{entry.customerName}</span>
                      </div>
                      <button 
                        onClick={() => handleRecall(entry.id)} 
                        className="btn-warning"
                        style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                      >
                        <RotateCcw size={14} /> Recall
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Walk-in Modal */}
      {showWalkInModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          padding: 20
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: 440, padding: 30, background: '#ffffff', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <h3 style={{ fontSize: '1.3rem', marginBottom: 6 }}>Add Walk-in Customer</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 20 }}>
              Issue a token ticket directly from the receptionist desk.
            </p>

            <form onSubmit={handleAddWalkIn}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Customer Name *
                </label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Ramesh Kumar"
                  value={walkInName}
                  onChange={(e) => setWalkInName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Phone Number (optional)
                </label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. +91 9845012345"
                  value={walkInPhone}
                  onChange={(e) => setWalkInPhone(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowWalkInModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={actionLoading} className="btn-primary">
                  {actionLoading ? 'Issuing...' : 'Issue Token'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
