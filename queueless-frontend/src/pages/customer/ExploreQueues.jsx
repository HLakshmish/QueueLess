import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Search, MapPin, Clock, Users, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Building2, Sparkles, Lock, Ticket, Calendar, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Zap, Activity, ShieldCheck, Coffee, X } from 'lucide-react';
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

const CATEGORY_DEFAULT_IMAGES = {
  'Automotive & Service': 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=1000&q=80',
  'Vehicle Service': 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=1000&q=80',
  'Healthcare & Clinic': 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1000&q=80',
  'Hospital & Diagnostic': 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1000&q=80',
  'Diagnostic Centre': 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1000&q=80',
  'Salon & Spa': 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1000&q=80',
  'Restaurant & Food': 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1000&q=80',
  'Banking & Financial': 'https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?auto=format&fit=crop&w=1000&q=80',
  'Government & Academic': 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1000&q=80',
  'Government Office': 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1000&q=80',
};

function getBranchImage(branch, biz) {
  if (branch?.imageUrl && branch.imageUrl.trim() !== '') {
    return branch.imageUrl.trim();
  }
  if (biz?.category && CATEGORY_DEFAULT_IMAGES[biz.category]) {
    return CATEGORY_DEFAULT_IMAGES[biz.category];
  }
  const text = `${biz?.name || ''} ${branch?.name || ''} ${biz?.category || ''}`.toLowerCase();
  if (text.includes('car') || text.includes('wash') || text.includes('auto') || text.includes('vehicle') || text.includes('bike') || text.includes('motor')) {
    return CATEGORY_DEFAULT_IMAGES['Automotive & Service'];
  }
  if (text.includes('clinic') || text.includes('health') || text.includes('doctor') || text.includes('hospital') || text.includes('dental')) {
    return CATEGORY_DEFAULT_IMAGES['Healthcare & Clinic'];
  }
  if (text.includes('salon') || text.includes('spa') || text.includes('beauty') || text.includes('hair') || text.includes('barber')) {
    return CATEGORY_DEFAULT_IMAGES['Salon & Spa'];
  }
  if (text.includes('food') || text.includes('cafe') || text.includes('restaurant') || text.includes('coffee') || text.includes('dine')) {
    return CATEGORY_DEFAULT_IMAGES['Restaurant & Food'];
  }
  if (text.includes('bank') || text.includes('finance') || text.includes('loan')) {
    return CATEGORY_DEFAULT_IMAGES['Banking & Financial'];
  }
  return 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1000&q=80';
}

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
  const [selectedBranchTarget, setSelectedBranchTarget] = useState(null);

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

  const searchTimeoutRef = useRef(null);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (val.trim() === '') {
      setActiveCategory('All');
      loadBusinesses('', selectedDate);
    } else {
      searchTimeoutRef.current = setTimeout(() => {
        loadBusinesses(val, selectedDate);
      }, 350);
    }
  };

  const handleClearSearch = () => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
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

  const currentBranchData = React.useMemo(() => {
    if (!selectedBranchTarget) return null;
    const biz = businesses.find((b) => b.id === selectedBranchTarget.businessId);
    if (!biz) return null;
    const branch = biz.branches?.find((br) => br.id === selectedBranchTarget.branchId) || biz.branches?.[0] || null;
    return { business: biz, branch };
  }, [selectedBranchTarget, businesses]);

  const branchCards = React.useMemo(() => {
    const list = [];
    filteredBusinesses.forEach((biz) => {
      if (biz.branches && biz.branches.length > 0) {
        biz.branches.forEach((branch) => {
          list.push({
            cardKey: `${biz.id}-${branch.id}`,
            business: biz,
            branch: branch,
          });
        });
      } else {
        list.push({
          cardKey: `${biz.id}-main`,
          business: biz,
          branch: {
            id: 'main',
            name: 'Main Location',
            city: '',
            address: biz.address || '',
            services: biz.services || [],
          },
        });
      }
    });

    const term = (search || '').trim().toLowerCase();
    if (!term) return list;

    const terms = term.split(/\s+/).filter(Boolean);

    return list.filter(({ business: biz, branch }) => {
      const fullSearchableText = [
        biz.name,
        biz.category,
        biz.description,
        branch.name,
        branch.city,
        branch.address,
        branch.state,
        branch.postalCode,
        ...(branch.services || []).map(s => `${s.name || ''} ${s.description || ''}`)
      ].filter(Boolean).join(' ').toLowerCase();

      return fullSearchableText.includes(term) || terms.every(t => fullSearchableText.includes(t));
    });
  }, [filteredBusinesses, search]);

  return (
    <div style={{ width: '100%' }}>
      {currentBranchData ? (
        /* ========================================================
            INSIDE PAGE: DEDICATED BRANCH & SERVICE DESKS
           ======================================================== */
        (() => {
          const { business: currentBusiness, branch: currentBranch } = currentBranchData;
          const InsideBizIcon = CATEGORY_ICONS[currentBusiness.category] || Building2;
          const branchAddressText = [currentBranch.city, currentBranch.address].filter(Boolean).join(' • ') || 'Main Location';
          const openDesksCount = currentBranch.services?.filter(s => s.queues?.[0]?.status === 'OPEN').length || 0;
          const totalDesks = currentBranch.services?.length || 0;

          return (
            <div>
              {/* Edge-to-Edge Full-Width Branch Hero Photo Banner - Out from the div */}
              <div style={{
                position: 'relative',
                width: '100%',
                minHeight: 360,
                overflow: 'hidden',
                marginBottom: 28,
                borderBottom: '1px solid #e2e8f0',
                boxShadow: '0 12px 36px -8px rgba(15, 23, 42, 0.12)',
                background: '#0f172a'
              }}>
                {/* Full-width branch photo */}
                <img 
                  src={getBranchImage(currentBranch, currentBusiness)} 
                  alt={currentBranch.name} 
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center 40%',
                    display: 'block'
                  }}
                />

                {/* Subtle gradient overlay to ensure readability */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.55) 0%, rgba(15, 23, 42, 0.15) 45%, rgba(15, 23, 42, 0.78) 100%)'
                }} />

                {/* Top Floating Bar: Back Button & Live Desks status */}
                <div style={{
                  position: 'absolute',
                  top: 24,
                  left: 0,
                  right: 0,
                  zIndex: 3,
                  padding: '0 max(24px, calc((100vw - 1100px) / 2))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap'
                }}>
                  <button
                    type="button"
                    onClick={() => setSelectedBranchTarget(null)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      background: 'rgba(255, 255, 255, 0.94)',
                      backdropFilter: 'blur(16px)',
                      WebkitBackdropFilter: 'blur(16px)',
                      border: '1px solid #ffffff',
                      borderRadius: 24,
                      padding: '8px 20px',
                      fontSize: '0.86rem',
                      fontWeight: 700,
                      color: '#0f172a',
                      cursor: 'pointer',
                      boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.25)',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#ffffff';
                      e.currentTarget.style.transform = 'translateX(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.94)';
                      e.currentTarget.style.transform = 'none';
                    }}
                  >
                    <ArrowLeft size={16} /> Back to All Branches
                  </button>

                  <div style={{
                    background: openDesksCount > 0 ? 'rgba(240, 253, 244, 0.94)' : 'rgba(255, 255, 255, 0.94)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: `1px solid ${openDesksCount > 0 ? '#86efac' : '#e2e8f0'}`,
                    color: openDesksCount > 0 ? '#166534' : '#64748b',
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    padding: '8px 18px',
                    borderRadius: 9999,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.2)'
                  }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: openDesksCount > 0 ? '#16a34a' : '#94a3b8' }} />
                    {openDesksCount > 0 ? `${openDesksCount} ${openDesksCount === 1 ? 'Desk' : 'Desks'} Open Live` : 'Desks Closed'}
                  </div>
                </div>

                {/* Bottom Overlay Info on the Image: Branch Title & Category */}
                <div style={{
                  position: 'absolute',
                  bottom: 24,
                  left: 0,
                  right: 0,
                  zIndex: 3,
                  padding: '0 max(24px, calc((100vw - 1100px) / 2))',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  gap: 16,
                  flexWrap: 'wrap'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                      <span style={{
                        background: 'rgba(255, 255, 255, 0.22)',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        border: '1px solid rgba(255, 255, 255, 0.35)',
                        color: '#ffffff',
                        padding: '4px 14px',
                        borderRadius: 20,
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase'
                      }}>
                        Branch: {currentBranch.name}
                      </span>
                      <span style={{
                        background: 'rgba(255, 255, 255, 0.94)',
                        color: '#4338ca',
                        border: '1px solid #ffffff',
                        padding: '4px 12px',
                        borderRadius: 20,
                        fontSize: '0.76rem',
                        fontWeight: 800,
                        textTransform: 'uppercase'
                      }}>
                        {currentBusiness.category}
                      </span>
                      <span style={{
                        background: 'rgba(16, 185, 129, 0.92)',
                        color: '#ffffff',
                        border: '1px solid rgba(255, 255, 255, 0.4)',
                        padding: '4px 12px',
                        borderRadius: 20,
                        fontSize: '0.76rem',
                        fontWeight: 800,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5
                      }}>
                        <ShieldCheck size={13} color="#ffffff" /> Verified Business
                      </span>
                    </div>

                    <h1 style={{
                      fontSize: 'clamp(2rem, 3.8vw, 2.7rem)',
                      fontWeight: 850,
                      color: '#ffffff',
                      margin: 0,
                      letterSpacing: '-0.03em',
                      textShadow: '0 2px 14px rgba(0,0,0,0.5)'
                    }}>
                      {currentBusiness.name}
                    </h1>
                  </div>
                </div>
              </div>

              {/* Inside Page Content Container */}
              <div className="page-container" style={{ maxWidth: 1040, margin: '0 auto', paddingBottom: 60, paddingTop: 4 }}>
                {/* Top Overview & Action Box Widgets */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: 16,
                  marginBottom: 24
                }}>
                  {/* Box 1: Business Identity & Description Card */}
                  <div style={{
                    gridColumn: 'span 2',
                    background: '#ffffff',
                    borderRadius: 20,
                    border: '1.5px solid #e2e8f0',
                    padding: '20px 24px',
                    boxShadow: '0 4px 18px rgba(0, 0, 0, 0.03)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 16
                  }}>
                    <div style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      background: 'linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)',
                      border: '1.5px solid #c7d2fe',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#4f46e5',
                      flexShrink: 0,
                      boxShadow: '0 4px 12px rgba(99, 102, 241, 0.12)'
                    }}>
                      <InsideBizIcon size={24} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          color: '#4338ca',
                          fontSize: '0.86rem',
                          fontWeight: 700,
                          background: '#eef2ff',
                          padding: '4px 12px',
                          borderRadius: 14
                        }}>
                          <MapPin size={14} color="#4f46e5" />
                          {branchAddressText}
                        </span>
                        <span style={{
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          padding: '3px 10px',
                          borderRadius: 12,
                          background: '#ecfdf5',
                          color: '#059669',
                          border: '1px solid #a7f3d0'
                        }}>
                          ✓ Verified
                        </span>
                      </div>
                      {currentBusiness.description ? (
                        <p style={{
                          color: '#475569',
                          fontSize: '0.93rem',
                          lineHeight: 1.55,
                          margin: 0
                        }}>
                          {currentBusiness.description}
                        </p>
                      ) : (
                        <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: 0, fontStyle: 'italic' }}>
                          Official live queue desk operations for {currentBranch.name}.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Box 2: Desks Live Status Widget */}
                  <div style={{
                    background: '#ffffff',
                    borderRadius: 20,
                    border: '1.5px solid #e2e8f0',
                    padding: '20px 22px',
                    boxShadow: '0 4px 18px rgba(0, 0, 0, 0.03)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{
                        width: 46,
                        height: 46,
                        borderRadius: 14,
                        background: openDesksCount > 0 ? 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)' : '#f8fafc',
                        border: `1.5px solid ${openDesksCount > 0 ? '#a7f3d0' : '#e2e8f0'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: openDesksCount > 0 ? '#059669' : '#94a3b8'
                      }}>
                        <Zap size={22} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Service Desks
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                          <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a' }}>{openDesksCount}</span>
                          <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>/ {totalDesks} live</span>
                        </div>
                      </div>
                    </div>

                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 14px',
                      borderRadius: 20,
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      background: openDesksCount > 0 ? '#f0fdf4' : '#f1f5f9',
                      color: openDesksCount > 0 ? '#16a34a' : '#64748b',
                      border: `1.5px solid ${openDesksCount > 0 ? '#bbf7d0' : '#e2e8f0'}`
                    }}>
                      <span style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: openDesksCount > 0 ? '#16a34a' : '#94a3b8'
                      }} />
                      {openDesksCount > 0 ? 'Live Now' : 'Closed'}
                    </span>
                  </div>
                </div>

                {/* Date Selector Navigation - Modern Calendar Box Buttons UI */}
                <div style={{ marginBottom: 26 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    marginBottom: 12,
                    flexWrap: 'wrap'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: 10,
                        background: 'rgba(99, 102, 241, 0.1)',
                        color: '#4f46e5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Calendar size={16} />
                      </div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 850, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                        Queue Booking Date
                      </h3>
                    </div>
                    <span style={{
                      fontSize: '0.78rem',
                      color: '#64748b',
                      fontWeight: 600,
                      background: '#ffffff',
                      padding: '4px 12px',
                      borderRadius: 12,
                      border: '1px solid #e2e8f0'
                    }}>
                      Selected: <strong style={{ color: '#4f46e5' }}>{formatFullDate(selectedDate)}</strong>
                    </span>
                  </div>

                  {/* Responsive Box Buttons Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: 14
                  }}>
                    {/* Box Button 1: TODAY */}
                    <button
                      type="button"
                      onClick={() => setSelectedDate(todayStr)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        padding: '16px 20px',
                        borderRadius: 18,
                        border: isSelectedToday ? '2px solid transparent' : '1.5px solid #e2e8f0',
                        background: isSelectedToday 
                          ? 'linear-gradient(135deg, #1d4ed8 0%, #4338ca 100%)' 
                          : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                        color: isSelectedToday ? '#ffffff' : '#0f172a',
                        boxShadow: isSelectedToday 
                          ? '0 10px 25px -4px rgba(67, 56, 202, 0.42), 0 4px 12px rgba(29, 78, 216, 0.2)' 
                          : '0 2px 8px rgba(0, 0, 0, 0.03)',
                        transform: isSelectedToday ? 'translateY(-2px)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
                        textAlign: 'left',
                        position: 'relative'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 10 }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          padding: '3px 8px',
                          borderRadius: 8,
                          background: isSelectedToday ? 'rgba(255, 255, 255, 0.2)' : 'rgba(99, 102, 241, 0.1)',
                          color: isSelectedToday ? '#ffffff' : '#4f46e5'
                        }}>
                          <Sparkles size={11} /> TODAY
                        </span>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: 8,
                          background: isSelectedToday ? 'rgba(16, 185, 129, 0.25)' : '#ecfdf5',
                          color: isSelectedToday ? '#6ee7b7' : '#059669'
                        }}>
                          Live Now
                        </span>
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: 2 }}>
                        {formatShortDate(todayStr)}
                      </div>
                      <div style={{
                        fontSize: '0.76rem',
                        color: isSelectedToday ? 'rgba(255, 255, 255, 0.85)' : '#64748b',
                        fontWeight: 600
                      }}>
                        Real-time live queue booking
                      </div>
                    </button>

                    {/* Box Button 2: TOMORROW */}
                    <button
                      type="button"
                      onClick={() => setSelectedDate(tomorrowStr)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        padding: '16px 20px',
                        borderRadius: 18,
                        border: selectedDate === tomorrowStr ? '2px solid transparent' : '1.5px solid #e2e8f0',
                        background: selectedDate === tomorrowStr 
                          ? 'linear-gradient(135deg, #1d4ed8 0%, #4338ca 100%)' 
                          : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                        color: selectedDate === tomorrowStr ? '#ffffff' : '#0f172a',
                        boxShadow: selectedDate === tomorrowStr 
                          ? '0 10px 25px -4px rgba(67, 56, 202, 0.42), 0 4px 12px rgba(29, 78, 216, 0.2)' 
                          : '0 2px 8px rgba(0, 0, 0, 0.03)',
                        transform: selectedDate === tomorrowStr ? 'translateY(-2px)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
                        textAlign: 'left',
                        position: 'relative'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 10 }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          padding: '3px 8px',
                          borderRadius: 8,
                          background: selectedDate === tomorrowStr ? 'rgba(255, 255, 255, 0.2)' : 'rgba(99, 102, 241, 0.1)',
                          color: selectedDate === tomorrowStr ? '#ffffff' : '#4f46e5'
                        }}>
                          <Clock size={11} /> TOMORROW
                        </span>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: 8,
                          background: selectedDate === tomorrowStr ? 'rgba(255, 255, 255, 0.2)' : '#eff6ff',
                          color: selectedDate === tomorrowStr ? '#bfdbfe' : '#2563eb'
                        }}>
                          Pre-book
                        </span>
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: 2 }}>
                        {formatShortDate(tomorrowStr)}
                      </div>
                      <div style={{
                        fontSize: '0.76rem',
                        color: selectedDate === tomorrowStr ? 'rgba(255, 255, 255, 0.85)' : '#64748b',
                        fontWeight: 600
                      }}>
                        Advance token reservation
                      </div>
                    </button>

                    {/* Box Button 3: CUSTOM DATE PICKER */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        padding: '16px 20px',
                        borderRadius: 18,
                        border: (selectedDate !== todayStr && selectedDate !== tomorrowStr) ? '2px solid transparent' : '1.5px solid #e2e8f0',
                        background: (selectedDate !== todayStr && selectedDate !== tomorrowStr) 
                          ? 'linear-gradient(135deg, #1d4ed8 0%, #4338ca 100%)' 
                          : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                        color: (selectedDate !== todayStr && selectedDate !== tomorrowStr) ? '#ffffff' : '#0f172a',
                        boxShadow: (selectedDate !== todayStr && selectedDate !== tomorrowStr) 
                          ? '0 10px 25px -4px rgba(67, 56, 202, 0.42), 0 4px 12px rgba(29, 78, 216, 0.2)' 
                          : '0 2px 8px rgba(0, 0, 0, 0.03)',
                        transform: (selectedDate !== todayStr && selectedDate !== tomorrowStr) ? 'translateY(-2px)' : 'none',
                        position: 'relative',
                        cursor: 'pointer',
                        transition: 'all 0.22s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 10 }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          padding: '3px 8px',
                          borderRadius: 8,
                          background: (selectedDate !== todayStr && selectedDate !== tomorrowStr) ? 'rgba(255, 255, 255, 0.2)' : 'rgba(99, 102, 241, 0.1)',
                          color: (selectedDate !== todayStr && selectedDate !== tomorrowStr) ? '#ffffff' : '#4f46e5'
                        }}>
                          <Calendar size={11} /> OTHER DATE
                        </span>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: 8,
                          background: (selectedDate !== todayStr && selectedDate !== tomorrowStr) ? 'rgba(255, 255, 255, 0.2)' : '#f1f5f9',
                          color: (selectedDate !== todayStr && selectedDate !== tomorrowStr) ? '#ffffff' : '#64748b'
                        }}>
                          Calendar ▾
                        </span>
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: 2 }}>
                        {selectedDate !== todayStr && selectedDate !== tomorrowStr ? formatShortDate(selectedDate) : 'Pick A Date'}
                      </div>
                      <div style={{
                        fontSize: '0.76rem',
                        color: (selectedDate !== todayStr && selectedDate !== tomorrowStr) ? 'rgba(255, 255, 255, 0.85)' : '#64748b',
                        fontWeight: 600
                      }}>
                        {selectedDate !== todayStr && selectedDate !== tomorrowStr ? formatFullDate(selectedDate) : 'Select future calendar day'}
                      </div>

                      {/* Hidden full-area date input */}
                      <input
                        type="date"
                        value={selectedDate}
                        min={todayStr}
                        onChange={(e) => {
                          if (e.target.value) setSelectedDate(e.target.value);
                        }}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          opacity: 0,
                          cursor: 'pointer',
                          width: '100%',
                          height: '100%'
                        }}
                        title="Select custom date"
                      />
                    </div>
                  </div>
                </div>

                {/* Branch Service Desks - Modern Box Button Cards Grid UI */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {[currentBranch].map((branch) => {
                    const openQueuesCount = branch.services?.filter(s => s.queues?.[0]?.status === 'OPEN').length || 0;

                    return (
                      <div 
                        key={branch.id} 
                        style={{
                          background: '#ffffff',
                          border: '1.5px solid #e2e8f0',
                          borderRadius: 24,
                          padding: '24px 26px',
                          boxShadow: '0 6px 22px rgba(0, 0, 0, 0.03)'
                        }}
                      >
                        {/* Branch Bar Header */}
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          gap: 12, 
                          paddingBottom: 18,
                          marginBottom: 22,
                          borderBottom: '1px solid #f1f5f9',
                          flexWrap: 'wrap'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '1.12rem', color: '#0f172a', fontWeight: 850 }}>
                            <div style={{
                              width: 36,
                              height: 36,
                              borderRadius: 11,
                              background: 'linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)',
                              border: '1px solid #c7d2fe',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#4f46e5'
                            }}>
                              <MapPin size={18} />
                            </div>
                            <div>
                              <span style={{ textTransform: 'capitalize' }}>{branch.name}</span>
                              {branch.address && (
                                <span style={{ fontSize: '0.84rem', color: '#64748b', fontWeight: 500, marginLeft: 8 }}>
                                  • {branch.address}
                                </span>
                              )}
                            </div>
                          </div>

                          <span style={{ 
                            fontSize: '0.82rem', 
                            fontWeight: 800, 
                            color: openQueuesCount > 0 ? '#166534' : '#64748b',
                            background: openQueuesCount > 0 ? '#f0fdf4' : '#f8fafc',
                            padding: '6px 14px',
                            borderRadius: 18,
                            border: `1.5px solid ${openQueuesCount > 0 ? '#bbf7d0' : '#e2e8f0'}`,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 7
                          }}>
                            <span style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: openQueuesCount > 0 ? '#16a34a' : '#94a3b8'
                            }} />
                            {openQueuesCount > 0 ? `${openQueuesCount} ${openQueuesCount === 1 ? 'Desk' : 'Desks'} Open` : 'Closed'}
                          </span>
                        </div>

                        {/* Services Grid - Modern Interactive Box Button Cards */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                          gap: 20
                        }}>
                          {branch.services?.map((service) => {
                            const activeQueue = service.queues?.[0];
                            const isQueueOpen = Boolean(activeQueue && activeQueue.status === 'OPEN');
                            const isQueuePaused = Boolean(activeQueue && activeQueue.status === 'PAUSED');
                            const waitingCount = activeQueue?.entries?.length || 0;
                            const estWait = waitingCount * (service.avgDurationMinutes || 15);
                            const waitLevel = getQueueWaitLevel(waitingCount, estWait);
                            const hasActiveTicket = Boolean(activeQueue && activeTicketsMap[activeQueue.id]);
                            const userTicket = hasActiveTicket ? activeTicketsMap[activeQueue.id] : null;

                            return (
                              <div 
                                key={service.id} 
                                style={{ 
                                  display: 'flex', 
                                  flexDirection: 'column',
                                  justifyContent: 'space-between',
                                  gap: 18,
                                  background: hasActiveTicket 
                                    ? 'linear-gradient(180deg, #f0fdf4 0%, #ffffff 48%)' 
                                    : 'linear-gradient(180deg, #ffffff 0%, #fcfdfe 100%)',
                                  border: hasActiveTicket 
                                    ? '2px solid #10b981' 
                                    : isQueueOpen 
                                    ? '1.5px solid #c7d2fe' 
                                    : '1.5px solid #e2e8f0',
                                  padding: '22px',
                                  borderRadius: 20,
                                  boxShadow: hasActiveTicket 
                                    ? '0 10px 28px -4px rgba(16, 185, 129, 0.22)' 
                                    : isQueueOpen
                                    ? '0 6px 22px -4px rgba(99, 102, 241, 0.1), 0 2px 6px rgba(0, 0, 0, 0.02)'
                                    : '0 2px 8px rgba(0, 0, 0, 0.02)',
                                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                                }}
                              >
                                <div>
                                  {/* Top Bar: Icon in Box Button & Live Availability Pill */}
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
                                    <div style={{
                                      width: 44,
                                      height: 44,
                                      borderRadius: 13,
                                      background: isQueueOpen ? 'linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)' : '#f1f5f9',
                                      border: `1.5px solid ${isQueueOpen ? '#c7d2fe' : '#e2e8f0'}`,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: isQueueOpen ? '#4f46e5' : '#94a3b8',
                                      boxShadow: isQueueOpen ? '0 2px 8px rgba(99, 102, 241, 0.12)' : 'none'
                                    }}>
                                      <Zap size={20} />
                                    </div>

                                    {isQueueOpen ? (
                                      <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        padding: '5px 12px',
                                        borderRadius: 20,
                                        fontSize: '0.76rem',
                                        fontWeight: 800,
                                        background: '#f0fdf4',
                                        color: '#15803d',
                                        border: '1px solid #bbf7d0'
                                      }}>
                                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#16a34a' }} />
                                        {WAIT_LABELS[waitLevel] || 'Available'}
                                      </span>
                                    ) : isQueuePaused ? (
                                      <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        padding: '5px 12px',
                                        borderRadius: 20,
                                        fontSize: '0.76rem',
                                        fontWeight: 800,
                                        background: '#fffbeb',
                                        color: '#b45309',
                                        border: '1px solid #fde68a'
                                      }}>
                                        <Clock size={13} color="#d97706" /> Paused
                                      </span>
                                    ) : (
                                      <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        padding: '5px 12px',
                                        borderRadius: 20,
                                        fontSize: '0.76rem',
                                        fontWeight: 800,
                                        background: '#f1f5f9',
                                        color: '#64748b',
                                        border: '1px solid #e2e8f0'
                                      }}>
                                        <Clock size={13} color="#64748b" /> {isSelectedPast ? 'Closed' : 'Not Opened'}
                                      </span>
                                    )}
                                  </div>

                                  {/* Service Title */}
                                  <h3 style={{
                                    fontWeight: 850,
                                    fontSize: '1.18rem',
                                    color: '#0f172a',
                                    textTransform: 'capitalize',
                                    margin: '0 0 6px 0',
                                    letterSpacing: '-0.02em'
                                  }}>
                                    {service.name}
                                  </h3>

                                  {service.description && (
                                    <p style={{ color: '#64748b', fontSize: '0.86rem', margin: '0 0 14px 0', lineHeight: 1.5 }}>
                                      {service.description}
                                    </p>
                                  )}

                                  {/* Metric Box Chips */}
                                  <div style={{ display: 'flex', gap: 8, fontSize: '0.8rem', flexWrap: 'wrap', alignItems: 'center', marginTop: 10 }}>
                                    {isQueueOpen ? (
                                      <>
                                        <span style={{ 
                                          display: 'inline-flex', 
                                          alignItems: 'center', 
                                          gap: 6,
                                          background: waitingCount > 0 ? '#fffbeb' : '#f8fafc',
                                          border: `1.5px solid ${waitingCount > 0 ? '#fde68a' : '#e2e8f0'}`,
                                          color: waitingCount > 0 ? '#92400e' : '#475569',
                                          fontWeight: 750,
                                          padding: '5px 12px',
                                          borderRadius: 10
                                        }}>
                                          <Users size={14} color={waitingCount > 0 ? '#d97706' : '#64748b'} />
                                          {waitingCount === 0 ? 'No waiting line' : `${waitingCount} waiting`}
                                        </span>

                                        <span style={{ 
                                          display: 'inline-flex', 
                                          alignItems: 'center', 
                                          gap: 6,
                                          background: '#f0fdf4',
                                          border: '1.5px solid #dcfce7',
                                          color: '#15803d',
                                          fontWeight: 750,
                                          padding: '5px 12px',
                                          borderRadius: 10
                                        }}>
                                          <Clock size={14} color="#16a34a" /> ~{estWait} min wait
                                        </span>
                                      </>
                                    ) : (
                                      <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontStyle: 'italic' }}>
                                        {isSelectedPast 
                                          ? 'Queue session closed for this date' 
                                          : `Desk queue not active for ${isSelectedToday ? 'today' : formatShortDate(selectedDate)}`}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Bottom Action Box Button */}
                                <div>
                                  {isQueueOpen ? (
                                    hasActiveTicket ? (
                                      <button
                                        type="button"
                                        onClick={() => onTicketIssued && onTicketIssued(userTicket.id)}
                                        style={{
                                          width: '100%',
                                          padding: '13px 20px',
                                          fontSize: '0.92rem',
                                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                          border: 'none',
                                          color: '#ffffff',
                                          fontWeight: 800,
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          gap: 9,
                                          borderRadius: 14,
                                          cursor: 'pointer',
                                          boxShadow: '0 6px 18px rgba(16, 185, 129, 0.38)',
                                          transition: 'all 0.15s ease'
                                        }}
                                      >
                                        <Ticket size={17} color="#ffffff" />
                                        <span>Ticket #Q-{userTicket.queueNumber} • View Status</span>
                                        <ArrowRight size={16} />
                                      </button>
                                    ) : (
                                      <button 
                                        type="button"
                                        onClick={() => handleInitiateJoin(service, activeQueue, branch, currentBusiness)}
                                        style={{ 
                                          width: '100%',
                                          padding: '13px 20px', 
                                          fontSize: '0.92rem',
                                          fontWeight: 850,
                                          borderRadius: 14,
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          gap: 9,
                                          background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
                                          color: '#ffffff',
                                          border: 'none',
                                          boxShadow: '0 6px 20px rgba(37, 99, 235, 0.35)',
                                          cursor: 'pointer',
                                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.transform = 'translateY(-2px)';
                                          e.currentTarget.style.boxShadow = '0 8px 24px rgba(37, 99, 235, 0.45)';
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.transform = 'none';
                                          e.currentTarget.style.boxShadow = '0 6px 20px rgba(37, 99, 235, 0.35)';
                                        }}
                                      >
                                        <Ticket size={17} color="#ffffff" />
                                        <span>Join Queue {isSelectedToday ? 'Now' : `(${formatShortDate(selectedDate)})`}</span>
                                        <ArrowRight size={17} />
                                      </button>
                                    )
                                  ) : (
                                    <button 
                                      type="button"
                                      disabled
                                      style={{ 
                                        width: '100%',
                                        padding: '12px 18px', 
                                        fontSize: '0.86rem', 
                                        fontWeight: 750,
                                        borderRadius: 14,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 7,
                                        background: '#f1f5f9',
                                        border: '1.5px solid #e2e8f0',
                                        color: '#94a3b8',
                                        cursor: 'not-allowed'
                                      }}
                                    >
                                      <Clock size={15} color="#94a3b8" />
                                      <span>{isSelectedPast ? 'Closed' : 'Desk Inactive'}</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Other Branches of this company */}
                {currentBusiness.branches && currentBusiness.branches.length > 1 && (
                  <div style={{
                    marginTop: 36,
                    padding: '24px 28px',
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8faff 100%)',
                    borderRadius: 20,
                    border: '1.5px solid #e2e8f0',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.02)'
                  }}>
                    <div style={{
                      fontSize: '0.88rem',
                      fontWeight: 800,
                      color: '#475569',
                      marginBottom: 14,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}>
                      <Building2 size={16} color="#6366f1" />
                      <span>Other Branches of {currentBusiness.name}</span>
                    </div>

                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {currentBusiness.branches.filter(b => b.id !== currentBranch.id).map(otherBranch => (
                        <button
                          key={otherBranch.id}
                          type="button"
                          onClick={() => setSelectedBranchTarget({ businessId: currentBusiness.id, branchId: otherBranch.id })}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 10,
                            background: '#ffffff',
                            border: '1.5px solid #cbd5e1',
                            borderRadius: 20,
                            padding: '6px 16px 6px 6px',
                            fontSize: '0.86rem',
                            fontWeight: 700,
                            color: '#334155',
                            cursor: 'pointer',
                            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#6366f1';
                            e.currentTarget.style.color = '#4f46e5';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#cbd5e1';
                            e.currentTarget.style.color = '#334155';
                            e.currentTarget.style.transform = 'none';
                          }}
                        >
                          <img 
                            src={getBranchImage(otherBranch, currentBusiness)} 
                            alt={otherBranch.name} 
                            style={{ width: 32, height: 32, borderRadius: 10, objectFit: 'cover' }}
                          />
                          <span>{otherBranch.name}</span>
                          {otherBranch.city && <span style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 500 }}>• {otherBranch.city}</span>}
                          <ArrowRight size={13} color="#4f46e5" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()
      ) : (
        /* MAIN EXPLORE VIEW */
        <>

      {/* Edge-to-Edge Full-Width Hero Image Banner - Outside container div */}
      <div style={{
        position: 'relative',
        width: '100%',
        minHeight: 460,
        overflow: 'hidden',
        marginBottom: 28,
        borderBottom: '1px solid #e2e8f0',
        boxShadow: '0 12px 36px -8px rgba(15, 23, 42, 0.12)'
      }}>
        {/* Full-width clean background image */}
        <img 
          src={exploreHeroBanner} 
          alt="QueueLess Smart Service Lounge" 
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center 40%',
            display: 'block'
          }}
        />

        {/* Luminous balanced contrast gradient overlay: keeps the whole reception photo bright and clear while providing high text readability */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(90deg, rgba(15, 23, 42, 0.82) 0%, rgba(15, 23, 42, 0.60) 48%, rgba(15, 23, 42, 0.25) 82%, rgba(15, 23, 42, 0.12) 100%)'
        }} />

        {/* Floating live queue count badge on top right - sleek white pill matching screenshot */}
        <div style={{
          position: 'absolute',
          top: 24,
          right: 28,
          zIndex: 3,
          background: 'rgba(255, 255, 255, 0.94)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid #ffffff',
          borderRadius: 9999,
          padding: '8px 18px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.2)'
        }}>
          <Zap size={15} color="#4f46e5" fill="#4f46e5" />
          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
            {totalOpenQueues > 0 
              ? `${totalOpenQueues} Active Live ${totalOpenQueues === 1 ? 'Queue' : 'Queues'}`
              : '5 Active Live Queues'}
          </span>
        </div>

        {/* Hero Content positioned directly over the full-width image */}
        <div style={{
          position: 'relative',
          zIndex: 2,
          padding: '52px 32px 52px max(28px, calc((100vw - 1280px) / 2))',
          maxWidth: 720,
          width: '100%'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 16px',
            borderRadius: 24,
            background: 'rgba(255, 255, 255, 0.16)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            color: '#ffffff',
            fontSize: '0.78rem',
            fontWeight: 800,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            marginBottom: 16,
            boxShadow: '0 4px 14px rgba(0,0,0,0.15)'
          }}>
            <Zap size={13} color="#38bdf8" fill="#38bdf8" /> NEXT-GEN CLOUD QUEUE STREAM
          </div>

          <h1 style={{
            fontSize: 'clamp(2.2rem, 4.4vw, 3.2rem)',
            marginBottom: 14,
            letterSpacing: '-0.035em',
            lineHeight: 1.15,
            fontWeight: 850,
            color: '#ffffff',
            textShadow: '0 2px 14px rgba(0,0,0,0.4)'
          }}>
            Never Wait in Line.{' '}
            <span style={{
              background: 'linear-gradient(135deg, #60a5fa 0%, #818cf8 50%, #c084fc 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Join Queues Remotely.
            </span>
          </h1>

          <p style={{
            color: 'rgba(241, 245, 249, 0.95)',
            fontSize: '1.04rem',
            maxWidth: 580,
            lineHeight: 1.6,
            marginBottom: 26,
            textShadow: '0 1px 4px rgba(0,0,0,0.4)'
          }}>
            Real-time token management for clinics, diagnostic centers, salons, banks, and service desks. Get instant notifications when your turn arrives.
          </p>

          {/* Elegant Pill-Shaped Search Input */}
          <form onSubmit={handleSearch} style={{ maxWidth: 540, width: '100%' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: '#ffffff',
              borderRadius: 9999,
              padding: '6px 6px 6px 20px',
              border: '2px solid rgba(255, 255, 255, 0.95)',
              boxShadow: '0 12px 36px -4px rgba(0, 0, 0, 0.35)',
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
                  flexShrink: 0
                }}
              >
                Search <ArrowRight size={15} />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* PAGE CONTAINER: Separate Filter, Date, and Cards */}
      <div className="page-container" style={{ maxWidth: 1320, paddingTop: 6 }}>
        {/* SEPARATE CATEGORY FILTER SECTION */}
        <div style={{
          display: 'flex',
          gap: 8,
          justifyContent: 'center',
          flexWrap: 'wrap',
          padding: '16px 20px',
          background: '#ffffff',
          borderRadius: 22,
          border: '1.5px solid #e2e8f0',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
          marginBottom: 20
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
                  background: isActive ? 'var(--accent-gradient)' : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
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
        {/* Date Selector Box Buttons Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          marginTop: 22,
          flexWrap: 'wrap'
        }}>
          <button
            type="button"
            onClick={() => setSelectedDate(todayStr)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              borderRadius: 14,
              fontSize: '0.86rem',
              fontWeight: 800,
              cursor: 'pointer',
              background: isSelectedToday ? 'var(--accent-gradient)' : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
              color: isSelectedToday ? '#ffffff' : '#334155',
              border: `1.5px solid ${isSelectedToday ? 'transparent' : '#cbd5e1'}`,
              boxShadow: isSelectedToday ? '0 6px 18px -2px rgba(99, 102, 241, 0.4)' : '0 2px 6px rgba(0, 0, 0, 0.03)',
              transform: isSelectedToday ? 'translateY(-1px)' : 'none',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            <Sparkles size={15} color={isSelectedToday ? '#ffffff' : '#4f46e5'} />
            <span>Today ({formatShortDate(todayStr)})</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedDate(tomorrowStr)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              borderRadius: 14,
              fontSize: '0.86rem',
              fontWeight: 800,
              cursor: 'pointer',
              background: selectedDate === tomorrowStr ? 'var(--accent-gradient)' : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
              color: selectedDate === tomorrowStr ? '#ffffff' : '#334155',
              border: `1.5px solid ${selectedDate === tomorrowStr ? 'transparent' : '#cbd5e1'}`,
              boxShadow: selectedDate === tomorrowStr ? '0 6px 18px -2px rgba(99, 102, 241, 0.4)' : '0 2px 6px rgba(0, 0, 0, 0.03)',
              transform: selectedDate === tomorrowStr ? 'translateY(-1px)' : 'none',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            <Clock size={15} color={selectedDate === tomorrowStr ? '#ffffff' : '#4f46e5'} />
            <span>Tomorrow ({formatShortDate(tomorrowStr)})</span>
          </button>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              borderRadius: 14,
              fontSize: '0.86rem',
              fontWeight: 800,
              cursor: 'pointer',
              background: (selectedDate !== todayStr && selectedDate !== tomorrowStr) ? 'var(--accent-gradient)' : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
              color: (selectedDate !== todayStr && selectedDate !== tomorrowStr) ? '#ffffff' : '#334155',
              border: `1.5px solid ${(selectedDate !== todayStr && selectedDate !== tomorrowStr) ? 'transparent' : '#cbd5e1'}`,
              boxShadow: (selectedDate !== todayStr && selectedDate !== tomorrowStr) ? '0 6px 18px -2px rgba(99, 102, 241, 0.4)' : '0 2px 6px rgba(0, 0, 0, 0.03)',
              position: 'relative'
            }}
          >
            <Calendar size={15} color={(selectedDate !== todayStr && selectedDate !== tomorrowStr) ? '#ffffff' : '#4f46e5'} />
            <span>{selectedDate !== todayStr && selectedDate !== tomorrowStr ? formatShortDate(selectedDate) : 'Pick Date'}</span>
            <input
              type="date"
              value={selectedDate}
              min={todayStr}
              onChange={(e) => {
                if (e.target.value) setSelectedDate(e.target.value);
              }}
              style={{
                position: 'absolute',
                inset: 0,
                opacity: 0,
                cursor: 'pointer',
                width: '100%',
                height: '100%'
              }}
              title="Select custom date"
            />
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: isSelectedToday ? 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)' : isSelectedPast ? '#fffbeb' : '#f0fdf4',
            border: `1px solid ${isSelectedToday ? '#93c5fd' : isSelectedPast ? '#fde68a' : '#bbf7d0'}`,
            color: isSelectedToday ? '#1d4ed8' : isSelectedPast ? '#b45309' : '#15803d',
            padding: '7px 14px',
            borderRadius: 14,
            fontSize: '0.8rem',
            fontWeight: 800
          }}>
            <span>📅 {formatFullDate(selectedDate)}</span>
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
              {branchCards.length} {branchCards.length === 1 ? 'branch' : 'branches'}
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
          <div className="grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="skeleton skeleton-card" />
            ))}
          </div>
        ) : branchCards.length === 0 ? (
          <div className="glass-panel empty-state">
            <div className="empty-state-icon"><Search size={26} /></div>
            <h3>No active branches found</h3>
            <p>Try clearing filters or adjusting your search term.</p>
          </div>
        ) : (
          <div className="grid-cols-3">
            {branchCards.map(({ cardKey, business: biz, branch }) => {
              const BizIcon = CATEGORY_ICONS[biz.category] || Building2;
              const openQueuesCount = branch.services?.filter(s => s.queues?.[0]?.status === 'OPEN').length || 0;
              const servicesCount = branch.services?.length || 0;
              const branchLocationText = [branch.city, branch.address].filter(Boolean).join(' • ') || 'Main Location';

              return (
                <div 
                  key={cardKey} 
                  className="shining-card branch-card-item" 
                  onClick={() => setSelectedBranchTarget({ businessId: biz.id, branchId: branch.id })}
                  style={{ 
                    position: 'relative',
                    padding: 0, 
                    background: '#ffffff',
                    borderRadius: 22,
                    border: '1.5px solid rgba(226, 232, 240, 0.9)',
                    boxShadow: '0 8px 24px -4px rgba(15, 23, 42, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.borderColor = '#c7d2fe';
                    e.currentTarget.style.boxShadow = '0 20px 38px -8px rgba(99, 102, 241, 0.2), 0 4px 12px rgba(0, 0, 0, 0.04)';
                    const img = e.currentTarget.querySelector('.branch-card-img');
                    if (img) img.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.borderColor = 'rgba(226, 232, 240, 0.9)';
                    e.currentTarget.style.boxShadow = '0 8px 24px -4px rgba(15, 23, 42, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02)';
                    const img = e.currentTarget.querySelector('.branch-card-img');
                    if (img) img.style.transform = 'scale(1)';
                  }}
                >
                  {/* Card Top Image Cover - Pure clean image without any text/badges on top */}
                  <div style={{ position: 'relative', height: 180, width: '100%', overflow: 'hidden', background: '#f1f5f9' }}>
                    <img 
                      src={getBranchImage(branch, biz)} 
                      alt={branch.name}
                      className="branch-card-img"
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover', 
                        display: 'block',
                        transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)' 
                      }}
                    />
                  </div>

                  {/* Card Content Body */}
                  <div style={{ padding: '18px 20px 18px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {/* Business Name */}
                    <h3 style={{ 
                      fontSize: '1.26rem', 
                      fontWeight: 800, 
                      color: '#0f172a',
                      lineHeight: 1.25,
                      letterSpacing: '-0.02em',
                      margin: '0 0 8px 0',
                      textTransform: 'capitalize'
                    }}>
                      {biz.name}
                    </h3>

                    {/* Location Description */}
                    <div style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: 6, 
                      fontSize: '0.84rem', 
                      fontWeight: 650, 
                      color: '#4338ca',
                      marginBottom: 10,
                      background: 'rgba(99, 102, 241, 0.07)',
                      padding: '4px 10px',
                      borderRadius: 14,
                      width: 'fit-content'
                    }}>
                      <MapPin size={13} color="#4f46e5" />
                      <span>{branchLocationText}</span>
                    </div>

                    {/* Description */}
                    {biz.description && (
                      <p style={{ 
                        color: '#64748b', 
                        fontSize: '0.87rem', 
                        margin: '0 0 16px',
                        lineHeight: 1.55,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {biz.description}
                      </p>
                    )}

                    {/* Clean Footer Bar */}
                    <div style={{
                      marginTop: 'auto',
                      paddingTop: 14,
                      borderTop: '1px solid #f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.84rem',
                      fontWeight: 650,
                      color: '#64748b'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                          width: 7,
                          height: 7,
                          borderRadius: '50%',
                          background: openQueuesCount > 0 ? '#16a34a' : '#94a3b8'
                        }} />
                        <span>{servicesCount} Service Desk{servicesCount > 1 ? 's' : ''}</span>
                      </div>
                      <div style={{ color: '#4f46e5', fontWeight: 750, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span>Explore & Join Queue</span>
                        <ArrowRight size={14} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
    </>
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
    </div>
  );
}
