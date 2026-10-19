import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Search, MapPin, Clock, Users, ArrowRight, CheckCircle2, AlertCircle, Building2, Sparkles, Lock, Ticket, Calendar, ChevronLeft, ChevronRight, Zap, Activity, ShieldCheck, Coffee, X } from 'lucide-react';
import exploreHeroBanner from '../../assets/explore_hero_banner.jpg';

const CATEGORY_ICONS = {
  'All': Sparkles,
  'Healthcare & Clinic': Activity,
  'Salon & Spa': Sparkles,
  'Restaurant & Food': Coffee,
  'Banking & Financial': Building2,
  'Hospital & Diagnostic': CheckCircle2,
  'Diagnostic Centre': CheckCircle2,
  'Automotive & Service': Zap,
  'Vehicle Service': Zap,
  'Government & Academic': ShieldCheck,
  'Government Office': ShieldCheck,
};

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

  const resultsRef = useRef(null);

  const scrollToResults = () => {
    if (resultsRef.current) {
      const rect = resultsRef.current.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const targetY = rect.top + scrollTop - 80;
      window.scrollTo({
        top: Math.max(0, targetY),
        behavior: 'smooth'
      });
    }
  };

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    setActiveCategory('All');
    loadBusinesses(search, selectedDate);
    setTimeout(() => {
      scrollToResults();
    }, 120);
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    if (val.trim() === '') {
      setActiveCategory('All');
      loadBusinesses('', selectedDate);
    }
  };

  const handleClearSearch = () => {
    setSearch('');
    setActiveCategory('All');
    loadBusinesses('', selectedDate);
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
    'Diagnostic Centre',
    'Government Office',
    'Vehicle Service',
  ];
  const [activeCategory, setActiveCategory] = useState('All');

  const handleCategorySelect = (cat) => {
    setActiveCategory(cat);
    if (search.trim() !== '') {
      setSearch('');
      loadBusinesses('', selectedDate);
    }
    setTimeout(() => {
      scrollToResults();
    }, 100);
  };

  const filteredBusinesses = activeCategory === 'All' 
    ? businesses 
    : businesses.filter(b => {
        if (!b.category) return false;
        const bCat = b.category.toLowerCase();
        const aCat = activeCategory.toLowerCase();
        if (bCat === aCat || bCat.includes(aCat) || aCat.includes(bCat)) return true;
        const tokens = aCat.split(/[\s&,/]+/).filter(t => t.length > 2);
        return tokens.some(t => bCat.includes(t));
      });

  // Total open queues count across active businesses
  const totalOpenQueues = React.useMemo(() => {
    let count = 0;
    businesses.forEach((biz) => {
      biz.branches?.forEach((branch) => {
        branch.services?.forEach((service) => {
          service.queues?.forEach((q) => {
            if (q.status === 'OPEN') count++;
          });
        });
      });
    });
    return count;
  }, [businesses]);

  return (
    <div className="page-container" style={{ maxWidth: 1240 }}>
      {/* Sleek Centered Pill Announcement Badge matching Reference Design */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
        <button
          onClick={onJoinBusiness}
          type="button"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.96) 0%, rgba(245, 247, 255, 0.92) 100%)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1.5px solid rgba(199, 210, 254, 0.85)',
            borderRadius: 9999,
            padding: '5px 18px 5px 6px',
            boxShadow: '0 6px 22px -4px rgba(99, 102, 241, 0.12), 0 2px 6px rgba(0, 0, 0, 0.02)',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            position: 'relative'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 10px 28px -4px rgba(99, 102, 241, 0.22), 0 4px 10px rgba(0, 0, 0, 0.04)';
            e.currentTarget.style.borderColor = 'rgba(129, 140, 248, 0.95)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = '0 6px 22px -4px rgba(99, 102, 241, 0.12), 0 2px 6px rgba(0, 0, 0, 0.02)';
            e.currentTarget.style.borderColor = 'rgba(199, 210, 254, 0.85)';
          }}
        >
          <div style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)',
            color: '#ffffff',
            width: 28,
            height: 28,
            borderRadius: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(99, 102, 241, 0.35)'
          }}>
            <Building2 size={14} />
          </div>

          <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 500 }}>
            Run a Clinic, Salon, or Service Desk?
          </span>

          <span style={{
            fontSize: '0.82rem',
            background: 'var(--accent-gradient)',
            color: '#ffffff',
            fontWeight: 800,
            padding: '4px 14px',
            borderRadius: 9999,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            boxShadow: '0 2px 10px rgba(99, 102, 241, 0.35)',
            letterSpacing: '0.01em',
            transition: 'all 0.15s ease'
          }}>
            Join Us as Business <ArrowRight size={13} color="#ffffff" />
          </span>
        </button>
      </div>

      {/* Apple-Inspired Radiant Hero Showcase */}
      <div className="shining-card" style={{
        padding: '44px 40px',
        marginBottom: 36,
        background: 'linear-gradient(135deg, #ffffff 0%, #f1f5fd 40%, #e6efff 100%)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1.5px solid #bfdbfe',
        borderRadius: 28,
        boxShadow: '0 20px 50px -15px rgba(59, 130, 246, 0.16), 0 4px 16px rgba(0, 0, 0, 0.03)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Ambient Indigo-Cyan Soft Radial Diffused Lighting */}
        <div style={{
          position: 'absolute',
          top: -100,
          left: -100,
          width: 340,
          height: 340,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.20) 0%, rgba(6, 182, 212, 0.09) 50%, transparent 70%)',
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute',
          bottom: -80,
          right: 320,
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.18) 0%, rgba(99, 102, 241, 0.09) 50%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 36, alignItems: 'center' }}>
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 16px',
              borderRadius: 24,
              background: 'linear-gradient(135deg, rgba(238, 242, 255, 0.95) 0%, rgba(245, 243, 255, 0.95) 100%)',
              border: '1px solid rgba(165, 180, 252, 0.7)',
              color: '#4338ca',
              fontSize: '0.78rem',
              fontWeight: 800,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginBottom: 18,
              boxShadow: '0 2px 8px rgba(99, 102, 241, 0.12)'
            }}>
              <Zap size={13} color="#4f46e5" fill="#4f46e5" /> Next-Gen Cloud Queue Stream
            </div>

            <h1 style={{
              fontSize: 'clamp(2.2rem, 4.2vw, 3rem)',
              marginBottom: 16,
              letterSpacing: '-0.035em',
              lineHeight: 1.15,
              fontWeight: 850,
              color: '#0f172a'
            }}>
              Never Wait in Line.{' '}
              <span style={{
                background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 50%, #7c3aed 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Join Queues Remotely.
              </span>
            </h1>

            <p style={{
              color: '#475569',
              fontSize: '1.04rem',
              maxWidth: 520,
              lineHeight: 1.6,
              marginBottom: 26
            }}>
              Real-time token management for clinics, diagnostic centers, salons, banks, and service desks. Get instant notifications when your turn arrives.
            </p>

            {/* Elegant Pill-Shaped Search Input with Inset Gradient Submit Button */}
            <form onSubmit={handleSearch} style={{ maxWidth: 520, width: '100%' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                background: '#ffffff',
                borderRadius: 9999,
                padding: '6px 6px 6px 20px',
                border: '2px solid rgba(129, 140, 248, 0.9)',
                boxShadow: '0 10px 32px -4px rgba(99, 102, 241, 0.18), 0 2px 8px rgba(0, 0, 0, 0.04)',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}>
                <Search size={19} color="#3b82f6" style={{ marginRight: 12, flexShrink: 0 }} />
                <input 
                  type="text"
                  style={{
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    fontSize: '0.96rem',
                    fontWeight: 500,
                    color: '#0f172a',
                    flex: 1,
                    padding: '8px 0',
                    minWidth: 0
                  }}
                  placeholder="Search clinic, doctor, salon, city..."
                  value={search}
                  onChange={handleSearchChange}
                />
                {search && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    style={{
                      background: '#f1f5f9',
                      border: 'none',
                      borderRadius: '50%',
                      width: 24,
                      height: 24,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: '#64748b',
                      marginRight: 8,
                      flexShrink: 0,
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#e2e8f0';
                      e.currentTarget.style.color = '#0f172a';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#f1f5f9';
                      e.currentTarget.style.color = '#64748b';
                    }}
                    title="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
                <button 
                  type="submit" 
                  style={{
                    background: 'var(--accent-gradient)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 9999,
                    padding: '10px 24px',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                    flexShrink: 0
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 6px 18px rgba(99, 102, 241, 0.45)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = '0 4px 14px rgba(99, 102, 241, 0.35)';
                  }}
                >
                  Search <ArrowRight size={15} />
                </button>
              </div>
            </form>
          </div>

          {/* Right Hero Image Card */}
          <div style={{
            position: 'relative',
            borderRadius: 24,
            overflow: 'hidden',
            boxShadow: '0 24px 50px -12px rgba(15, 23, 42, 0.18)',
            border: '2px solid rgba(255, 255, 255, 0.95)'
          }}>
            <img 
              src={exploreHeroBanner} 
              alt="QueueLess Smart Service Lounge" 
              style={{ width: '100%', height: 280, objectFit: 'cover', display: 'block' }}
            />



            {/* Top-Left Floating Active Queue Count Badge */}
            <div style={{
              position: 'absolute',
              top: 14,
              left: 14,
              background: 'rgba(255, 255, 255, 0.94)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.9)',
              borderRadius: 12,
              padding: '6px 12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 8px 20px -4px rgba(15, 23, 42, 0.1)'
            }}>
              <Zap size={13} color="#4f46e5" fill="#4f46e5" />
              <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#334155' }}>
                {totalOpenQueues > 0 
                  ? `${totalOpenQueues} Active Live ${totalOpenQueues === 1 ? 'Queue' : 'Queues'}`
                  : 'Live Queues Ready'}
              </span>
            </div>
          </div>
        </div>

        {/* Categories with Icons */}
        <div style={{
          display: 'flex',
          gap: 8,
          justifyContent: 'center',
          flexWrap: 'wrap',
          marginTop: 28,
          paddingTop: 22,
          borderTop: '1px solid rgba(199, 210, 254, 0.7)'
        }}>
          {categories.map((cat) => {
            const IconComp = CATEGORY_ICONS[cat] || Sparkles;
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => handleCategorySelect(cat)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 16px',
                  borderRadius: 24,
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: isActive ? 'var(--accent-gradient)' : 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)',
                  color: isActive ? '#ffffff' : '#334155',
                  border: `1.5px solid ${isActive ? 'transparent' : '#cbd5e1'}`,
                  boxShadow: isActive ? '0 4px 14px rgba(99, 102, 241, 0.35)' : '0 2px 6px rgba(0, 0, 0, 0.04)',
                  transform: isActive ? 'translateY(-1px)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <IconComp size={13} color={isActive ? '#ffffff' : '#4f46e5'} />
                <span>{cat}</span>
              </button>
            );
          })}
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
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'linear-gradient(135deg, #ffffff 0%, #f8faff 100%)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            padding: '7px 18px',
            borderRadius: 24,
            border: '1.5px solid #c7d2fe',
            boxShadow: '0 4px 18px -4px rgba(99, 102, 241, 0.12)',
            flexWrap: 'wrap'
          }}>
            <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={15} color="#4f46e5" />
              Queue Date:
            </span>

            <button
              onClick={() => setSelectedDate(todayStr)}
              style={{
                padding: '6px 15px',
                borderRadius: 18,
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: isSelectedToday ? 'var(--accent-gradient)' : '#f8fafc',
                color: isSelectedToday ? '#ffffff' : '#334155',
                border: `1px solid ${isSelectedToday ? 'transparent' : '#cbd5e1'}`,
                boxShadow: isSelectedToday ? '0 3px 10px rgba(99, 102, 241, 0.28)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              Today ({formatShortDate(todayStr)})
            </button>

            <button
              onClick={() => setSelectedDate(tomorrowStr)}
              style={{
                padding: '6px 15px',
                borderRadius: 18,
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: selectedDate === tomorrowStr ? 'var(--accent-gradient)' : '#f8fafc',
                color: selectedDate === tomorrowStr ? '#ffffff' : '#334155',
                border: `1px solid ${selectedDate === tomorrowStr ? 'transparent' : '#cbd5e1'}`,
                boxShadow: selectedDate === tomorrowStr ? '0 3px 10px rgba(99, 102, 241, 0.28)' : 'none',
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
              border: '1px solid #cbd5e1',
              borderRadius: 18,
              padding: '5px 12px'
            }}>
              <Calendar size={13} color="#4f46e5" />
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
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
                  color: '#4f46e5',
                  cursor: 'pointer',
                  outline: 'none',
                  width: 20
                }}
                title="Select custom date"
              />
            </div>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              background: isSelectedToday ? 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)' : isSelectedPast ? '#fffbeb' : '#f0fdf4',
              border: `1px solid ${isSelectedToday ? '#93c5fd' : isSelectedPast ? '#fde68a' : '#bbf7d0'}`,
              color: isSelectedToday ? '#1d4ed8' : isSelectedPast ? '#b45309' : '#15803d',
              padding: '4px 10px',
              borderRadius: 18,
              fontSize: '0.78rem',
              fontWeight: 800
            }}>
              <span>📅 {formatFullDate(selectedDate)}</span>
            </div>
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
      <div ref={resultsRef} style={{ scrollMarginTop: 85 }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 5,
              height: 24,
              borderRadius: 4,
              background: 'linear-gradient(180deg, #2563eb 0%, #4f46e5 100%)'
            }} />
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
              {activeCategory === 'All' 
                ? (search ? `Search Results for "${search}"` : 'Available Providers & Live Queues')
                : activeCategory}
            </h2>
            <span style={{
              background: 'linear-gradient(135deg, #e0e7ff 0%, #ede9fe 100%)',
              color: '#4338ca',
              border: '1px solid #c7d2fe',
              fontSize: '0.76rem',
              fontWeight: 800,
              padding: '3px 12px',
              borderRadius: 20,
              boxShadow: '0 2px 6px rgba(99, 102, 241, 0.1)'
            }}>
              {filteredBusinesses.length} {filteredBusinesses.length === 1 ? 'place' : 'places'}
            </span>
          </div>

          {(activeCategory !== 'All' || search) && (
            <button
              onClick={() => {
                setActiveCategory('All');
                setSearch('');
                loadBusinesses('', selectedDate);
              }}
              style={{
                background: '#ffffff',
                border: '1.5px solid #cbd5e1',
                borderRadius: 20,
                padding: '6px 14px',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#475569',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#c7d2fe';
                e.currentTarget.style.color = '#4f46e5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.color = '#475569';
              }}
            >
              <X size={13} /> Reset All
            </button>
          )}
        </div>

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
            {filteredBusinesses.map((biz) => {
              const BizIcon = CATEGORY_ICONS[biz.category] || Building2;
              return (
                <div 
                  key={biz.id} 
                  className="shining-card" 
                  style={{ 
                    position: 'relative',
                    padding: 0, 
                    background: '#ffffff',
                    borderRadius: 20,
                    border: '1.5px solid #cbd5e1',
                    boxShadow: '0 8px 30px -4px rgba(99, 102, 241, 0.10), 0 2px 8px -1px rgba(0, 0, 0, 0.05)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                  }}
                >
                  {/* Top Rainbow Accent Line */}
                  <div style={{
                    height: 3,
                    background: 'linear-gradient(90deg, #6366f1 0%, #3b82f6 50%, #06b6d4 100%)',
                    width: '100%'
                  }} />

                  <div style={{ padding: '24px 24px 20px 24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {/* Header with Icon, Category & Verified Badge */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
                      <div style={{
                        width: 50,
                        height: 50,
                        borderRadius: 15,
                        background: 'linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)',
                        border: '1.5px solid #c7d2fe',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: '0 4px 10px rgba(99, 102, 241, 0.12)'
                      }}>
                        <BizIcon size={24} color="#4f46e5" />
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                          <span style={{
                            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                            color: '#334155',
                            border: '1px solid #cbd5e1',
                            padding: '3px 10px',
                            borderRadius: 20,
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}>
                            {biz.category}
                          </span>

                          <span style={{
                            background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                            color: '#065f46',
                            border: '1px solid #a7f3d0',
                            padding: '3px 9px',
                            borderRadius: 20,
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}>
                            <ShieldCheck size={12} color="#059669" /> Verified
                          </span>
                        </div>

                        <h3 style={{ 
                          fontSize: '1.35rem', 
                          fontWeight: 800, 
                          color: '#0f172a',
                          lineHeight: 1.25,
                          letterSpacing: '-0.02em',
                          margin: 0
                        }}>
                          {biz.name}
                        </h3>

                        {biz.description && (
                          <p style={{ 
                            color: '#64748b', 
                            fontSize: '0.88rem', 
                            marginTop: 5, 
                            marginBottom: 0,
                            lineHeight: 1.5,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}>
                            {biz.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Branches & Services */}
                    <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {biz.branches?.map((branch) => (
                        <div 
                          key={branch.id} 
                          style={{
                            background: 'linear-gradient(135deg, #f8faff 0%, #f1f5f9 100%)',
                            border: '1.5px solid #cbd5e1',
                            borderRadius: 16,
                            padding: '14px 16px',
                            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)'
                          }}
                        >
                          {/* Branch Bar */}
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            gap: 8, 
                            paddingBottom: 10,
                            marginBottom: 10,
                            borderBottom: '1px dashed #cbd5e1'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.86rem', color: '#1e293b', fontWeight: 700 }}>
                              <div style={{
                                width: 22,
                                height: 22,
                                borderRadius: 6,
                                background: '#ede9fe',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                <MapPin size={13} color="#4f46e5" />
                              </div>
                              <span>{branch.name}</span>
                            </div>

                            <span style={{ 
                              fontSize: '0.74rem', 
                              fontWeight: 700, 
                              color: '#475569',
                              background: '#ffffff',
                              padding: '2px 9px',
                              borderRadius: 12,
                              border: '1px solid #cbd5e1'
                            }}>
                              {branch.city}
                            </span>
                          </div>

                          {/* Services List */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {branch.services?.map((service) => {
                              const activeQueue = service.queues?.[0];
                              const isQueueOpen = Boolean(activeQueue && activeQueue.status === 'OPEN');
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
                                    border: '1.5px solid #e2e8f0',
                                    borderLeft: `4px solid ${isQueueOpen ? '#4f46e5' : '#94a3b8'}`,
                                    padding: '12px 14px',
                                    borderRadius: 12,
                                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
                                  }}
                                >
                                  <div style={{ flex: 1, minWidth: 170 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 5 }}>
                                      <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f172a' }}>
                                        {service.name}
                                      </span>
                                      {isQueueOpen ? (
                                        <span className={`queue-status queue-status-${waitLevel}`}>
                                          <span className="queue-status-dot" />
                                          {WAIT_LABELS[waitLevel]}
                                        </span>
                                      ) : activeQueue?.status === 'PAUSED' ? (
                                        <span style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: 4,
                                          background: '#fffbeb',
                                          color: '#b45309',
                                          border: '1px solid #fde68a',
                                          padding: '2px 8px',
                                          borderRadius: 12,
                                          fontSize: '0.72rem',
                                          fontWeight: 700
                                        }}>
                                          <Clock size={11} color="#d97706" /> Paused
                                        </span>
                                      ) : (
                                        <span style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: 4,
                                          background: '#f1f5f9',
                                          color: '#64748b',
                                          border: '1px solid #e2e8f0',
                                          padding: '2px 8px',
                                          borderRadius: 12,
                                          fontSize: '0.72rem',
                                          fontWeight: 700
                                        }}>
                                          <Clock size={11} color="#64748b" /> {isSelectedPast ? 'Queue Closed' : 'Desk Not Opened'}
                                        </span>
                                      )}
                                    </div>

                                    {/* Stats Chips */}
                                    <div style={{ display: 'flex', gap: 8, fontSize: '0.75rem', flexWrap: 'wrap' }}>
                                      {isQueueOpen ? (
                                        <>
                                          <span style={{ 
                                            display: 'inline-flex', 
                                            alignItems: 'center', 
                                            gap: 4,
                                            background: '#fffbeb',
                                            border: '1px solid #fef3c7',
                                            color: '#b45309',
                                            fontWeight: 600,
                                            padding: '2px 8px',
                                            borderRadius: 6
                                          }}>
                                            <Users size={12} color="#f59e0b" /> {waitingCount} waiting
                                          </span>
                                          <span style={{ 
                                            display: 'inline-flex', 
                                            alignItems: 'center', 
                                            gap: 4,
                                            background: '#f0fdf4',
                                            border: '1px solid #dcfce7',
                                            color: '#15803d',
                                            fontWeight: 600,
                                            padding: '2px 8px',
                                            borderRadius: 6
                                          }}>
                                            <Clock size={12} color="#16a34a" /> ~{estWait} min wait
                                          </span>
                                        </>
                                      ) : (
                                        <span style={{ color: '#64748b', fontSize: '0.75rem' }}>
                                          {isSelectedPast 
                                            ? 'Queue session closed for this past date' 
                                            : `Business has not opened the desk queue for ${isSelectedToday ? 'today' : formatShortDate(selectedDate)} yet`}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Action CTA */}
                                  {isQueueOpen ? (
                                    activeTicketsMap[activeQueue.id] ? (
                                      <button
                                        onClick={() => onTicketIssued && onTicketIssued(activeTicketsMap[activeQueue.id].id)}
                                        className="btn-secondary"
                                        style={{
                                          padding: '8px 14px',
                                          fontSize: '0.82rem',
                                          background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                                          borderColor: '#86efac',
                                          color: '#15803d',
                                          fontWeight: 700,
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: 6,
                                          borderRadius: 10,
                                          boxShadow: '0 2px 6px rgba(22, 163, 74, 0.12)'
                                        }}
                                        title="You already have an active ticket for this queue"
                                      >
                                        <Ticket size={14} color="#16a34a" /> View Ticket #Q-{activeTicketsMap[activeQueue.id].queueNumber}
                                      </button>
                                    ) : (
                                      <button 
                                        onClick={() => handleInitiateJoin(service, activeQueue, branch, biz)}
                                        className="btn-primary"
                                        style={{ 
                                          padding: '8px 16px', 
                                          fontSize: '0.84rem',
                                          fontWeight: 700,
                                          borderRadius: 10,
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: 6,
                                          background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
                                          boxShadow: '0 3px 10px rgba(79, 70, 229, 0.28)'
                                        }}
                                      >
                                        Join Queue {isSelectedToday ? '' : `(${formatShortDate(selectedDate)})`} <ArrowRight size={14} />
                                      </button>
                                    )
                                  ) : (
                                    <button 
                                      disabled
                                      style={{ 
                                        padding: '8px 14px', 
                                        fontSize: '0.8rem', 
                                        fontWeight: 700,
                                        borderRadius: 10,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        background: '#f1f5f9',
                                        border: '1px solid #cbd5e1',
                                        color: '#94a3b8',
                                        cursor: 'not-allowed'
                                      }}
                                    >
                                      {isSelectedPast ? 'Closed' : 'Desk Not Opened'}
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
