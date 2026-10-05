import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { subscribeToQueue } from '../../services/socket';
import { Clock, Users, CheckCircle, XCircle, Bell, MapPin, Building, Sparkles, Calendar, Ticket } from 'lucide-react';

function getQueueWaitLevel(peopleAhead, estimatedWait) {
  if (peopleAhead <= 2 || estimatedWait <= 15) return 'low';
  if (peopleAhead <= 8 || estimatedWait <= 45) return 'moderate';
  return 'busy';
}

const WAIT_LABELS = {
  low: 'Available / Low Wait',
  moderate: 'Moderate Wait',
  busy: 'Busy',
};

export default function ActiveQueueTicket({ activeEntryId, onSelectExplore }) {
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (activeEntryId) {
      loadTicket(activeEntryId);
    } else {
      findActiveTicket();
    }
  }, [activeEntryId]);

  async function findActiveTicket() {
    setLoading(true);
    try {
      const res = await api.getCustomerHistory();
      if (res.success && res.data) {
        const active = res.data.find((e) => ['WAITING', 'CALLED', 'CHECKED_IN', 'SERVING'].includes(e.status));
        if (active) {
          loadTicket(active.id);
          return;
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadTicket(id) {
    try {
      const res = await api.getEntry(id);
      if (res.success) {
        setEntry(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!entry?.queueId) return;

    const unsubscribe = subscribeToQueue(entry.queueId, () => {
      if (entry.id) {
        loadTicket(entry.id);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [entry?.queueId, entry?.id]);

  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      const res = await api.checkIn(entry.id);
      if (res.success) {
        setEntry((prev) => ({ ...prev, status: 'CHECKED_IN' }));
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel your queue ticket?')) return;
    setActionLoading(true);
    try {
      const res = await api.cancelEntry(entry.id);
      if (res.success) {
        setEntry((prev) => ({ ...prev, status: 'CANCELLED' }));
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container" style={{ maxWidth: 650 }}>
        <div className="glass-panel" style={{ padding: 36 }}>
          <div className="skeleton skeleton-line short" />
          <div className="skeleton skeleton-line medium" style={{ marginTop: 16 }} />
          <div className="skeleton" style={{ height: 120, margin: '32px 0', borderRadius: 16 }} />
          <div className="stat-grid-2">
            <div className="skeleton" style={{ height: 100 }} />
            <div className="skeleton" style={{ height: 100 }} />
          </div>
        </div>
      </div>
    );
  }

  if (!entry || ['SERVED', 'CANCELLED'].includes(entry.status)) {
    return (
      <div className="page-container" style={{ maxWidth: 600 }}>
        <div className="glass-panel empty-state">
          <div className="empty-state-icon">
            <Sparkles size={28} />
          </div>
          <h2 style={{ fontSize: '1.6rem' }}>No Active Queue Entry</h2>
          <p>
            {entry?.status === 'SERVED'
              ? 'Your previous service was successfully completed! Have a wonderful day.'
              : 'You are currently not in any live business queues.'}
          </p>
          <button onClick={onSelectExplore} className="btn-primary">
            Explore & Join a Queue
          </button>
        </div>
      </div>
    );
  }

  const isCalled = entry.status === 'CALLED';
  const isServing = entry.status === 'SERVING';
  const isCheckedIn = entry.status === 'CHECKED_IN';
  const peopleAhead = entry.peopleAhead || 0;
  const estimatedWait = entry.estimatedWaitMinutes || 0;
  const waitLevel = getQueueWaitLevel(peopleAhead, estimatedWait);

  const servingEstimate = Math.max(1, entry.queueNumber - peopleAhead - 1);
  const progressSpan = Math.max(entry.queueNumber - servingEstimate, 1);
  const progressPercent = isCalled || isServing
    ? 100
    : Math.min(95, Math.max(5, ((entry.queueNumber - servingEstimate - peopleAhead) / progressSpan) * 100));

  return (
    <div className="page-container" style={{ maxWidth: 650, paddingTop: 24 }}>
      {isCalled && (
        <div className="alert alert-info" style={{ animation: 'pulse 1.5s infinite', borderWidth: 2 }}>
          <Bell size={28} style={{ flexShrink: 0 }} />
          <div>
            <h3 style={{ fontSize: '1.2rem', color: '#1e1b4b', marginBottom: 4 }}>It&apos;s your turn!</h3>
            <p style={{ fontSize: '0.88rem', color: '#3730a3' }}>
              Please proceed immediately to the service desk. The business is ready for you.
            </p>
          </div>
        </div>
      )}

      <div className="glass-panel-glow" style={{ padding: 32, position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute',
          top: -80,
          right: -80,
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: 'rgba(99, 102, 241, 0.05)',
          filter: 'blur(50px)',
          pointerEvents: 'none'
        }} />

        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          borderBottom: '1px dashed var(--border-subtle)',
          paddingBottom: 20,
          gap: 12,
          flexWrap: 'wrap'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <Building size={14} color="var(--accent-primary)" />
              <span style={{ fontWeight: 600 }}>{entry.queue?.service?.branch?.business?.name || 'Business'}</span>
            </div>
            <h2 style={{ fontSize: '1.45rem', marginTop: 4 }}>
              {entry.queue?.service?.name || 'General Consultation'}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-dim)', fontSize: '0.82rem', marginTop: 4 }}>
              <MapPin size={12} />
              <span>{entry.queue?.service?.branch?.name}, {entry.queue?.service?.branch?.city}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: 5 }}>
              <Calendar size={13} color="var(--accent-primary)" />
              <span>
                Queue Date:{' '}
                <strong style={{ color: 'var(--text-main)' }}>
                  {new Date(entry.queue?.date || entry.createdAt).toLocaleDateString('en-US', {
                    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
                  })}
                </strong>
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            <span className={`badge badge-${entry.status.toLowerCase().replace('_', '-')}`}>
              {entry.status.replace('_', ' ')}
            </span>
            {!isCalled && !isServing && (
              <span className={`queue-status queue-status-${waitLevel}`}>
                <span className="queue-status-dot" />
                {WAIT_LABELS[waitLevel]}
              </span>
            )}
          </div>
        </div>

        {/* Position hero */}
        <div className="position-hero">
          <div className="position-hero-label">Your Position</div>
          <div className="position-hero-number">
            #{String(entry.queueNumber).padStart(2, '0')}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 10 }}>
            Ticket <strong style={{ color: 'var(--text-main)' }}>#Q-{String(entry.queueNumber).padStart(3, '0')}</strong>
            {' · '}
            {entry.customerName}
          </div>
        </div>

        {/* Queue progress */}
        {!isCalled && !isServing && peopleAhead > 0 && (
          <div className="queue-progress">
            <div className="queue-progress-labels">
              <span>Serving ~#{servingEstimate}</span>
              <span>You are #{entry.queueNumber}</span>
            </div>
            <div className="queue-progress-track">
              <div className="queue-progress-fill" style={{ width: `${progressPercent}%` }} />
              <div className="queue-progress-marker" style={{ left: `${progressPercent}%` }} />
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="stat-grid-2" style={{ marginBottom: 24 }}>
          <div className="stat-card" style={{ textAlign: 'center' }}>
            <div className="stat-card-label" style={{ justifyContent: 'center' }}>
              <Users size={18} color="#f59e0b" />
              People Ahead
            </div>
            <div className="stat-card-value" style={{ color: '#d97706' }}>{peopleAhead}</div>
          </div>

          <div className="stat-card" style={{ textAlign: 'center' }}>
            <div className="stat-card-label" style={{ justifyContent: 'center' }}>
              <Clock size={18} color="#10b981" />
              Estimated Wait
            </div>
            <div className="stat-card-value" style={{ color: '#0d9488', fontSize: '1.75rem' }}>
              ~{estimatedWait} min
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          {!isCheckedIn && !isServing && (
            <button
              onClick={handleCheckIn}
              disabled={actionLoading}
              className="btn-success"
              style={{ padding: '12px 24px', fontSize: '0.95rem' }}
            >
              <CheckCircle size={18} /> I Have Arrived (Check In)
            </button>
          )}

          <button
            onClick={handleCancel}
            disabled={actionLoading}
            className="btn-danger"
            style={{ padding: '12px 24px', fontSize: '0.95rem' }}
          >
            <XCircle size={18} /> Leave / Cancel Ticket
          </button>
        </div>
      </div>

      <p style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.78rem', marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <Ticket size={13} />
        Updates automatically in real time when the queue moves
      </p>
    </div>
  );
}
