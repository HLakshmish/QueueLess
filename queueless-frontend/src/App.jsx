import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';

// Pages
import ExploreQueues from './pages/customer/ExploreQueues';
import ActiveQueueTicket from './pages/customer/ActiveQueueTicket';
import QueueHistory from './pages/customer/QueueHistory';

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
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Initializing QueueLess...
      </div>
    );
  }

  const handleTicketIssued = (ticketId) => {
    setActiveTicketId(ticketId);
    setCurrentView('my-ticket');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar currentView={currentView} setCurrentView={setCurrentView} />

      <main style={{ flex: 1 }}>
        {/* Customer Views */}
        {currentView === 'explore' && (
          <ExploreQueues onTicketIssued={handleTicketIssued} />
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
            onRegisterClick={() => setCurrentView('register')} 
            onLoginSuccess={() => setCurrentView('explore')} 
          />
        )}

        {currentView === 'register' && (
          <Register 
            onLoginClick={() => setCurrentView('login')} 
            onRegisterSuccess={() => setCurrentView('explore')} 
          />
        )}
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-subtle)',
        background: '#ffffff',
        padding: '24px 20px',
        textAlign: 'center',
        color: 'var(--text-dim)',
        fontSize: '0.85rem'
      }}>
        QueueLess &copy; 2026. Universal Multi-Tenant Queue Management SaaS. Built with Fastify, PostgreSQL & React.
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
