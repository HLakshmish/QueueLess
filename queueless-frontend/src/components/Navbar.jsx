import React from 'react';
import { useAuth } from '../context/AuthContext';
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
  Sparkles
} from 'lucide-react';

export default function Navbar({ currentView, setCurrentView }) {
  const { user, role, logout, quickLogin } = useAuth();

  return (
    <nav style={{
      borderBottom: '1px solid var(--border-subtle)',
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(20px)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      padding: '14px 24px',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
    }}>
      <div style={{
        maxWidth: 1300,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => setCurrentView('home')}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'var(--accent-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)'
          }}>
            <Clock size={22} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              QueueLess
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Digital Queue Platform
            </div>
          </div>
        </div>

        {/* Dynamic Navigation according to Role */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {role === 'CUSTOMER' && (
            <>
              <button 
                onClick={() => setCurrentView('explore')}
                className={currentView === 'explore' ? 'btn-primary' : 'btn-secondary'}
                style={{ padding: '8px 14px', fontSize: '0.88rem' }}
              >
                <Store size={16} /> Discover Queues
              </button>
              <button 
                onClick={() => setCurrentView('my-ticket')}
                className={currentView === 'my-ticket' ? 'btn-primary' : 'btn-secondary'}
                style={{ padding: '8px 14px', fontSize: '0.88rem' }}
              >
                <Ticket size={16} /> My Active Ticket
              </button>
              <button 
                onClick={() => setCurrentView('history')}
                className={currentView === 'history' ? 'btn-primary' : 'btn-secondary'}
                style={{ padding: '8px 14px', fontSize: '0.88rem' }}
              >
                <Clock size={16} /> History
              </button>
            </>
          )}

          {role === 'BUSINESS_USER' && (
            <>
              <button 
                onClick={() => setCurrentView('business-desk')}
                className={currentView === 'business-desk' ? 'btn-primary' : 'btn-secondary'}
                style={{ padding: '8px 14px', fontSize: '0.88rem' }}
              >
                <Layers size={16} /> Live Queue Desk
              </button>
              <button 
                onClick={() => setCurrentView('services')}
                className={currentView === 'services' ? 'btn-primary' : 'btn-secondary'}
                style={{ padding: '8px 14px', fontSize: '0.88rem' }}
              >
                <Store size={16} /> Services & Branches
              </button>
              <button 
                onClick={() => setCurrentView('business-analytics')}
                className={currentView === 'business-analytics' ? 'btn-primary' : 'btn-secondary'}
                style={{ padding: '8px 14px', fontSize: '0.88rem' }}
              >
                <BarChart3 size={16} /> Analytics
              </button>
              <button 
                onClick={() => setCurrentView('subscription')}
                className={currentView === 'subscription' ? 'btn-primary' : 'btn-secondary'}
                style={{ padding: '8px 14px', fontSize: '0.88rem' }}
              >
                <CreditCard size={16} /> Billing
              </button>
            </>
          )}

          {role === 'APPLICATION_MANAGER' && (
            <>
              <button 
                onClick={() => setCurrentView('admin-dashboard')}
                className={currentView === 'admin-dashboard' ? 'btn-primary' : 'btn-secondary'}
                style={{ padding: '8px 14px', fontSize: '0.88rem' }}
              >
                <ShieldCheck size={16} /> Admin Command Center
              </button>
            </>
          )}
        </div>

        {/* Demo Role Switcher & Auth Section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Quick Demo Switcher */}
          <div style={{
            background: '#f1f5f9',
            border: '1px solid var(--border-subtle)',
            borderRadius: 10,
            padding: '4px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}>
            <Sparkles size={14} color="#6366f1" />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Demo Role:</span>
            <button 
              onClick={() => quickLogin('CUSTOMER')} 
              style={{
                background: role === 'CUSTOMER' ? 'var(--accent-primary)' : 'transparent',
                color: role === 'CUSTOMER' ? '#fff' : 'var(--text-muted)',
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: '0.75rem',
                fontWeight: 600
              }}
            >
              Customer
            </button>
            <button 
              onClick={() => quickLogin('BUSINESS_USER')} 
              style={{
                background: role === 'BUSINESS_USER' ? 'var(--accent-primary)' : 'transparent',
                color: role === 'BUSINESS_USER' ? '#fff' : 'var(--text-muted)',
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: '0.75rem',
                fontWeight: 600
              }}
            >
              Business
            </button>
            <button 
              onClick={() => quickLogin('APPLICATION_MANAGER')} 
              style={{
                background: role === 'APPLICATION_MANAGER' ? 'var(--accent-primary)' : 'transparent',
                color: role === 'APPLICATION_MANAGER' ? '#fff' : 'var(--text-muted)',
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: '0.75rem',
                fontWeight: 600
              }}
            >
              Admin
            </button>
          </div>

          {/* User Profile or Login */}
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{user.fullName}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{user.role}</div>
              </div>
              <button 
                onClick={logout}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '50%',
                  width: 36,
                  height: 36,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted)'
                }}
                title="Sign out"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button onClick={() => setCurrentView('login')} className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
              Sign In
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
