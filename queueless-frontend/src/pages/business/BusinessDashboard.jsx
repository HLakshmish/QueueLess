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
  ChevronRight,
  Building2,
  Layers,
  MapPin
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
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
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

  async function loadBusinessData(dateToLoad = selectedDate, targetBranchId = null, targetServiceId = null) {
    if (!activeBusiness) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api.getBusinessById(activeBusiness.id, { date: dateToLoad });
      if (res.success && res.data) {
        const branchesList = res.data.branches || [];
        const foundQueues = [];
        const servicesList = [];
        for (const branch of branchesList) {
          for (const service of branch.services || []) {
            servicesList.push({ ...service, branch });
            for (const q of service.queues || []) {
              foundQueues.push({ ...q, service, branch });
            }
          }
        }
        setBranches(branchesList);
        setAllServices(servicesList);
        setQueues(foundQueues);

        // Resolve branch to use
        let branchIdToUse = targetBranchId || selectedBranchId;
        if (!branchesList.some(b => b.id === branchIdToUse)) {
          branchIdToUse = branchesList[0]?.id || '';
        }
        setSelectedBranchId(branchIdToUse);

        const currentBranchObj = branchesList.find(b => b.id === branchIdToUse) || branchesList[0] || null;
        const branchServices = currentBranchObj?.services || [];

        // Resolve service to use
        let serviceIdToUse = targetServiceId || selectedServiceId;
        if (!branchServices.some(s => s.id === serviceIdToUse)) {
          serviceIdToUse = branchServices[0]?.id || '';
        }
        setSelectedServiceId(serviceIdToUse);

        // Find queue for this service and date
        const matchingQueue = foundQueues.find(q => (q.serviceId === serviceIdToUse || q.service?.id === serviceIdToUse));
        if (matchingQueue) {
          setSelectedQueue(matchingQueue);
          loadQueueDetails(matchingQueue.id);
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

  const handleBranchChange = (branchId) => {
    setSelectedBranchId(branchId);
    const branchObj = branches.find(b => b.id === branchId);
    const branchServices = branchObj?.services || [];
    const firstServiceId = branchServices[0]?.id || '';
    setSelectedServiceId(firstServiceId);

    const matchingQueue = queues.find(q => (q.serviceId === firstServiceId || q.service?.id === firstServiceId));
    if (matchingQueue) {
      setSelectedQueue(matchingQueue);
      loadQueueDetails(matchingQueue.id);
    } else {
      setSelectedQueue(null);
    }
  };

  const handleServiceChange = (serviceId) => {
    setSelectedServiceId(serviceId);
    const matchingQueue = queues.find(q => (q.serviceId === serviceId || q.service?.id === serviceId));
    if (matchingQueue) {
      setSelectedQueue(matchingQueue);
      loadQueueDetails(matchingQueue.id);
    } else {
      setSelectedQueue(null);
    }
  };

  const currentBranch = branches.find(b => b.id === selectedBranchId) || branches[0] || null;
  const currentBranchServices = currentBranch?.services || [];
  const currentService = currentBranchServices.find(s => s.id === selectedServiceId) || currentBranchServices[0] || null;

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
        await loadBusinessData(selectedDate, selectedBranchId, serviceId);
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

        {/* Desk Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button 
            onClick={() => setShowWalkInModal(true)} 
            className="btn-primary"
            style={{ padding: '8px 14px', fontSize: '0.88rem' }}
          >
            <UserPlus size={16} /> Add Walk-in
          </button>

          {selectedQueue ? (
            <button onClick={handleTogglePause} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.88rem' }}>
              {selectedQueue.status === 'OPEN' ? <><Pause size={16} /> Pause Queue</> : <><Play size={16} /> Resume Queue</>}
            </button>
          ) : currentService && !isPast ? (
            <button
              onClick={() => handleOpenQueueForDate(currentService.id)}
              disabled={actionLoading}
              className="btn-secondary"
              style={{ padding: '8px 14px', fontSize: '0.88rem' }}
            >
              <Play size={16} /> Open Queue
            </button>
          ) : null}
        </div>
      </div>

      {/* Branch & Service Selector Strip */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#ffffff',
        border: '1px solid var(--border-subtle)',
        borderRadius: 16,
        padding: '14px 20px',
        marginBottom: 20,
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          {/* Branch Location Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'rgba(37, 99, 235, 0.08)',
              color: '#2563eb',
              flexShrink: 0
            }}>
              <Building2 size={19} />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Branch Location
              </div>
              {branches.length > 1 ? (
                <select
                  value={selectedBranchId}
                  onChange={(e) => handleBranchChange(e.target.value)}
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    color: 'var(--text-main)',
                    borderRadius: 8,
                    border: '1px solid var(--border-subtle)',
                    background: '#f8fafc',
                    cursor: 'pointer',
                    outline: 'none',
                    marginTop: 2
                  }}
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} {b.city ? `(${b.city})` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {currentBranch?.name || 'Main Branch'}
                  {currentBranch?.city && (
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                      • {currentBranch.city}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 34, background: 'var(--border-subtle)' }} />

          {/* Service Desk Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'rgba(16, 185, 129, 0.08)',
              color: '#10b981',
              flexShrink: 0
            }}>
              <Layers size={19} />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                Service Desk
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {currentBranchServices.length > 0 ? (
                  currentBranchServices.map((srv) => {
                    const isSelected = srv.id === selectedServiceId;
                    const hasOpenQueue = queues.some(
                      (q) => (q.serviceId === srv.id || q.service?.id === srv.id) && q.status === 'OPEN'
                    );
                    const hasAnyQueue = queues.some(
                      (q) => (q.serviceId === srv.id || q.service?.id === srv.id)
                    );

                    return (
                      <button
                        key={srv.id}
                        type="button"
                        onClick={() => handleServiceChange(srv.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 7,
                          padding: '6px 14px',
                          borderRadius: 20,
                          border: isSelected ? '2px solid #007bff' : '1px solid var(--border-subtle)',
                          background: isSelected ? 'rgba(0, 123, 255, 0.08)' : '#f8fafc',
                          color: isSelected ? '#007bff' : 'var(--text-main)',
                          fontWeight: isSelected ? 700 : 500,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: hasOpenQueue ? '#10b981' : hasAnyQueue ? '#f59e0b' : '#cbd5e1'
                          }}
                          title={hasOpenQueue ? 'Queue is OPEN' : hasAnyQueue ? 'Queue is PAUSED/CLOSED' : 'Queue Not Opened Today'}
                        />
                        <span>{srv.name}</span>
                        {srv.avgDurationMinutes && (
                          <span style={{ fontSize: '0.72rem', color: isSelected ? '#007bff' : 'var(--text-muted)', opacity: 0.85 }}>
                            ~{srv.avgDurationMinutes}m
                          </span>
                        )}
                      </button>
                    );
                  })
                ) : (
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    No services in this branch.
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right side: Active Desk Status Badge & Quick Open */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {selectedQueue ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              background: selectedQueue.status === 'OPEN' ? '#f0fdf4' : '#fffbeb',
              border: `1px solid ${selectedQueue.status === 'OPEN' ? '#bbf7d0' : '#fde68a'}`,
              borderRadius: 10,
              fontSize: '0.82rem',
              fontWeight: 600,
              color: selectedQueue.status === 'OPEN' ? '#166534' : '#92400e'
            }}>
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: selectedQueue.status === 'OPEN' ? '#16a34a' : '#d97706'
              }} />
              <span>Desk: <strong>{selectedQueue.status}</strong></span>
            </div>
          ) : currentService && !isPast ? (
            <button
              onClick={() => handleOpenQueueForDate(currentService.id)}
              disabled={actionLoading}
              className="btn-primary"
              style={{ padding: '7px 16px', fontSize: '0.84rem' }}
            >
              <Sparkles size={15} /> Open Queue for {currentService.name}
            </button>
          ) : null}
        </div>
      </div>

      {/* Info / Quick Setup if Selected Service Queue is Not Open for this Date */}
      {!selectedQueue && currentService && (
        <div style={{
          background: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: 14,
          padding: '20px 24px',
          marginBottom: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ background: '#fef3c7', padding: 12, borderRadius: 12, color: '#d97706' }}>
              <Calendar size={26} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#92400e' }}>
                Queue Desk for "{currentService.name}" is Not Active on {formatDisplayDate(selectedDate)}
              </div>
              <p style={{ color: '#b45309', fontSize: '0.86rem', marginTop: 3 }}>
                {isPast 
                  ? `No queue sessions were recorded for this service on ${formatDisplayDate(selectedDate)}.` 
                  : `Open the queue desk for ${currentService.name} (${currentBranch?.name || 'Main Branch'}) to begin issuing and calling tokens.`}
              </p>
            </div>
          </div>

          {!isPast && (
            <button
              onClick={() => handleOpenQueueForDate(currentService.id)}
              disabled={actionLoading}
              className="btn-primary"
              style={{ padding: '10px 20px', fontSize: '0.88rem' }}
            >
              <Sparkles size={16} /> {actionLoading ? 'Opening...' : `Open Queue for ${currentService.name}`}
            </button>
          )}
        </div>
      )}

      {/* If No Services exist at all in the business */}
      {allServices.length === 0 && (
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
                No Services Configured
              </div>
              <p style={{ color: '#b45309', fontSize: '0.88rem', marginTop: 3 }}>
                Initialize your first branch and service queue to start taking walk-in customers and appointments.
              </p>
            </div>
          </div>

          <button
            onClick={handleQuickSetupQueue}
            disabled={actionLoading}
            className="btn-primary"
            style={{ padding: '10px 22px', fontSize: '0.88rem' }}
          >
            <Sparkles size={16} /> {actionLoading ? 'Initializing...' : 'Initialize & Open First Queue'}
          </button>
        </div>
      )}

      <div className="dashboard-layout">
        {/* Left / Main Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Queue Overview Summary Cards */}
          <div className="shining-card" style={{ padding: 24, background: '#ffffff' }}>
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
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginTop: 8 }}>
                  {selectedQueue?.service?.name || currentService?.name || 'Main Desk'}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <MapPin size={12} color="var(--text-muted)" />
                  <span>{currentBranch?.name || 'Main Branch'}{currentBranch?.city ? `, ${currentBranch.city}` : ''}</span>
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
          <div className="shining-card glass-panel-glow" style={{ padding: 32, textAlign: 'center', background: 'linear-gradient(180deg, #ffffff 0%, #f0f7ff 100%)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 8 }}>
              Currently Called / Serving at Desk
            </div>

            {selectedQueue ? (
              servingCustomer ? (
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
              )
            ) : (
              <div style={{ padding: '24px 0', color: 'var(--text-dim)' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#92400e', marginBottom: 8 }}>
                  Desk Inactive
                </div>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                  Queue for {currentService?.name || 'this service'} is not open today.
                </p>
                {currentService && !isPast && (
                  <button
                    onClick={() => handleOpenQueueForDate(currentService.id)}
                    disabled={actionLoading}
                    className="btn-primary"
                    style={{ margin: '0 auto', padding: '8px 20px', fontSize: '0.88rem' }}
                  >
                    <Sparkles size={16} /> Open Queue Desk
                  </button>
                )}
              </div>
            )}

            {selectedQueue && (
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
            )}
          </div>

          {/* Waiting List Table matching Reference Mockup */}
          <div className="shining-card" style={{ padding: 24, background: '#ffffff' }}>
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
          <div className="shining-card" style={{ padding: 24, background: '#ffffff' }}>
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
                  Queue for <strong>{currentService?.name || 'this service'}</strong> ({currentBranch?.name || 'Main Branch'}) is not active on {formatDisplayDate(selectedDate)}. Open it now to issue this ticket?
                </p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                  <button type="button" onClick={() => setShowWalkInModal(false)} className="btn-secondary">
                    Cancel
                  </button>
                  {currentService ? (
                    <button 
                      type="button" 
                      onClick={async () => {
                        await handleOpenQueueForDate(currentService.id);
                      }} 
                      disabled={actionLoading}
                      className="btn-primary"
                    >
                      <Sparkles size={16} /> Open Queue Now
                    </button>
                  ) : (
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
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={handleAddWalkIn}>
                <div style={{ 
                  background: '#f8fafc', 
                  border: '1px solid var(--border-subtle)', 
                  padding: '10px 14px', 
                  borderRadius: 10, 
                  fontSize: '0.84rem', 
                  color: 'var(--text-muted)', 
                  marginBottom: 16,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 8
                }}>
                  <div>
                    Branch: <strong style={{ color: 'var(--text-main)' }}>{currentBranch?.name || 'Main Branch'}</strong>
                    <span style={{ margin: '0 6px', color: 'var(--border-subtle)' }}>•</span>
                    Desk: <strong style={{ color: '#007bff' }}>{selectedQueue?.service?.name || currentService?.name}</strong>
                  </div>
                  <div>
                    Date: <strong style={{ color: 'var(--text-main)' }}>{formatDisplayDate(selectedDate)}</strong>
                  </div>
                </div>

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
