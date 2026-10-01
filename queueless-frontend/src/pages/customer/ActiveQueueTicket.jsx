import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { subscribeToQueue } from '../../services/socket';
import { Clock, Users, CheckCircle, XCircle, Bell, MapPin, Building, Sparkles, Calendar } from 'lucide-react';

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
        // Find latest active entry
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

  // Subscribe to real-time WebSocket events for this queue
  useEffect(() => {
    if (!entry?.queueId) return;

    const unsubscribe = subscribeToQueue(entry.queueId, (msg) => {
      console.log('Real-time WS event received in Ticket view:', msg);
      // Refresh current entry data
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
      <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>
        Retrieving your digital queue pass...
      </div>
    );
  }

  if (!entry || ['SERVED', 'CANCELLED'].includes(entry.status)) {
    return (
      <div style={{ maxWidth: 600, margin: '60px auto', textAlign: 'center' }} className="glass-panel">
        <div style={{ padding: 48 }}>
          <Sparkles size={48} color="#818cf8" style={{ marginBottom: 16 }} />
          <h2 style={{ fontSize: '1.8rem', marginBottom: 8 }}>No Active Queue Entry</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
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

  return (
    <div style={{ maxWidth: 650, margin: '40px auto', padding: '0 20px' }}>
      {/* Alert banner if called */}
      {isCalled && (
        <div style={{
          background: 'linear-gradient(135deg, #eef2ff, #fdf4ff)',
          border: '2px solid #6366f1',
          borderRadius: 16,
          padding: 20,
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          animation: 'pulse 1.5s infinite',
          boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.2)'
        }}>
          <Bell size={32} color="#4f46e5" />
          <div>
            <h3 style={{ fontSize: '1.25rem', color: '#1e1b4b' }}>IT'S YOUR TURN!</h3>
            <p style={{ fontSize: '0.9rem', color: '#3730a3', marginTop: 2 }}>
              Please proceed immediately to the service desk. The business is ready for you.
            </p>
          </div>
        </div>
      )}

      {/* Main Digital Ticket Card */}
      <div className="glass-panel-glow" style={{ padding: 36, position: 'relative', overflow: 'hidden' }}>
        {/* Subtle decorative glow */}
        <div style={{
          position: 'absolute',
          top: -100,
          right: -100,
          width: 250,
          height: 250,
          borderRadius: '50%',
          background: 'rgba(99, 102, 241, 0.06)',
          filter: 'blur(60px)',
          pointerEvents: 'none'
        }} />

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px dashed var(--border-subtle)', paddingBottom: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <Building size={14} color="#007bff" />
              <span style={{ fontWeight: 600 }}>{entry.queue?.service?.branch?.business?.name || 'Apex Health Clinic'}</span>
            </div>
            <h2 style={{ fontSize: '1.5rem', marginTop: 4 }}>
              {entry.queue?.service?.name || 'General Consultation'}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-dim)', fontSize: '0.82rem', marginTop: 4 }}>
              <MapPin size={12} />
              <span>{entry.queue?.service?.branch?.name}, {entry.queue?.service?.branch?.city}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: 5 }}>
              <Calendar size={13} color="#007bff" />
              <span>Queue Date: <strong style={{ color: 'var(--text-main)' }}>{new Date(entry.queue?.date || entry.createdAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</strong></span>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span className={`badge badge-${entry.status.toLowerCase().replace('_', '-')}`}>
              {entry.status}
            </span>
          </div>
        </div>

        {/* Center: Hero Queue Number with Ticket Notch Styling */}
        <div style={{ textAlign: 'center', padding: '36px 0', background: 'radial-gradient(ellipse at center, rgba(37,99,235,0.05) 0%, transparent 70%)' }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>
            Your Token Number
          </div>
          <div className="queue-number-hero animate-float">
            #Q-{String(entry.queueNumber).padStart(3, '0')}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginTop: 8 }}>
            Ticket Holder: <strong style={{ color: 'var(--text-main)', fontWeight: 700 }}>{entry.customerName}</strong>
          </div>
        </div>

        {/* Live Wait Info Grid */}
        <div className="grid-cols-2" style={{ marginBottom: 24 }}>
          <div style={{
            background: '#ffffff',
            border: '1px solid var(--border-subtle)',
            borderRadius: 16,
            padding: 20,
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
              <Users size={24} color="#f59e0b" />
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#d97706' }}>
              {entry.peopleAhead || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              People Ahead of You
            </div>
          </div>

          <div style={{
            background: '#ffffff',
            border: '1px solid var(--border-subtle)',
            borderRadius: 16,
            padding: 20,
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
              <Clock size={24} color="#10b981" />
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0d9488' }}>
              ~{entry.estimatedWaitMinutes || 0}m
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Estimated Waiting Time
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
    </div>
  );
}
