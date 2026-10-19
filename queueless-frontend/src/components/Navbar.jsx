import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Store,
  ShieldCheck,
  Clock,
  Ticket,
  LogOut,
  Layers,
  BarChart3,
  CreditCard,
  Sparkles,
  Bell,
  Menu,
  X
} from 'lucide-react';

function NavButton({ active, onClick, children, accent }) {
  return (
    <button
      onClick={onClick}
      className={`nav-link${active ? ' active' : ''}${accent && !active ? ' nav-link-accent' : ''}`}
    >
      {children}
    </button>
  );
}

export default function Navbar({ currentView, setCurrentView }) {
  const { user, role, logout } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const notifRef = React.useRef(null);

  useEffect(() => {
    if (user) {
      loadNotifications();
      const timer = setInterval(loadNotifications, 10000);
      return () => clearInterval(timer);
    } else {
      setNotifications([]);
    }
  }, [user]);

  useEffect(() => {
    setMobileOpen(false);
    setShowNotifMenu(false);
  }, [currentView]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function loadNotifications() {
    try {
      const res = await api.getNotifications();
      if (res.success) {
        setNotifications(res.data);
      }
    } catch (e) {
      // Ignore background errors
    }
  }

  const handleMarkRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (e) {
      console.error(e);
    }
  };

  const navigate = (view) => {
    setCurrentView(view);
    setMobileOpen(false);
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const customerLinks = (
    <>
      <NavButton active={currentView === 'explore'} onClick={() => navigate('explore')}>
        <Store size={16} /> Discover Queues
      </NavButton>
      <NavButton active={currentView === 'my-ticket'} onClick={() => navigate('my-ticket')}>
        <Ticket size={16} /> My Ticket
      </NavButton>
      <NavButton active={currentView === 'history'} onClick={() => navigate('history')}>
        <Clock size={16} /> History
      </NavButton>
      <NavButton active={currentView === 'join-business'} onClick={() => navigate('join-business')} accent>
        <Sparkles size={15} /> Join as Business
      </NavButton>
    </>
  );

  const businessLinks = (
    <>
      <NavButton active={currentView === 'business-desk'} onClick={() => navigate('business-desk')}>
        <Layers size={16} /> Queue Desk
      </NavButton>
      <NavButton active={currentView === 'services'} onClick={() => navigate('services')}>
        <Store size={16} /> Services & Counters
      </NavButton>
      <NavButton active={currentView === 'business-analytics'} onClick={() => navigate('business-analytics')}>
        <BarChart3 size={16} /> Live Analytics
      </NavButton>
      <NavButton active={currentView === 'subscription'} onClick={() => navigate('subscription')}>
        <CreditCard size={16} /> Billing Plan
      </NavButton>
    </>
  );

  const adminLinks = (
    <NavButton active={currentView === 'admin-dashboard'} onClick={() => navigate('admin-dashboard')}>
      <ShieldCheck size={16} /> Admin Command Center
    </NavButton>
  );

  const roleLinks = role === 'CUSTOMER' ? customerLinks : role === 'BUSINESS_USER' ? businessLinks : role === 'APPLICATION_MANAGER' ? adminLinks : null;

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 100 }}>
      <nav style={{
        borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
        background: 'linear-gradient(180deg, #1e294b 0%, #141c38 100%)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 8px 28px -4px rgba(15, 23, 42, 0.35)'
      }}>
        <div className="navbar-inner" style={{ padding: '12px 20px' }}>
          {/* Brand */}
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', flexShrink: 0 }}
            onClick={() => navigate('explore')}
          >
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 18px rgba(59, 130, 246, 0.45)'
            }}>
              <Clock size={22} color="#fff" />
            </div>
            <div>
              <div style={{
                fontSize: '1.28rem',
                fontWeight: 850,
                letterSpacing: '-0.02em',
                color: '#ffffff',
                lineHeight: 1.1
              }}>
                QueueLess
              </div>
              <div style={{
                fontSize: '0.68rem',
                color: '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: '0.09em',
                fontWeight: 700
              }}>
                Digital Queue System
              </div>
            </div>
          </div>

          {/* Desktop nav */}
          {roleLinks && (
            <div className="navbar-nav navbar-nav-desktop">
              {roleLinks}
            </div>
          )}

          {/* Actions */}
          <div className="navbar-actions">
            {user ? (
              <>
                <div ref={notifRef} style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowNotifMenu(!showNotifMenu)}
                    aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
                    style={{
                      background: unreadCount > 0 ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                      border: `1px solid ${unreadCount > 0 ? 'rgba(129, 140, 248, 0.5)' : 'rgba(255, 255, 255, 0.12)'}`,
                      borderRadius: '50%',
                      width: 38,
                      height: 38,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: unreadCount > 0 ? '#818cf8' : '#cbd5e1',
                      position: 'relative',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    <Bell size={18} />
                    {unreadCount > 0 && (
                      <span style={{
                        position: 'absolute',
                        top: -2,
                        right: -2,
                        background: '#ef4444',
                        color: '#fff',
                        borderRadius: '50%',
                        width: 17,
                        height: 17,
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 6px rgba(239, 68, 68, 0.4)'
                      }}>
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {showNotifMenu && (
                    <div style={{
                      position: 'absolute',
                      right: 0,
                      top: 46,
                      width: 320,
                      background: '#1a2340',
                      border: '1px solid rgba(255, 255, 255, 0.16)',
                      borderRadius: 14,
                      boxShadow: '0 20px 45px -10px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08)',
                      zIndex: 200,
                      padding: 16,
                      animation: 'slideUp 0.2s ease',
                      color: '#f8fafc'
                    }}>
                      <div style={{
                        fontWeight: 800,
                        fontSize: '0.92rem',
                        marginBottom: 10,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span>Notifications</span>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{notifications.length} total</span>
                      </div>

                      {notifications.length === 0 ? (
                        <div className="empty-state" style={{ padding: '20px 0' }}>
                          <p style={{ color: '#94a3b8', fontSize: '0.82rem' }}>No notifications yet.</p>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
                          {notifications.map(n => (
                            <div
                              key={n.id}
                              role="button"
                              tabIndex={0}
                              style={{
                                background: n.isRead ? 'rgba(255, 255, 255, 0.04)' : 'rgba(99, 102, 241, 0.18)',
                                border: `1px solid ${n.isRead ? 'rgba(255, 255, 255, 0.08)' : 'rgba(129, 140, 248, 0.4)'}`,
                                padding: 10,
                                borderRadius: 8,
                                fontSize: '0.82rem',
                                cursor: 'pointer',
                                transition: 'background var(--transition-fast)'
                              }}
                              onClick={() => handleMarkRead(n.id)}
                              onKeyDown={(e) => e.key === 'Enter' && handleMarkRead(n.id)}
                            >
                              <div style={{ fontWeight: 700, color: n.isRead ? '#f1f5f9' : '#c7d2fe' }}>
                                {n.title}
                              </div>
                              <div style={{ color: '#94a3b8', marginTop: 2 }}>{n.message}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '4px 14px 4px 5px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  borderRadius: 24
                }}>
                  <div style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
                    color: '#ffffff',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.35)'
                  }}>
                    {user.fullName ? user.fullName[0].toUpperCase() : 'U'}
                  </div>
                  <div style={{ textAlign: 'left', display: 'none' }} className="navbar-user-info">
                    <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#f8fafc', lineHeight: 1.2 }}>
                      {user.fullName}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>
                      {user.role}
                    </div>
                  </div>
                </div>

                <button
                  onClick={logout}
                  aria-label="Sign out"
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.14)',
                    borderRadius: '50%',
                    width: 38,
                    height: 38,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#cbd5e1',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                    e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
                    e.currentTarget.style.color = '#f87171';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.14)';
                    e.currentTarget.style.color = '#cbd5e1';
                  }}
                >
                  <LogOut size={16} />
                </button>
              </>
            ) : (
              <button
                onClick={() => navigate('login')}
                className="btn-primary"
                style={{ padding: '8px 18px', fontSize: '0.88rem', borderRadius: 20 }}
              >
                Sign In
              </button>
            )}

            {roleLinks && (
              <button
                className="mobile-menu-toggle"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileOpen}
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            )}
          </div>
        </div>

        {/* Mobile drawer */}
        {roleLinks && (
          <div className={`mobile-nav-drawer${mobileOpen ? ' open' : ''}`}>
            {roleLinks}
          </div>
        )}
      </nav>
      <div style={{
        height: '2.5px',
        background: 'linear-gradient(90deg, #2563eb 0%, #06b6d4 25%, #818cf8 50%, #c084fc 75%, #2563eb 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 4s linear infinite',
        opacity: 0.9
      }} />

      <style>{`
        @media (min-width: 768px) {
          .navbar-user-info { display: block !important; }
        }
      `}</style>
    </header>
  );
}
