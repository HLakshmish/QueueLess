import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Users,
  Store,
  ShieldCheck,
  Clock,
  Ticket,
  LogOut,
  Layers,
  BarChart3,
  CreditCard,
  Sparkles,
  Bell
} from 'lucide-react';

export default function Navbar({ currentView, setCurrentView }) {
  const { user, role, logout, quickLogin } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  useEffect(() => {
    if (user) {
      loadNotifications();
      const timer = setInterval(loadNotifications, 10000);
      return () => clearInterval(timer);
    } else {
      setNotifications([]);
    }
  }, [user]);

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

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 100 }}>
      {/* TIER 1: DEDICATED TOP DEMO ROLE STRIP */}
      <div className="demo-bar-strip">
        <div className="demo-bar-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1' }}>
            <Sparkles size={15} color="#38bdf8" />
            <span style={{ color: '#f8fafc', fontWeight: 800 }}>QueueLess Interactive Demo:</span>
            <span>Click any role button to switch perspective instantly</span>
          </div>

          <div className="demo-role-container">
            <div className="demo-live-badge">
              <span className="live-dot"></span>
              <Sparkles size={12} color="#38bdf8" />
              <span>Demo Sandbox</span>
            </div>

            <button
              onClick={() => quickLogin('CUSTOMER')}
              className={`demo-btn demo-btn-customer ${role === 'CUSTOMER' ? 'active' : ''}`}
              title="Switch to Demo Customer (Rahul Verma)"
            >
              <Users size={14} /> Customer Mode
            </button>

            <button
              onClick={() => quickLogin('BUSINESS_USER')}
              className={`demo-btn demo-btn-business ${role === 'BUSINESS_USER' ? 'active' : ''}`}
              title="Switch to Demo Business Operator (Apex Clinic)"
            >
              <Store size={14} /> Business Desk
            </button>

            <button
              onClick={() => quickLogin('APPLICATION_MANAGER')}
              className={`demo-btn demo-btn-admin ${role === 'APPLICATION_MANAGER' ? 'active' : ''}`}
              title="Switch to Demo Platform Admin"
            >
              <ShieldCheck size={14} /> Admin
            </button>
          </div>
        </div>
      </div>

      {/* TIER 2: MAIN NAVIGATION BAR */}
      <nav style={{
        borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        padding: '12px 24px',
        boxShadow: '0 4px 20px -4px rgba(15, 23, 42, 0.05)'
      }}>
        <div style={{
          maxWidth: 1350,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20
        }}>

          {/* LEFT: BRAND LOGO */}
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', flexShrink: 0 }}
            onClick={() => setCurrentView('explore')}
          >
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'var(--accent-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 15px rgba(37, 99, 235, 0.35)'
            }}>
              <Clock size={22} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1.1 }}>
                QueueLess
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                Digital Queue System
              </div>
            </div>
          </div>

          {/* CENTER: MAIN NAVIGATION TABS */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {role === 'CUSTOMER' && (
              <>
                <button
                  onClick={() => setCurrentView('explore')}
                  className={currentView === 'explore' ? 'btn-primary' : 'btn-secondary'}
                  style={{ padding: '8px 16px', fontSize: '0.9rem', borderRadius: 20 }}
                >
                  <Store size={16} /> Discover Queues
                </button>
                <button
                  onClick={() => setCurrentView('my-ticket')}
                  className={currentView === 'my-ticket' ? 'btn-primary' : 'btn-secondary'}
                  style={{ padding: '8px 16px', fontSize: '0.9rem', borderRadius: 20 }}
                >
                  <Ticket size={16} /> My Ticket
                </button>
                <button
                  onClick={() => setCurrentView('history')}
                  className={currentView === 'history' ? 'btn-primary' : 'btn-secondary'}
                  style={{ padding: '8px 16px', fontSize: '0.9rem', borderRadius: 20 }}
                >
                  <Clock size={16} /> History
                </button>
                <button
                  onClick={() => setCurrentView('join-business')}
                  className={currentView === 'join-business' ? 'btn-primary' : 'btn-secondary'}
                  style={{
                    padding: '8px 16px',
                    fontSize: '0.9rem',
                    borderRadius: 20,
                    borderColor: currentView === 'join-business' ? 'transparent' : '#c7d2fe',
                    color: currentView === 'join-business' ? '#fff' : '#4f46e5',
                    background: currentView === 'join-business' ? 'var(--accent-gradient)' : '#ede9fe',
                    fontWeight: 700
                  }}
                >
                  <Sparkles size={15} /> Join as Business
                </button>
              </>
            )}

            {role === 'BUSINESS_USER' && (
              <>
                <button
                  onClick={() => setCurrentView('business-desk')}
                  className={currentView === 'business-desk' ? 'btn-primary' : 'btn-secondary'}
                  style={{ padding: '8px 16px', fontSize: '0.9rem', borderRadius: 20 }}
                >
                  <Layers size={16} /> Queue Desk
                </button>
                <button
                  onClick={() => setCurrentView('services')}
                  className={currentView === 'services' ? 'btn-primary' : 'btn-secondary'}
                  style={{ padding: '8px 16px', fontSize: '0.9rem', borderRadius: 20 }}
                >
                  <Store size={16} /> Services & Counters
                </button>
                <button
                  onClick={() => setCurrentView('business-analytics')}
                  className={currentView === 'business-analytics' ? 'btn-primary' : 'btn-secondary'}
                  style={{ padding: '8px 16px', fontSize: '0.9rem', borderRadius: 20 }}
                >
                  <BarChart3 size={16} /> Live Analytics
                </button>
                <button
                  onClick={() => setCurrentView('subscription')}
                  className={currentView === 'subscription' ? 'btn-primary' : 'btn-secondary'}
                  style={{ padding: '8px 16px', fontSize: '0.9rem', borderRadius: 20 }}
                >
                  <CreditCard size={16} /> Billing Plan
                </button>
              </>
            )}

            {role === 'APPLICATION_MANAGER' && (
              <>
                <button
                  onClick={() => setCurrentView('admin-dashboard')}
                  className={currentView === 'admin-dashboard' ? 'btn-primary' : 'btn-secondary'}
                  style={{ padding: '8px 16px', fontSize: '0.9rem', borderRadius: 20 }}
                >
                  <ShieldCheck size={16} /> Admin Command Center
                </button>
              </>
            )}
          </div>

          {/* RIGHT: USER PROFILE & NOTIFICATION ACTIONS */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* Notification Bell */}
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowNotifMenu(!showNotifMenu)}
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '50%',
                      width: 38,
                      height: 38,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: unreadCount > 0 ? '#4f46e5' : 'var(--text-muted)',
                      position: 'relative',
                      cursor: 'pointer'
                    }}
                    title="Notifications"
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

                  {/* Notifications Dropdown */}
                  {showNotifMenu && (
                    <div style={{
                      position: 'absolute',
                      right: 0,
                      top: 46,
                      width: 320,
                      background: '#ffffff',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 14,
                      boxShadow: '0 15px 35px -5px rgba(0, 0, 0, 0.15)',
                      zIndex: 200,
                      padding: 16
                    }}>
                      <div style={{ fontWeight: 800, fontSize: '0.92rem', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Notifications</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{notifications.length} total</span>
                      </div>

                      {notifications.length === 0 ? (
                        <div style={{ color: 'var(--text-dim)', fontSize: '0.82rem', textAlign: 'center', padding: '16px 0' }}>
                          No notifications yet.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
                          {notifications.map(n => (
                            <div
                              key={n.id}
                              style={{
                                background: n.isRead ? '#f8fafc' : '#eef2ff',
                                border: `1px solid ${n.isRead ? 'var(--border-subtle)' : '#c7d2fe'}`,
                                padding: 10,
                                borderRadius: 8,
                                fontSize: '0.82rem',
                                cursor: 'pointer'
                              }}
                              onClick={() => handleMarkRead(n.id)}
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

                {/* User Info Pill */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '4px 12px 4px 5px',
                  background: '#f8fafc',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 24
                }}>
                  <div style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
                    color: '#ffffff',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 6px rgba(37, 99, 235, 0.3)'
                  }}>
                    {user.fullName ? user.fullName[0].toUpperCase() : 'U'}
                  </div>
                  <div style={{ textAlign: 'left' }}>
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
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '50%',
                    width: 38,
                    height: 38,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted)',
                    cursor: 'pointer'
                  }}
                  title="Sign out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setCurrentView('login')}
                className="btn-primary"
                style={{ padding: '8px 18px', fontSize: '0.88rem', borderRadius: 20 }}
              >
                Sign In
              </button>
            )}
          </div>

        </div>
      </nav>
    </header>
  );
}
