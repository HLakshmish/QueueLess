import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Clock, 
  ArrowRight, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  Zap,
  Activity
} from 'lucide-react';
import heroImg from '../../assets/login_hero.jpg';

export default function Login({ pendingQueue, onRegisterClick, onLoginSuccess }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

  return (
    <div style={{
      minHeight: '85vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '30px 20px',
    }}>
      <div style={{
        maxWidth: 1040,
        width: '100%',
        display: 'grid',
        gridTemplateColumns: '1.05fr 1fr',
        background: '#ffffff',
        borderRadius: 'var(--radius-xl)',
        boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(226, 232, 240, 0.8)',
        overflow: 'hidden'
      }} className="responsive-login-grid">

        {/* LEFT COLUMN: Visual Hero Showcase */}
        <div className="login-hero-card">
          <div className="login-orb-1"></div>
          <div className="login-orb-2"></div>

          {/* Top Brand Tag */}
          <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'var(--accent-gradient)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 6px 18px rgba(37, 99, 235, 0.4)'
              }}>
                <Clock size={22} color="#fff" />
              </div>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                QueueLess
              </span>
            </div>

            <div className="floating-hero-badge">
              <Activity size={13} color="#38bdf8" />
              <span>Real-Time Engine</span>
            </div>
          </div>

          {/* Center Graphic */}
          <div style={{ position: 'relative', zIndex: 2, margin: '24px 0' }}>
            <div style={{ position: 'relative' }}>
              <img 
                src={heroImg} 
                alt="QueueLess Digital Queue Management" 
                style={{
                  width: '100%',
                  borderRadius: 16,
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: '0 20px 45px rgba(0, 0, 0, 0.5)',
                  display: 'block'
                }} 
              />
              <div style={{
                position: 'absolute',
                bottom: 12,
                left: 12,
                background: 'rgba(15, 23, 42, 0.85)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                padding: '6px 12px',
                borderRadius: 'var(--radius-full)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '0.74rem',
                fontWeight: 600,
                color: '#38bdf8'
              }}>
                <Zap size={12} color="#38bdf8" />
                <span>Next Counter Calling: Token #Q-101</span>
              </div>
            </div>

            <div style={{ marginTop: 24 }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.3, marginBottom: 8, color: '#f8fafc' }}>
                Zero Wait Time. <br />
                <span style={{ background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Infinite Customer Satisfaction.
                </span>
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.5 }}>
                Empower your business with smart digital queue tokens, real-time desk tracking, and fair queue dispatching.
              </p>
            </div>
          </div>

          {/* Bottom Bullet Points */}
          <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: '#cbd5e1' }}>
              <CheckCircle2 size={15} color="#34d399" />
              <span>Instant FCFS digital token generation</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: '#cbd5e1' }}>
              <CheckCircle2 size={15} color="#34d399" />
              <span>Multi-tenant operator desk command controls</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Sign In Form */}
        <div style={{ padding: '40px 36px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: 6 }}>
              Welcome Back 👋
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              Sign in to manage your tickets and services
            </p>
          </div>

          {pendingQueue && (
            <div style={{
              background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
              border: '1px solid #c7d2fe',
              color: '#3730a3',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              marginBottom: 20,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: 10
            }}>
              <Lock size={16} color="#4f46e5" style={{ flexShrink: 0 }} />
              <div>
                Please sign in to join queue for <strong>{pendingQueue.service?.name}</strong> at <strong>{pendingQueue.biz?.name}</strong>.
              </div>
            </div>
          )}

          {error && (
            <div style={{
              background: 'rgba(244, 63, 94, 0.1)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              color: '#e11d48',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              marginBottom: 18,
              fontSize: '0.85rem'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 6 }}>
                Email Address
              </label>
              <div className="login-input-wrapper">
                <input 
                  type="email" 
                  required
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rahul.verma@example.com"
                />
                <Mail size={18} className="login-input-icon" />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Password
                </label>
              </div>
              <div className="login-input-wrapper">
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  required
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <Lock size={18} className="login-input-icon" />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="btn-primary" 
              style={{
                width: '100%',
                justify: 'center',
                padding: '12px',
                marginTop: 4,
                fontSize: '0.92rem',
                fontWeight: 700,
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 8px 20px rgba(37, 99, 235, 0.25)'
              }}
            >
              {loading ? 'Authenticating...' : (
                <>
                  Sign In to QueueLess <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 24, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Don't have an account?{' '}
            <span onClick={onRegisterClick} style={{ color: '#4f46e5', fontWeight: 700, cursor: 'pointer' }}>
              Register Business Account
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
