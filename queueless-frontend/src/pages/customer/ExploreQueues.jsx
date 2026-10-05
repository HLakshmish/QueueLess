import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Search, MapPin, Clock, Users, ArrowRight, CheckCircle2, AlertCircle, Building2, Sparkles, Lock, Ticket, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

function getFormattedDateString(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatShortDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  return dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function formatFullDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  return dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getQueueWaitLevel(waitingCount, estWait) {
  if (waitingCount <= 2 || estWait <= 15) return 'low';
  if (waitingCount <= 8 || estWait <= 45) return 'moderate';
  return 'busy';
}

const WAIT_LABELS = {
  low: 'Available',
  moderate: 'Moderate Wait',
  busy: 'Busy',
};

export default function ExploreQueues({ 
  onTicketIssued, 
  onJoinBusiness, 
  onRequireLogin, 
  onRequireRegister,
  pendingJoinQueue,
  onClearPendingQueue 
}) {
  const { user } = useAuth();
  const todayStr = getFormattedDateString();
  const tomorrowObj = new Date();
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrowStr = getFormattedDateString(tomorrowObj);

  const [selectedDate, setSelectedDate] = useState(() => getFormattedDateString());
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedService, setSelectedService] = useState(null);
  const [authRequiredService, setAuthRequiredService] = useState(null);
  const [joining, setJoining] = useState(false);
  const [message, setMessage] = useState(null);
  const [modalError, setModalError] = useState(null);
  const [activeTicketsMap, setActiveTicketsMap] = useState({});

  useEffect(() => {
    loadBusinesses(search, selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    if (user) {
      loadActiveTickets();
    } else {
      setActiveTicketsMap({});
    }
  }, [user]);

  // When user logs in with a pending queue, auto-open the join confirmation modal or go to ticket
  useEffect(() => {
    if (user && pendingJoinQueue) {
      const existingEntry = activeTicketsMap[pendingJoinQueue.queue?.id];
      if (existingEntry) {
        if (onTicketIssued) {
          onTicketIssued(existingEntry.id);
        }
        if (onClearPendingQueue) {
          onClearPendingQueue();
        }
        return;
      }
      setSelectedService(pendingJoinQueue);
      setModalError(null);
      if (onClearPendingQueue) {
        onClearPendingQueue();
      }
    }
  }, [user, pendingJoinQueue, activeTicketsMap]);

  async function loadActiveTickets() {
    try {
      const res = await api.getCustomerHistory();
      if (res.success && res.data) {
        const map = {};
        res.data.forEach((entry) => {
          if (['WAITING', 'CALLED', 'CHECKED_IN', 'SERVING'].includes(entry.status)) {
            map[entry.queueId] = entry;
          }
        });
        setActiveTicketsMap(map);
      }
    } catch (e) {
      // Ignore background errors
    }
  }

  async function loadBusinesses(query = search, dateToLoad = selectedDate) {
    setLoading(true);
    try {
      const params = {};
      if (query) params.query = query;
      if (dateToLoad) params.date = dateToLoad;
      const res = await api.getBusinesses(params);
      if (res.success) {
        setBusinesses(res.data);
      }
    } catch (err) {
      console.error('Failed to load businesses:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleSearch = (e) => {
    e.preventDefault();
    loadBusinesses(search, selectedDate);
  };

  const handleInitiateJoin = (service, activeQueue, branch, biz) => {
    setModalError(null);
    if (!user) {
      setAuthRequiredService({ service, queue: activeQueue, branch, biz, targetDate: selectedDate });
      return;
    }
    // If already in this queue, navigate directly to ticket
    if (activeQueue && activeTicketsMap[activeQueue.id]) {
      if (onTicketIssued) {
        onTicketIssued(activeTicketsMap[activeQueue.id].id);
      }
      return;
    }
    setSelectedService({ service, queue: activeQueue, branch, biz, targetDate: selectedDate });
  };

  const handleJoinQueue = async (queue) => {
    if (!user) {
      setAuthRequiredService(selectedService);
      setSelectedService(null);
      return;
    }
    setJoining(true);
    setMessage(null);
    setModalError(null);
    try {
      let res;
      if (queue?.id) {
        res = await api.joinQueue(queue.id, {
          customerName: user.fullName,
          customerPhone: user.phone || '',
        });
      } else if (selectedService?.service?.id) {
        res = await api.joinServiceQueue(selectedService.service.id, {
          date: selectedDate,
          customerName: user.fullName,
          customerPhone: user.phone || '',
        });
      }

      if (res && res.success) {
        setMessage({ type: 'success', text: `Successfully joined for ${formatFullDate(selectedDate)}! Your Queue Number is #${res.data.entry.queueNumber}` });
        setSelectedService(null);
        await loadActiveTickets();
        if (onTicketIssued) {
          onTicketIssued(res.data.entry.id);
        }
      }
    } catch (err) {
      const errMsg = err.message || 'Failed to join queue';
      setModalError(errMsg);
      setMessage({ type: 'error', text: errMsg });
      if (errMsg.toLowerCase().includes('already in this queue')) {
        loadActiveTickets();
      }
    } finally {
      setJoining(false);
    }
  };

  const handleCancelAndRejoin = async (queue) => {
    if (!user) return;
    setJoining(true);
    setModalError(null);
    try {
      let existingEntry = queue?.id ? activeTicketsMap[queue.id] : null;
      if (!existingEntry && queue?.id) {
        const histRes = await api.getCustomerHistory();
        if (histRes.success && histRes.data) {
          existingEntry = histRes.data.find(e => e.queueId === queue.id && ['WAITING', 'CALLED', 'CHECKED_IN', 'SERVING'].includes(e.status));
        }
      }

      if (existingEntry) {
        await api.cancelEntry(existingEntry.id);
      }

      let res;
      if (queue?.id) {
        res = await api.joinQueue(queue.id, {
          customerName: user.fullName,
          customerPhone: user.phone || '',
        });
      } else if (selectedService?.service?.id) {
        res = await api.joinServiceQueue(selectedService.service.id, {
          date: selectedDate,
          customerName: user.fullName,
          customerPhone: user.phone || '',
        });
      }

      if (res && res.success) {
        setMessage({ type: 'success', text: `Successfully joined for ${formatFullDate(selectedDate)}! Your Queue Number is #${res.data.entry.queueNumber}` });
        setSelectedService(null);
        await loadActiveTickets();
        if (onTicketIssued) {
          onTicketIssued(res.data.entry.id);
        }
      }
    } catch (err) {
      setModalError(err.message || 'Failed to cancel and rejoin queue');
    } finally {
      setJoining(false);
    }
  };

  const isSelectedToday = selectedDate === todayStr;
  const isSelectedPast = selectedDate < todayStr;

  const categories = [
    'All',
    'Healthcare & Clinic',
    'Salon & Spa',
    'Restaurant & Food',
    'Banking & Financial',
    'Government Office',
    'Diagnostic Centre',
    'Vehicle Service',
  ];
  const [activeCategory, setActiveCategory] = useState('All');

  const filteredBusinesses = activeCategory === 'All' 
    ? businesses 
    : businesses.filter(b => b.category?.toLowerCase().includes(activeCategory.toLowerCase()));

  return (
    <div className="page-container" style={{ maxWidth: 1240 }}>
      {/* Join Us as Business Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #ede9fe 0%, #ffffff 50%, #f0fdf4 100%)',
        border: '1px solid #c7d2fe',
        borderRadius: 16,
        padding: '16px 24px',
        marginBottom: 32,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 15px rgba(99, 102, 241, 0.08)',
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            background: 'var(--accent-gradient)',
            color: '#fff',
            width: 44,
            height: 44,
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
          }}>
            <Building2 size={22} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#1e1b4b' }}>
              Run a Clinic, Salon, or Service Desk?
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Digitize customer queues, eliminate crowded lobbies, and scale across branches.
            </div>
          </div>
        </div>

        <button 
          onClick={onJoinBusiness}
          className="btn-primary"
          style={{ padding: '9px 18px', fontSize: '0.88rem', whiteSpace: 'nowrap' }}
        >
          <Sparkles size={15} /> Join Us as Business <ArrowRight size={15} />
        </button>
      </div>
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 2.8rem)', marginBottom: 12, letterSpacing: '-0.03em', lineHeight: 1.15 }}>
          Never Wait in Line.{' '}
          <span style={{ background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Join Queues Remotely.
          </span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: 680, margin: '0 auto', lineHeight: 1.6 }}>
          Real-time token management for clinics, salons, restaurants, banks, government desks, and diagnostic centers.
        </p>

        {/* Search Bar */}
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12, maxWidth: 640, margin: '28px auto 0' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input 
              type="text"
              className="form-input"
              style={{ paddingLeft: 44, borderRadius: 'var(--radius-lg)' }}
              placeholder="Search by clinic, doctor, salon, location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary">
            Search
          </button>
        </form>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: 20 }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`filter-pill${activeCategory === cat ? ' active' : ''}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Date Selector Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          marginTop: 22,
          flexWrap: 'wrap'
        }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Calendar size={16} color="#007bff" />
            Queue Date:
          </span>

          <button
            onClick={() => setSelectedDate(todayStr)}
            style={{
              padding: '7px 16px',
              borderRadius: 20,
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: isSelectedToday ? 'var(--accent-blue, #007bff)' : '#ffffff',
              color: isSelectedToday ? '#ffffff' : 'var(--text-main)',
              border: `1px solid ${isSelectedToday ? 'var(--accent-blue, #007bff)' : 'var(--border-subtle)'}`,
              boxShadow: isSelectedToday ? '0 4px 12px rgba(0, 123, 255, 0.25)' : '0 1px 3px rgba(0,0,0,0.02)',
              transition: 'all 0.15s ease'
            }}
          >
            Today ({formatShortDate(todayStr)})
          </button>

          <button
            onClick={() => setSelectedDate(tomorrowStr)}
            style={{
              padding: '7px 16px',
              borderRadius: 20,
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: selectedDate === tomorrowStr ? 'var(--accent-blue, #007bff)' : '#ffffff',
              color: selectedDate === tomorrowStr ? '#ffffff' : 'var(--text-main)',
              border: `1px solid ${selectedDate === tomorrowStr ? 'var(--accent-blue, #007bff)' : 'var(--border-subtle)'}`,
              boxShadow: selectedDate === tomorrowStr ? '0 4px 12px rgba(0, 123, 255, 0.25)' : '0 1px 3px rgba(0,0,0,0.02)',
              transition: 'all 0.15s ease'
            }}
          >
            Tomorrow ({formatShortDate(tomorrowStr)})
          </button>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: '#ffffff',
            border: '1px solid var(--border-subtle)',
            borderRadius: 20,
            padding: '5px 14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <Calendar size={14} color="var(--text-muted)" />
            <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-main)' }}>
              {selectedDate !== todayStr && selectedDate !== tomorrowStr ? formatShortDate(selectedDate) : 'Pick Date'}
            </span>
            <input
              type="date"
              value={selectedDate}
              min={todayStr}
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
                width: 22,
                overflow: 'hidden'
              }}
              title="Select custom date"
            />
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: isSelectedToday ? '#eff6ff' : isSelectedPast ? '#fffbeb' : '#f0fdf4',
            border: `1px solid ${isSelectedToday ? '#bfdbfe' : isSelectedPast ? '#fde68a' : '#bbf7d0'}`,
            color: isSelectedToday ? '#1d4ed8' : isSelectedPast ? '#b45309' : '#15803d',
            padding: '5px 12px',
            borderRadius: 20,
            fontSize: '0.8rem',
            fontWeight: 700
          }}>
            <span>📅 {formatFullDate(selectedDate)}</span>
          </div>
        </div>
      </div>

      {message && (
        <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Businesses Grid */}
      {loading ? (
        <div className="grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton skeleton-card" />
          ))}
        </div>
      ) : filteredBusinesses.length === 0 ? (
        <div className="glass-panel empty-state">
          <div className="empty-state-icon"><Search size={26} /></div>
          <h3>No active businesses found</h3>
          <p>Try clearing filters or adjusting your search term.</p>
        </div>
      ) : (
        <div className="grid-cols-2">
          {filteredBusinesses.map((biz) => (
            <div key={biz.id} className="glass-panel" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <span className="badge badge-waiting" style={{ marginBottom: 8 }}>{biz.category}</span>
                  <h3 style={{ fontSize: '1.4rem' }}>{biz.name}</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>{biz.description}</p>
                </div>
              </div>

              {/* Branches & Services */}
              <div style={{ marginTop: 20 }}>
                {biz.branches?.map((branch) => (
                  <div key={branch.id} style={{ background: '#f8fafc', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 16, marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                      <MapPin size={14} color="#007bff" />
                      <span style={{ fontWeight: 600 }}>{branch.name} — {branch.city}</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {branch.services?.map((service) => {
                        const activeQueue = service.queues?.[0];
                        const waitingCount = activeQueue?.entries?.length || 0;
                        const estWait = waitingCount * (service.avgDurationMinutes || 15);
                        const waitLevel = getQueueWaitLevel(waitingCount, estWait);

                        return (
                          <div 
                            key={service.id} 
                            style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              gap: 12,
                              flexWrap: 'wrap',
                              background: '#ffffff',
                              border: '1px solid var(--border-subtle)',
                              padding: '14px 16px',
                              borderRadius: 12,
                              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                              transition: 'box-shadow var(--transition-fast)'
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 180 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{service.name}</div>
                                {activeQueue && waitingCount >= 0 && (
                                  <span className={`queue-status queue-status-${waitLevel}`}>
                                    <span className="queue-status-dot" />
                                    {WAIT_LABELS[waitLevel]}
                                  </span>
                                )}
                              </div>
                              <div style={{ display: 'flex', gap: 16, fontSize: '0.78rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Users size={12} color="#f59e0b" /> {waitingCount} waiting
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Clock size={12} color="#10b981" /> ~{estWait} min wait
                                </span>
                              </div>
                            </div>

                            {activeQueue ? (
                              activeTicketsMap[activeQueue.id] ? (
                                <button
                                  onClick={() => onTicketIssued && onTicketIssued(activeTicketsMap[activeQueue.id].id)}
                                  className="btn-secondary"
                                  style={{
                                    padding: '8px 14px',
                                    fontSize: '0.84rem',
                                    background: '#f0fdf4',
                                    borderColor: '#86efac',
                                    color: '#15803d',
                                    fontWeight: 700,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6
                                  }}
                                  title="You already have an active ticket for this queue"
                                >
                                  <Ticket size={14} color="#16a34a" /> View Ticket #Q-{activeTicketsMap[activeQueue.id].queueNumber}
                                </button>
                              ) : (
                                <button 
                                  onClick={() => handleInitiateJoin(service, activeQueue, branch, biz)}
                                  className="btn-primary"
                                  style={{ padding: '8px 14px', fontSize: '0.85rem' }}
                                >
                                  Join Queue {isSelectedToday ? '' : `(${formatShortDate(selectedDate)})`} <ArrowRight size={14} />
                                </button>
                              )
                            ) : (
                              !isSelectedPast ? (
                                <button 
                                  onClick={() => handleInitiateJoin(service, null, branch, biz)}
                                  className="btn-primary"
                                  style={{ padding: '8px 14px', fontSize: '0.85rem', background: 'linear-gradient(135deg, #007bff 0%, #4f46e5 100%)' }}
                                >
                                  Join Queue {isSelectedToday ? '' : `(${formatShortDate(selectedDate)})`} <ArrowRight size={14} />
                                </button>
                              ) : (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Queue Closed</span>
                              )
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Auth Required Modal */}
      {authRequiredService && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 440, textAlign: 'center' }}>
            <div style={{
              width: 58,
              height: 58,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.12) 0%, rgba(79, 70, 229, 0.18) 100%)',
              color: '#4f46e5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 18px'
            }}>
              <Lock size={26} />
            </div>

            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: 8, color: 'var(--text-main)' }}>
              Sign In to Join Queue
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.5, marginBottom: 14 }}>
              To join the queue for <strong style={{ color: 'var(--text-main)' }}>{authRequiredService.service.name}</strong> at <strong style={{ color: 'var(--text-main)' }}>{authRequiredService.biz.name}</strong>, you need to sign in to your account first.
            </p>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              color: '#1d4ed8',
              padding: '4px 12px',
              borderRadius: 8,
              fontSize: '0.82rem',
              fontWeight: 700,
              marginBottom: 20
            }}>
              <Calendar size={13} /> Queue Date: {formatFullDate(selectedDate)}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button 
                onClick={() => {
                  const target = authRequiredService;
                  setAuthRequiredService(null);
                  if (onRequireLogin) onRequireLogin(target);
                }} 
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '0.92rem', borderRadius: 12 }}
              >
                Sign In to Continue <ArrowRight size={16} />
              </button>

              <button 
                onClick={() => {
                  const target = authRequiredService;
                  setAuthRequiredService(null);
                  if (onRequireRegister) onRequireRegister(target);
                }} 
                className="btn-secondary"
                style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: '0.88rem', borderRadius: 12 }}
              >
                Create an Account
              </button>

              <button 
                onClick={() => setAuthRequiredService(null)} 
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-dim)',
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  padding: '6px',
                  marginTop: 4
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Join Live Queue Modal for Authenticated Customer */}
      {selectedService && user && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3>Join Live Queue</h3>
              <p>{selectedService.biz.name} — {selectedService.service.name}</p>
            </div>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              color: '#1d4ed8',
              padding: '6px 14px',
              borderRadius: 10,
              fontSize: '0.85rem',
              fontWeight: 700,
              marginBottom: 18
            }}>
              <Calendar size={15} /> Queue Date: {formatFullDate(selectedDate)}
            </div>

            {modalError && (
              <div style={{
                background: 'rgba(244, 63, 94, 0.08)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                color: '#e11d48',
                padding: '12px 14px',
                borderRadius: 12,
                marginBottom: 16,
                fontSize: '0.85rem',
                display: 'flex',
                flexDirection: 'column',
                gap: 10
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <span>{modalError}</span>
                </div>
                {modalError.toLowerCase().includes('already in this queue') && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                    <button
                      onClick={() => {
                        const entry = activeTicketsMap[selectedService?.queue?.id];
                        setSelectedService(null);
                        if (onTicketIssued) onTicketIssued(entry?.id || null);
                      }}
                      className="btn-primary"
                      style={{ padding: '6px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <Ticket size={14} /> View My Active Ticket
                    </button>
                    <button
                      onClick={() => handleCancelAndRejoin(selectedService.queue)}
                      disabled={joining}
                      className="btn-secondary"
                      style={{ padding: '6px 14px', fontSize: '0.82rem', borderColor: '#fca5a5', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      {joining ? 'Rejoining...' : 'Cancel Old Ticket & Rejoin'}
                    </button>
                  </div>
                )}
              </div>
            )}

            <div style={{ background: '#f8fafc', border: '1px solid var(--border-subtle)', padding: 16, borderRadius: 12, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Estimated Wait:</span>
                <span style={{ fontWeight: 700, color: '#10b981' }}>
                  ~{(selectedService.queue?.entries?.length || 0) * (selectedService.service.avgDurationMinutes || 15)} mins
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>People Ahead:</span>
                <span style={{ fontWeight: 700, color: '#fbbf24' }}>
                  {selectedService.queue?.entries?.length || 0}
                </span>
              </div>
            </div>

            {/* Authenticated Customer Identity Badge */}
            <div style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)', border: '1px solid #a7f3d0', padding: 14, borderRadius: 12, marginBottom: 20 }}>
              <div style={{ fontSize: '0.74rem', color: '#047857', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 800, marginBottom: 4 }}>
                Joining Queue As
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#065f46' }}>
                {user.fullName}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#059669', marginTop: 2 }}>
                {user.phone ? `${user.phone} • ` : ''}{user.email}
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setSelectedService(null)} className="btn-secondary">Cancel</button>
              <button 
                onClick={() => handleJoinQueue(selectedService.queue)} 
                className="btn-primary"
                disabled={joining}
              >
                {joining ? 'Joining...' : 'Confirm & Take Token'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Join Us Call to Action */}
      <div className="glass-panel" style={{
        marginTop: 48,
        padding: '36px 32px',
        textAlign: 'center',
        background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'inline-flex', padding: 8, borderRadius: 12, background: '#ede9fe', color: '#4f46e5', marginBottom: 12 }}>
          <Sparkles size={24} />
        </div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Ready to Transform Your Customer Experience?</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: 560, margin: '8px auto 20px' }}>
          Choose from our flexible subscription plans, set up your branches and services in minutes, and manage queues in real-time.
        </p>
        <button 
          onClick={onJoinBusiness}
          className="btn-primary"
          style={{ padding: '12px 28px', fontSize: '0.95rem' }}
        >
          Explore Subscription Plans & Register <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
