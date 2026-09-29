import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Search, MapPin, Clock, Users, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ExploreQueues({ onTicketIssued }) {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedService, setSelectedService] = useState(null);
  const [joining, setJoining] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadBusinesses();
  }, []);

  async function loadBusinesses(query = '') {
    setLoading(true);
    try {
      const res = await api.getBusinesses(query ? `query=${encodeURIComponent(query)}` : '');
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
    loadBusinesses(search);
  };

  const handleJoinQueue = async (queue) => {
    setJoining(true);
    setMessage(null);
    try {
      const res = await api.joinQueue(queue.id, {
        customerName: user ? user.fullName : guestName,
        customerPhone: user ? user.phone : guestPhone,
      });

      if (res.success) {
        setMessage({ type: 'success', text: `Successfully joined! Your Queue Number is #${res.data.entry.queueNumber}` });
        setSelectedService(null);
        if (onTicketIssued) {
          onTicketIssued(res.data.entry.id);
        }
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to join queue' });
    } finally {
      setJoining(false);
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 20px' }}>
      {/* Hero Header */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: 12 }}>
          Never Wait in Line Again. <span style={{ background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Queue Remotely.</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: 650, margin: '0 auto' }}>
          Discover top clinics, salons, diagnostic centers, and service desks. View live waiting times and get notified when your turn arrives.
        </p>

        {/* Search Bar */}
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12, maxWidth: 600, margin: '28px auto 0' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input 
              type="text"
              className="form-input"
              style={{ paddingLeft: 44 }}
              placeholder="Search by clinic name, doctor, salon, category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary">
            Search
          </button>
        </form>
      </div>

      {message && (
        <div style={{
          padding: 16,
          borderRadius: 12,
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
          border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
          color: message.type === 'success' ? '#34d399' : '#fb7185',
        }}>
          {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Businesses Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading active businesses...</div>
      ) : businesses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60 }} className="glass-panel">
          <h3>No active businesses found</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>Try searching for "Apex" or reset search.</p>
        </div>
      ) : (
        <div className="grid-cols-2">
          {businesses.map((biz) => (
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
                      <MapPin size={14} color="#6366f1" />
                      <span style={{ fontWeight: 600 }}>{branch.name} — {branch.city}</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {branch.services?.map((service) => {
                        const activeQueue = service.queues?.[0];
                        const waitingCount = activeQueue?.entries?.length || 0;
                        const estWait = waitingCount * (service.avgDurationMinutes || 15);

                        return (
                          <div 
                            key={service.id} 
                            style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              background: '#ffffff',
                              border: '1px solid var(--border-subtle)',
                              padding: '12px 16px',
                              borderRadius: 10,
                              boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{service.name}</div>
                              <div style={{ display: 'flex', gap: 16, marginTop: 4, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Users size={12} color="#f59e0b" /> {waitingCount} waiting
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Clock size={12} color="#10b981" /> ~{estWait} mins wait
                                </span>
                              </div>
                            </div>

                            {activeQueue ? (
                              <button 
                                onClick={() => setSelectedService({ service, queue: activeQueue, branch, biz })}
                                className="btn-primary"
                                style={{ padding: '8px 14px', fontSize: '0.85rem' }}
                              >
                                Join Queue <ArrowRight size={14} />
                              </button>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Queue Closed</span>
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

      {/* Join Modal */}
      {selectedService && (
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
          <div className="glass-panel" style={{ width: '100%', maxWidth: 480, padding: 32, background: '#ffffff', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <h3 style={{ fontSize: '1.4rem', marginBottom: 8 }}>Join Live Queue</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 20 }}>
              {selectedService.biz.name} — {selectedService.service.name}
            </p>

            <div style={{ background: '#f8fafc', border: '1px solid var(--border-subtle)', padding: 16, borderRadius: 12, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Estimated Wait:</span>
                <span style={{ fontWeight: 700, color: '#10b981' }}>
                  ~{(selectedService.queue.entries?.length || 0) * (selectedService.service.avgDurationMinutes || 15)} mins
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>People Ahead:</span>
                <span style={{ fontWeight: 700, color: '#fbbf24' }}>
                  {selectedService.queue.entries?.length || 0}
                </span>
              </div>
            </div>

            {!user && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Your Full Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. John Doe"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Mobile Number (for SMS alert)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. +91 9876543210"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
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
    </div>
  );
}
