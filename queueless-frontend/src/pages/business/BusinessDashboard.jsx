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
  AlertCircle,
  Sparkles,
  Calendar,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

function getFormattedDateString(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  return dateObj.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function BusinessDashboard() {
  const { user, activeBusiness } = useAuth();
  const todayStr = getFormattedDateString();
  const [selectedDate, setSelectedDate] = useState(() => getFormattedDateString());
  const [queues, setQueues] = useState([]);
  const [allServices, setAllServices] = useState([]);
  const [selectedQueue, setSelectedQueue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [walkInName, setWalkInName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');

  // Load business queues for selected date
  useEffect(() => {
    loadBusinessData(selectedDate);
  }, [activeBusiness, selectedDate]);

  async function loadBusinessData(dateToLoad = selectedDate) {
    if (!activeBusiness) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api.getBusinessById(activeBusiness.id, { date: dateToLoad });
      if (res.success && res.data) {
        const foundQueues = [];
        const servicesList = [];
        for (const branch of res.data.branches || []) {
          for (const service of branch.services || []) {
            servicesList.push({ ...service, branch });
            for (const q of service.queues || []) {
              foundQueues.push({ ...q, service, branch });
            }
          }
        }
        setAllServices(servicesList);
        setQueues(foundQueues);
        if (foundQueues.length > 0) {
          // If the previously selected queue still exists for this date, keep it; else first
          const stillThere = foundQueues.find(q => q.id === selectedQueue?.id);
          const queueToSelect = stillThere || foundQueues[0];
          setSelectedQueue(queueToSelect);
          loadQueueDetails(queueToSelect.id);
        } else {
          setSelectedQueue(null);
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
      if (res.success && res.data) {
        setSelectedQueue(res.data);
        setQueues((prev) =>
          prev.map((q) =>
            q.id === queueId ? { ...q, status: res.data.status, title: res.data.title } : q
          )
        );
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

  // Date Navigation Handlers
  const handlePrevDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d - 1);
    setSelectedDate(getFormattedDateString(dateObj));
  };

  const handleNextDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d + 1);
    setSelectedDate(getFormattedDateString(dateObj));
  };

  const handleToday = () => {
    setSelectedDate(todayStr);
  };

  const isToday = selectedDate === todayStr;
  const isPast = selectedDate < todayStr;
  const isFuture = selectedDate > todayStr;

  // Open queue for a specific service on selected date
  const handleOpenQueueForDate = async (serviceId) => {
    if (!serviceId) return;
    setActionLoading(true);
    try {
      const res = await api.openQueue(serviceId, {
        title: isToday ? "Today's Live Queue" : `Queue (${formatDisplayDate(selectedDate)})`,
        date: selectedDate,
      });
      if (res.success) {
        await loadBusinessData(selectedDate);
      }
    } catch (err) {
      alert(err.message || 'Failed to open queue for date');
    } finally {
      setActionLoading(false);
    }
  };

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
        const res = await api.pauseQueue(selectedQueue.id);
        if (res.success) {
          setSelectedQueue((prev) => ({ ...prev, status: 'PAUSED' }));
          setQueues((prev) =>
            prev.map((q) => (q.id === selectedQueue.id ? { ...q, status: 'PAUSED' } : q))
          );
        }
      } else {
        const res = await api.resumeQueue(selectedQueue.id);
        if (res.success) {
          setSelectedQueue((prev) => ({ ...prev, status: 'OPEN' }));
          setQueues((prev) =>
            prev.map((q) => (q.id === selectedQueue.id ? { ...q, status: 'OPEN' } : q))
          );
        }
      }
      await loadQueueDetails(selectedQueue.id);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleQuickSetupQueue = async () => {
    if (!activeBusiness?.id) return;
    setActionLoading(true);
    try {
      const branchesRes = await api.getBusinessBranches(activeBusiness.id);
      let branchId = branchesRes.data?.[0]?.id;
      if (!branchId) {
        const newBranch = await api.createBranch(activeBusiness.id, {
          name: 'Main Branch',
          address: 'Central Plaza',
          city: 'Bengaluru',
        });
        branchId = newBranch.data.id;
      }

      let serviceId = allServices[0]?.id;
      if (!serviceId) {
        const serviceRes = await api.createService(branchId, {
          name: 'General Consultation',
          description: 'Primary customer service & queue desk',
          avgDurationMinutes: 15,
        });
        serviceId = serviceRes.data.id;
      }

      await api.openQueue(serviceId, {
        title: isToday ? "Today's Live Queue" : `Queue (${formatDisplayDate(selectedDate)})`,
        date: selectedDate,
      });

      await loadBusinessData(selectedDate);
    } catch (err) {
      alert(err.message || 'Failed to initialize queue');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddWalkIn = async (e) => {
    e.preventDefault();
    if (!walkInName.trim()) return;
    if (!selectedQueue?.id) {
      alert('No active queue available for this date. Please open a queue first.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await api.joinQueue(selectedQueue.id, {
        customerName: `${walkInName.trim()} (Walk-in)`,
        customerPhone: walkInPhone,
        isWalkIn: true,
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
    return (
      <div className="page-container" style={{ maxWidth: 1320 }}>
        <div className="skeleton skeleton-line short" style={{ marginBottom: 12 }} />
        <div className="skeleton skeleton-line medium" style={{ marginBottom: 32 }} />
        <div className="stat-grid-4" style={{ marginBottom: 24 }}>
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton" style={{ height: 100 }} />)}
        </div>
        <div className="skeleton" style={{ height: 280, borderRadius: 16 }} />
      </div>
    );
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
  const servingCustomer = entries
    .filter((e) => e.status === 'SERVING' || e.status === 'CALLED')
    .sort((a, b) => new Date(b.calledAt || 0) - new Date(a.calledAt || 0))[0] || null;
  const waitingEntries = entries.filter((e) => ['WAITING', 'CHECKED_IN'].includes(e.status));
  const skippedEntries = entries.filter((e) => e.status === 'SKIPPED');
  const totalActive = waitingEntries.length + (servingCustomer ? 1 : 0);
  const avgWait = waitingEntries.length * (selectedQueue?.service?.avgDurationMinutes || 15);

  // Derive real-time activity log feed from entries and events
  const activityLogs = [
    ...(servingCustomer ? [{
      time: servingCustomer.calledAt ? new Date(servingCustomer.calledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now',
      text: `${servingCustomer.customerName} called to desk (Token #Q-${String(servingCustomer.queueNumber).padStart(3, '0')})`,
      type: 'called'
    }] : []),
    ...entries.filter(e => e.checkedInAt).map(e => ({
      time: new Date(e.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `${e.customerName} checked in (Token #Q-${String(e.queueNumber).padStart(3, '0')})`,
      type: 'checkin'
    })),
    ...entries.filter(e => e.servedAt).map(e => ({
      time: new Date(e.servedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `${e.customerName} marked served`,
      type: 'served'
    })),
  ].slice(0, 6);

  return (
    <div style={{ maxWidth: 1320, margin: '0 auto', padding: '24px 20px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
            {activeBusiness.name}
          </div>
          <h1 style={{ fontSize: '1.8rem', marginTop: 2 }}>Live Queue Dashboard</h1>
        </div>

        {/* Date Selector & Navigation Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: '#ffffff',
          border: '1px solid var(--border-subtle)',
          borderRadius: 14,
          padding: '6px 12px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={handlePrevDay}
            className="btn-secondary"
            style={{ padding: '6px 10px', fontSize: '0.8rem' }}
            title="Previous Day"
          >
            <ChevronLeft size={16} />
          </button>

          <button
            onClick={handleToday}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: isToday ? 'var(--accent-blue, #007bff)' : '#f1f5f9',
              color: isToday ? '#ffffff' : 'var(--text-main)',
              border: 'none',
              transition: 'all 0.15s ease'
            }}
          >
            Today
          </button>

          <button
            onClick={handleNextDay}
            className="btn-secondary"
            style={{ padding: '6px 10px', fontSize: '0.8rem' }}
            title="Next Day"
          >
            <ChevronRight size={16} />
          </button>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '5px 12px',
            background: '#f8fafc',
            border: '1px solid var(--border-subtle)',
            borderRadius: 8,
          }}>
            <Calendar size={15} color="#007bff" />
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap' }}>
              {formatDisplayDate(selectedDate)}
            </span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) setSelectedDate(e.target.value);
              }}
              style={{
                border: 'none',
                background: 'transparent',
                fontSize: '0.82rem',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                outline: 'none',
                width: 24,
                overflow: 'hidden'
              }}
              title="Click calendar icon to pick date"
            />
          </div>

          <span className={`badge ${isToday ? 'badge-serving' : isPast ? 'badge-waiting' : 'badge-called'}`} style={{ fontSize: '0.74rem' }}>
            {isToday ? '🟢 Today' : isPast ? '⏳ Past Date' : '🗓️ Upcoming'}
          </span>
        </div>

        {/* Queue Selector & Desk Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {queues.length > 1 && (
            <select 
              className="form-input" 
              style={{ width: 'auto', padding: '8px 14px', fontSize: '0.88rem' }}
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

          <button 
            onClick={() => {
              if (!selectedQueue?.id) {
                if (allServices.length > 0) {
                  handleOpenQueueForDate(allServices[0].id);
                } else {
                  handleQuickSetupQueue();
                }
                return;
              }
              setShowWalkInModal(true);
            }} 
            className="btn-primary"
            style={{ padding: '8px 14px', fontSize: '0.88rem' }}
          >
            <UserPlus size={16} /> Add Walk-in
          </button>

          <button onClick={handleTogglePause} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.88rem' }} disabled={!selectedQueue?.id}>
            {selectedQueue?.status === 'OPEN' ? <><Pause size={16} /> Pause Queue</> : <><Play size={16} /> Resume Queue</>}
          </button>
        </div>
      </div>

      {/* Info / Quick Setup if No Queue Exists for this Date */}
      {queues.length === 0 && (
        <div style={{
          background: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: 14,
          padding: '24px 28px',
          marginBottom: 28,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ background: '#fef3c7', padding: 12, borderRadius: 12, color: '#d97706' }}>
              <Calendar size={28} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#92400e' }}>
                No Queue Session Opened for {formatDisplayDate(selectedDate)}
              </div>
              <p style={{ color: '#b45309', fontSize: '0.88rem', marginTop: 3 }}>
                {isPast 
                  ? 'No queue records were recorded for this past date.' 
                  : 'Open a queue desk for this date so customers and walk-in visitors can take tokens.'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {allServices.length > 0 ? (
              allServices.map(srv => (
                <button
                  key={srv.id}
                  onClick={() => handleOpenQueueForDate(srv.id)}
                  disabled={actionLoading}
                  className="btn-primary"
                  style={{ padding: '10px 20px', fontSize: '0.88rem' }}
                >
                  <Sparkles size={16} /> Open Queue for {srv.name}
                </button>
              ))
            ) : (
              <button
                onClick={handleQuickSetupQueue}
                disabled={actionLoading}
                className="btn-primary"
                style={{ padding: '10px 22px', fontSize: '0.88rem' }}
              >
                <Sparkles size={16} /> {actionLoading ? 'Initializing...' : 'Initialize & Open First Queue'}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="dashboard-layout">
        {/* Left / Main Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Queue Overview Summary Cards */}
          <div className="glass-panel" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h3 style={{ fontSize: '1.25rem' }}>Queue Overview</h3>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  ({formatDisplayDate(selectedDate)})
                </span>
              </div>
              <span className={`badge ${selectedQueue?.status === 'OPEN' ? 'badge-serving' : 'badge-waiting'}`}>
                {selectedQueue?.status || (isPast ? 'CLOSED' : 'NOT OPEN')}
              </span>
            </div>

            <div className="stat-grid-4">
              <div className="stat-card">
                <div className="stat-card-label">
                  Live Active Customers
                  <Users size={16} color="var(--accent-primary)" />
                </div>
                <div className="stat-card-value">{totalActive}</div>
              </div>

              <div className="stat-card">
                <div className="stat-card-label">
                  Avg. Wait Time
                  <Clock size={16} color="#2563eb" />
                </div>
                <div className="stat-card-value" style={{ color: '#2563eb' }}>{avgWait}m</div>
              </div>

              <div className="stat-card">
                <div className="stat-card-label">Service Desk</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginTop: 8 }}>
                  {selectedQueue?.service?.name || allServices[0]?.name || 'Main Desk'}
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-card-label">
                  Total Served
                  <Check size={16} color="#16a34a" />
                </div>
                <div className="stat-card-value" style={{ color: '#16a34a' }}>
                  {entries.filter(e => e.status === 'SERVED').length}
                </div>
              </div>
            </div>
          </div>

          {/* Hero Now Serving Console */}
          <div className="glass-panel-glow" style={{ padding: 24, textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 8 }}>
              Currently Called / Serving at Desk
            </div>

            {servingCustomer ? (
              <div>
                <div className="queue-number-hero">
                  #Q-{String(servingCustomer.queueNumber).padStart(3, '0')}
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: 6 }}>
                  {servingCustomer.customerName}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 16 }}>
                  <button 
                    onClick={() => handleServe(servingCustomer.id)} 
                    disabled={actionLoading}
                    className="btn-success"
                    style={{ padding: '8px 20px', fontSize: '0.9rem' }}
                  >
                    <Check size={16} /> Mark Served
                  </button>
                  <button 
                    onClick={() => handleSkip(servingCustomer.id)} 
                    disabled={actionLoading}
                    className="btn-warning"
                    style={{ padding: '8px 16px', fontSize: '0.9rem' }}
                  >
                    <FastForward size={16} /> Skip
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ padding: '16px 0', color: 'var(--text-dim)' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 800 }}>--</div>
                <p style={{ fontSize: '0.9rem' }}>No customer currently called to desk</p>
              </div>
            )}

            <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
              <button 
                onClick={handleCallNext} 
                disabled={actionLoading || waitingEntries.length === 0}
                className="btn-primary" 
                style={{ width: '100%', justifyContent: 'center', padding: '12px 20px', fontSize: '1rem' }}
              >
                <PhoneCall size={18} />
                Call Next Customer ({waitingEntries.length} waiting)
              </button>
            </div>
          </div>

          {/* Waiting List Table matching Reference Mockup */}
          <div className="glass-panel" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: '1.2rem' }}>Waiting List ({waitingEntries.length})</h3>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Live Stream Active
              </div>
            </div>

            {waitingEntries.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)' }}>
                <Users size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
                <p style={{ fontSize: '0.9rem' }}>No waiting customers in the queue.</p>
              </div>
            ) : (
              <table className="waiting-table">
                <thead>
                  <tr>
                    <th>Token ID</th>
                    <th>Customer Name</th>
                    <th>Service</th>
                    <th>Est. Wait</th>
                    <th>Status / Action</th>
                  </tr>
                </thead>
                <tbody>
                  {waitingEntries.map((entry, idx) => (
                    <tr key={entry.id}>
                      <td style={{ fontWeight: 800, color: '#007bff' }}>
                        #Q-{String(entry.queueNumber).padStart(3, '0')}
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {entry.customerName}
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>
                        {selectedQueue?.service?.name || 'General'}
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>
                        ~{idx * (selectedQueue?.service?.avgDurationMinutes || 15)}m
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className={`badge badge-${entry.status.toLowerCase().replace('_', '-')}`}>
                            {entry.status}
                          </span>
                          <button 
                            onClick={() => handleSkip(entry.id)} 
                            className="btn-secondary"
                            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                          >
                            Skip
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Skipped Section */}
            {skippedEntries.length > 0 && (
              <div style={{ marginTop: 24, borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
                <h4 style={{ fontSize: '0.9rem', color: '#d97706', marginBottom: 10 }}>Skipped Customers ({skippedEntries.length})</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {skippedEntries.map((entry) => (
                    <div key={entry.id} style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, color: '#b45309', fontSize: '0.85rem' }}>#Q-{String(entry.queueNumber).padStart(3, '0')} — {entry.customerName}</span>
                      <button onClick={() => handleRecall(entry.id)} className="btn-warning" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
                        <RotateCcw size={12} /> Recall
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Right Panel: Real-Time Activity Log Feed matching Reference Mockup */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="glass-panel" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: '1.15rem' }}>Real-Time Activity</h3>
              <Clock size={16} color="var(--text-muted)" />
            </div>

            {activityLogs.length === 0 ? (
              <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem', textAlign: 'center', padding: '24px 0' }}>
                Activity stream will update automatically as events occur.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {activityLogs.map((log, index) => (
                  <div key={index} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem', fontWeight: 600, minWidth: 60 }}>
                      {log.time}
                    </span>
                    <div style={{ background: '#f8fafc', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '8px 12px', flex: 1 }}>
                      <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{log.text}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Walk-in Modal */}
      {showWalkInModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3>Add Walk-in Customer</h3>
              <p>Issue a token ticket directly from the receptionist desk.</p>
            </div>

            {!selectedQueue?.id ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <p style={{ color: '#b45309', fontSize: '0.9rem', marginBottom: 16 }}>
                  No active queue found. You must initialize or open a queue before issuing tickets.
                </p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                  <button type="button" onClick={() => setShowWalkInModal(false)} className="btn-secondary">
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    onClick={async () => {
                      await handleQuickSetupQueue();
                      setShowWalkInModal(false);
                    }} 
                    className="btn-primary"
                  >
                    <Sparkles size={16} /> Initialize Queue Now
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleAddWalkIn}>
                {queues.length > 1 ? (
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                      Select Queue *
                    </label>
                    <select
                      className="form-input"
                      value={selectedQueue.id}
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
                  </div>
                ) : (
                  <div style={{ 
                    background: '#f8fafc', 
                    border: '1px solid var(--border-subtle)', 
                    padding: '8px 12px', 
                    borderRadius: 8, 
                    fontSize: '0.8rem', 
                    color: 'var(--text-muted)', 
                    marginBottom: 16,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span>Target: <strong style={{ color: '#4f46e5' }}>{selectedQueue?.service?.name || selectedQueue?.title}</strong></span>
                    <span>Date: <strong style={{ color: '#007bff' }}>{formatDisplayDate(selectedDate)}</strong></span>
                  </div>
                )}

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

                <div className="modal-footer">
                  <button type="button" onClick={() => setShowWalkInModal(false)} className="btn-secondary">Cancel</button>
                  <button type="submit" disabled={actionLoading} className="btn-primary">
                    {actionLoading ? 'Issuing...' : 'Issue Token'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
