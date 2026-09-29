import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Clock, Sparkles, ArrowRight } from 'lucide-react';

export default function Login({ onRegisterClick, onLoginSuccess }) {
  const { login, quickLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      if (onLoginSuccess) onLoginSuccess();
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (role) => {
    setLoading(true);
    setError(null);
    try {
      await quickLogin(role);
      if (onLoginSuccess) onLoginSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 440, margin: '60px auto', padding: '0 20px' }}>
      <div className="glass-panel-glow" style={{ padding: 36 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: 'var(--accent-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)'
          }}>
            <Clock size={26} color="#fff" />
          </div>
          <h2 style={{ fontSize: '1.8rem' }}>Welcome to QueueLess</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
            Sign in to access your queues & appointments
          </p>
        </div>

        {error && (
          <div style={{ background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#fb7185', padding: 12, borderRadius: 8, fontSize: '0.85rem', marginBottom: 20 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
              Email Address
            </label>
            <input 
              type="email" 
              className="form-input" 
              placeholder="e.g. rahul.verma@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
              Password
            </label>
            <input 
              type="password" 
              className="form-input" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="btn-primary" 
            style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        {/* 1-Click Role Switcher Demo */}
        <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border-subtle)', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 12 }}>
            <Sparkles size={14} color="#818cf8" />
            <span>Instant 1-Click Demo Login</span>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button 
              onClick={() => handleDemoLogin('CUSTOMER')} 
              className="btn-secondary" 
              style={{ fontSize: '0.75rem', padding: '6px 10px' }}
            >
              Customer
            </button>
            <button 
              onClick={() => handleDemoLogin('BUSINESS_USER')} 
              className="btn-secondary" 
              style={{ fontSize: '0.75rem', padding: '6px 10px' }}
            >
              Business
            </button>
            <button 
              onClick={() => handleDemoLogin('APPLICATION_MANAGER')} 
              className="btn-secondary" 
              style={{ fontSize: '0.75rem', padding: '6px 10px' }}
            >
              Admin
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Don't have an account?{' '}
          <span onClick={onRegisterClick} style={{ color: '#818cf8', fontWeight: 600, cursor: 'pointer' }}>
            Register
          </span>
        </div>
      </div>
    </div>
  );
}
