import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';

// Pages
import ExploreQueues from './pages/customer/ExploreQueues';
import ActiveQueueTicket from './pages/customer/ActiveQueueTicket';
import QueueHistory from './pages/customer/QueueHistory';
import JoinBusiness from './pages/customer/JoinBusiness';

import BusinessDashboard from './pages/business/BusinessDashboard';
import ServicesBranches from './pages/business/ServicesBranches';
import BusinessAnalytics from './pages/business/BusinessAnalytics';
import SubscriptionBilling from './pages/business/SubscriptionBilling';

import AdminDashboard from './pages/admin/AdminDashboard';

import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

function MainApp() {
  const { role, user, loading } = useAuth();
  const [currentView, setCurrentView] = useState('explore');
  const [activeTicketId, setActiveTicketId] = useState(null);
  const [pendingQueue, setPendingQueue] = useState(() => {
    try {
      const saved = sessionStorage.getItem('queueless_pending_queue');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Sync default view when role changes
  useEffect(() => {
    if (role === 'APPLICATION_MANAGER') {
      setCurrentView('admin-dashboard');
    } else if (role === 'BUSINESS_USER') {
      setCurrentView('business-desk');
    } else {
      if (currentView === 'admin-dashboard' || currentView === 'business-desk' || currentView === 'services') {
        setCurrentView('explore');
      }
    }
  }, [role]);

  if (loading) {
    return (
      <div className="loading-screen" style={{ minHeight: '100vh' }}>
        <div className="loading-spinner" />
        <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>Initializing QueueLess...</p>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>Restoring your session</p>
      </div>
    );
  }

  const handleTicketIssued = (ticketId) => {
    setActiveTicketId(ticketId);
    setCurrentView('my-ticket');
  };

  const handleRequireLogin = (queueData) => {
    setPendingQueue(queueData);
    try {
      sessionStorage.setItem('queueless_pending_queue', JSON.stringify(queueData));
    } catch {}
    setCurrentView('login');
  };

  const handleRequireRegister = (queueData) => {
    setPendingQueue(queueData);
    try {
      sessionStorage.setItem('queueless_pending_queue', JSON.stringify(queueData));
    } catch {}
    setCurrentView('register');
  };

  const handleClearPendingQueue = () => {
    setPendingQueue(null);
    try {
      sessionStorage.removeItem('queueless_pending_queue');
    } catch {}
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar currentView={currentView} setCurrentView={setCurrentView} />

      <main style={{ flex: 1 }}>
        {/* Customer Views */}
        {currentView === 'explore' && (
          <ExploreQueues 
            onTicketIssued={handleTicketIssued} 
            onJoinBusiness={() => setCurrentView('join-business')} 
            onRequireLogin={handleRequireLogin}
            onRequireRegister={handleRequireRegister}
            pendingJoinQueue={pendingQueue}
            onClearPendingQueue={handleClearPendingQueue}
          />
        )}

        {currentView === 'join-business' && (
          <JoinBusiness 
            onSuccess={() => setCurrentView('business-desk')} 
            onCancel={() => setCurrentView('explore')} 
          />
        )}

        {currentView === 'my-ticket' && (
          <ActiveQueueTicket 
            activeEntryId={activeTicketId} 
            onSelectExplore={() => setCurrentView('explore')} 
          />
        )}

        {currentView === 'history' && (
          <QueueHistory onSelectTicket={(id) => {
            setActiveTicketId(id);
            setCurrentView('my-ticket');
          }} />
        )}

        {/* Business User Views */}
        {currentView === 'business-desk' && <BusinessDashboard />}
        {currentView === 'services' && <ServicesBranches />}
        {currentView === 'business-analytics' && <BusinessAnalytics />}
        {currentView === 'subscription' && <SubscriptionBilling />}

        {/* Admin Views */}
        {currentView === 'admin-dashboard' && <AdminDashboard />}

        {/* Auth Views */}
        {currentView === 'login' && (
          <Login 
            pendingQueue={pendingQueue}
            onRegisterClick={() => setCurrentView('register')} 
            onLoginSuccess={() => setCurrentView('explore')} 
          />
        )}

        {currentView === 'register' && (
          <Register 
            pendingQueue={pendingQueue}
            onLoginClick={() => setCurrentView('login')} 
            onRegisterSuccess={() => setCurrentView('explore')} 
          />
        )}
      </main>

      <footer className="app-footer">
        <div className="app-footer-inner">
          <div>
            <div className="app-footer-brand">QueueLess</div>
            <div className="app-footer-copy">Universal multi-tenant queue management platform</div>
          </div>
          <div className="app-footer-copy">
            &copy; 2026 QueueLess. Built with Fastify, PostgreSQL &amp; React.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
