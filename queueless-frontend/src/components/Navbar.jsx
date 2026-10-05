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
        borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(255, 255, 255, 0.97)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: 'var(--shadow-nav)'
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
              background: 'var(--accent-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)'
            }}>
              <Clock size={22} color="#fff" />
            </div>
            <div>
              <div style={{
                fontSize: '1.25rem',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                background: 'var(--accent-gradient)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                lineHeight: 1.1
              }}>
                QueueLess
              </div>
              <div style={{
                fontSize: '0.68rem',
                color: 'var(--text-dim)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontWeight: 600
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
                      background: unreadCount > 0 ? '#eef2ff' : 'var(--bg-muted)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '50%',
                      width: 38,
                      height: 38,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: unreadCount > 0 ? 'var(--accent-primary)' : 'var(--text-muted)',
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
                        justifyContent: 'center'
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
                      background: '#ffffff',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 14,
                      boxShadow: 'var(--shadow-elevated)',
                      zIndex: 200,
                      padding: 16,
                      animation: 'slideUp 0.2s ease'
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
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{notifications.length} total</span>
                      </div>

                      {notifications.length === 0 ? (
                        <div className="empty-state" style={{ padding: '20px 0' }}>
                          <p style={{ color: 'var(--text-dim)', fontSize: '0.82rem' }}>No notifications yet.</p>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
                          {notifications.map(n => (
                            <div
                              key={n.id}
                              role="button"
                              tabIndex={0}
                              style={{
                                background: n.isRead ? '#f8fafc' : '#eef2ff',
                                border: `1px solid ${n.isRead ? 'var(--border-subtle)' : '#c7d2fe'}`,
                                padding: 10,
                                borderRadius: 8,
                                fontSize: '0.82rem',
                                cursor: 'pointer',
                                transition: 'background var(--transition-fast)'
                              }}
                              onClick={() => handleMarkRead(n.id)}
                              onKeyDown={(e) => e.key === 'Enter' && handleMarkRead(n.id)}
                            >
                              <div style={{ fontWeight: 700, color: n.isRead ? 'var(--text-main)' : '#3730a3' }}>
                                {n.title}
                              </div>
                              <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>{n.message}</div>
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
                  padding: '4px 12px 4px 5px',
                  background: 'var(--bg-muted)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 24
                }}>
                  <div style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    background: 'var(--accent-gradient)',
                    color: '#ffffff',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {user.fullName ? user.fullName[0].toUpperCase() : 'U'}
                  </div>
                  <div style={{ textAlign: 'left', display: 'none' }} className="navbar-user-info">
                    <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.2 }}>
                      {user.fullName}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      {user.role}
                    </div>
                  </div>
                </div>

                <button
                  onClick={logout}
                  aria-label="Sign out"
                  style={{
                    background: 'var(--bg-muted)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '50%',
                    width: 38,
                    height: 38,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)'
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

      <style>{`
        @media (min-width: 768px) {
          .navbar-user-info { display: block !important; }
        }
      `}</style>
    </header>
  );
}
