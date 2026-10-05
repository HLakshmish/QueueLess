import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { 
  Clock, 
  ArrowRight, 
  Users, 
  Store, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  User, 
  Phone, 
  Building2, 
  Tag, 
  CheckCircle2, 
  Zap, 
  Activity 
} from 'lucide-react';
import heroImg from '../../assets/login_hero.jpg';

export default function Register({ pendingQueue, onLoginClick, onRegisterSuccess }) {
  const { register, refreshUser } = useAuth();
  const [role, setRole] = useState('CUSTOMER'); // CUSTOMER or BUSINESS_USER
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');

  // Business-specific fields
  const [businessName, setBusinessName] = useState('');
  const [businessCategory, setBusinessCategory] = useState('Healthcare & Clinic');
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  React.useEffect(() => {
    api.getPlans().then(res => {
      if (res.success && res.data?.length > 0) {
        setPlans(res.data);
        setSelectedPlanId(res.data[0].id);
      }
    }).catch(console.error);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await register({
        fullName,
        email,
        password,
        phone,
        role,
      });

      // If registered as Business User, create the initial business entity
      if (role === 'BUSINESS_USER' && businessName) {
        const bRes = await api.createBusiness({
          name: businessName,
          category: businessCategory,
          phone,
          email,
          initialBranchName: 'Main Branch',
          address: 'Central Plaza',
          city: 'Bengaluru',
          planId: selectedPlanId,
        });

        if (bRes.token) {
          await refreshUser(bRes.token);
        } else {
          await refreshUser();
        }
      }

      if (onRegisterSuccess) onRegisterSuccess();
    } catch (err) {
      setError(err.message || 'Registration failed');
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
              <span>Instant Onboarding</span>
            </div>
          </div>

          {/* Center Graphic */}
          <div style={{ position: 'relative', zIndex: 2, margin: '24px 0' }}>
            <div style={{ position: 'relative' }}>
              <img 
                src={heroImg} 
                alt="QueueLess Registration Showcase" 
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
                <span>Join 10,000+ happy customers & businesses</span>
              </div>
            </div>

            <div style={{ marginTop: 24 }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.3, marginBottom: 8, color: '#f8fafc' }}>
                Cut Wait Times by 80%. <br />
                <span style={{ background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Smart Digital Token Platform.
                </span>
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.5 }}>
                Register today as a customer to hold live tokens, or onboard your business desk to manage physical lines seamlessly.
              </p>
            </div>
          </div>

          {/* Bottom Bullet Points */}
          <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: '#cbd5e1' }}>
              <CheckCircle2 size={15} color="#34d399" />
              <span>1-Click setup for clinics, salons, banks & restaurants</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: '#cbd5e1' }}>
              <CheckCircle2 size={15} color="#34d399" />
              <span>Fair FCFS algorithm & instant SMS token notifications</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Registration Form */}
        <div style={{ padding: '36px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ marginBottom: 18 }}>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: 4 }}>
              Create Your Account 🚀
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Choose customer or business account type to get started
            </p>
          </div>

          {pendingQueue && (
            <div style={{
              background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
              border: '1px solid #c7d2fe',
              color: '#3730a3',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              marginBottom: 18,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: 10
            }}>
              <Lock size={16} color="#4f46e5" style={{ flexShrink: 0 }} />
              <div>
                Create an account to join queue for <strong>{pendingQueue.service?.name}</strong> at <strong>{pendingQueue.biz?.name}</strong>.
              </div>
            </div>
          )}

          {/* Role Segment Toggle */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
            background: '#f1f5f9',
            padding: 4,
            borderRadius: 'var(--radius-md)',
            marginBottom: 20
          }}>
            <button
              type="button"
              onClick={() => setRole('CUSTOMER')}
              style={{
                padding: '9px 0',
                borderRadius: 8,
                fontSize: '0.85rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                border: 'none',
                cursor: 'pointer',
                background: role === 'CUSTOMER' ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' : 'transparent',
                color: role === 'CUSTOMER' ? '#fff' : 'var(--text-muted)',
                boxShadow: role === 'CUSTOMER' ? '0 4px 12px rgba(37, 99, 235, 0.3)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              <Users size={15} /> Customer Account
            </button>
            <button
              type="button"
              onClick={() => setRole('BUSINESS_USER')}
              style={{
                padding: '9px 0',
                borderRadius: 8,
                fontSize: '0.85rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                border: 'none',
                cursor: 'pointer',
                background: role === 'BUSINESS_USER' ? 'linear-gradient(135deg, #059669 0%, #047857 100%)' : 'transparent',
                color: role === 'BUSINESS_USER' ? '#fff' : 'var(--text-muted)',
                boxShadow: role === 'BUSINESS_USER' ? '0 4px 12px rgba(5, 150, 105, 0.3)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              <Store size={15} /> Business / Desk
            </button>
          </div>

          {error && (
            <div style={{
              background: 'rgba(244, 63, 94, 0.1)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              color: '#e11d48',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              marginBottom: 16,
              fontSize: '0.84rem'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 5 }}>
                Full Name *
              </label>
              <div className="login-input-wrapper">
                <input 
                  type="text" 
                  required
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Dr. Ramesh Gupta"
                />
                <User size={17} className="login-input-icon" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 5 }}>
                  Email Address *
                </label>
                <div className="login-input-wrapper">
                  <input 
                    type="email" 
                    required
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ramesh@example.com"
                  />
                  <Mail size={17} className="login-input-icon" />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 5 }}>
                  Phone Number
                </label>
                <div className="login-input-wrapper">
                  <input 
                    type="text" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 9876543210"
                  />
                  <Phone size={17} className="login-input-icon" />
                </div>
              </div>
            </div>

            {role === 'BUSINESS_USER' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 5 }}>
                      Business Name *
                    </label>
                    <div className="login-input-wrapper">
                      <input 
                        type="text" 
                        required
                        value={businessName} 
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder="Sunshine Clinic"
                      />
                      <Building2 size={17} className="login-input-icon" />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 5 }}>
                      Category
                    </label>
                    <div className="login-input-wrapper">
                      <select 
                        value={businessCategory}
                        onChange={(e) => setBusinessCategory(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '11px 12px 11px 40px',
                          borderRadius: 'var(--radius-md)',
                          border: '1.5px solid var(--border-subtle)',
                          background: '#f8fafc',
                          fontSize: '0.85rem'
                        }}
                      >
                        <option value="Healthcare & Clinic">Healthcare & Clinic</option>
                        <option value="Salon & Spa">Salon & Spa</option>
                        <option value="Restaurant & Food">Restaurant & Food</option>
                        <option value="Automotive & Service">Automotive & Service</option>
                        <option value="Banking & Financial">Banking & Financial</option>
                        <option value="Government & Academic">Government & Academic</option>
                      </select>
                      <Tag size={17} className="login-input-icon" />
                    </div>
                  </div>
                </div>

                {plans.length > 0 && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 5 }}>
                      Subscription Tier
                    </label>
                    <div className="login-input-wrapper">
                      <select 
                        value={selectedPlanId}
                        onChange={(e) => setSelectedPlanId(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '11px 12px 11px 40px',
                          borderRadius: 'var(--radius-md)',
                          border: '1.5px solid var(--border-subtle)',
                          background: '#f8fafc',
                          fontSize: '0.85rem'
                        }}
                      >
                        {plans.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} — {p.priceMonthly > 0 ? `₹${p.priceMonthly}/mo` : 'Free / Trial'}
                          </option>
                        ))}
                      </select>
                      <Zap size={17} className="login-input-icon" />
                    </div>
                  </div>
                )}
              </>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 5 }}>
                Password *
              </label>
              <div className="login-input-wrapper">
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  required
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <Lock size={17} className="login-input-icon" />
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
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
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
                padding: '11px',
                marginTop: 2,
                fontSize: '0.9rem',
                fontWeight: 700,
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 8px 20px rgba(37, 99, 235, 0.25)'
              }}
            >
              {loading ? 'Creating Account...' : (
                <>
                  Complete Free Registration <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 24, fontSize: '0.84rem', color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <span onClick={onLoginClick} style={{ color: '#4f46e5', fontWeight: 700, cursor: 'pointer' }}>
              Sign In
            </span>
          </div>

        </div>

      </div>
    </div>
  );
}
