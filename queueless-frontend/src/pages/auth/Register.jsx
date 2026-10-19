import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import {
  Clock,
  ArrowRight,
  ArrowLeft,
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
  Activity,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import heroImg from '../../assets/login_hero.jpg';

export default function Register({ pendingQueue, onLoginClick, onRegisterSuccess, onBack }) {
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
    <div className="light-auth-page-root">
      {/* Ambient glowing pastel mesh background */}
      <div className="light-mesh-cyan" />
      <div className="light-mesh-violet" />
      <div className="light-mesh-emerald" />

      {/* Top Back Navigation Bar */}
      {onBack && (
        <div style={{ width: '100%', maxWidth: 1060, marginBottom: 14, display: 'flex', justifyContent: 'flex-start' }}>
          <button
            type="button"
            onClick={onBack}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: '#ffffff',
              border: '1.5px solid #e2e8f0',
              borderRadius: 24,
              padding: '8px 18px',
              fontSize: '0.85rem',
              fontWeight: 700,
              color: '#475569',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#c7d2fe';
              e.currentTarget.style.color = '#4338ca';
              e.currentTarget.style.transform = 'translateX(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.color = '#475569';
              e.currentTarget.style.transform = 'none';
            }}
          >
            <ArrowLeft size={16} /> Back to Discover
          </button>
        </div>
      )}

      {/* Main Luminous Auth Card */}
      <div className="light-auth-card responsive-login-grid">
        {/* Animated Shining Top Prismatic Beam */}
        <div className="light-card-top-beam" />

        {/* Animated Diagonal Light Sweep Gleam */}
        <div className="light-card-sweep-gleam" />

        {/* LEFT COLUMN: Visual Hero Showcase */}
        {/* LEFT COLUMN: Visual Hero Showcase (Pure Luminous Light Theme) */}
        <div className="light-hero-col">
          <div className="hero-orb-cyan" />
          <div className="hero-orb-violet" />

          {/* Top Brand Tag */}
          <div className="light-hero-top-row">
            <div className="light-hero-brand">
              <div className="light-brand-icon-box">
                <Clock size={20} color="#ffffff" />
              </div>
              <span className="light-brand-text">
                Queue<span className="light-brand-accent">Less</span>
              </span>
            </div>

            <div className="light-hero-pill-badge">
              <Activity size={12} color="#2563eb" />
              <span>Instant Onboarding</span>
              <span className="live-sparkle-dot" />
            </div>
          </div>

          {/* Center Graphic */}
          <div className="light-hero-graphic-wrap">
            <div className="light-img-frame">
              <img
                src={heroImg}
                alt="QueueLess Registration Showcase"
                className="light-hero-image"
              />
              <div className="light-img-gradient-overlay" />
            </div>

            <div className="light-hero-text-block">
              <h3 className="light-hero-title">
                Cut Wait Times by 80%. <br />
                <span className="light-hero-gradient-title">
                  Smart Digital Token Platform.
                </span>
              </h3>
              <p className="light-hero-desc">
                Register as a customer to hold live tokens remotely, or onboard your business desk to eliminate physical lines.
              </p>
            </div>
          </div>

          {/* Bottom Bullet Points */}
          <div className="light-hero-bullets">
            <div className="light-bullet-item">
              <CheckCircle2 size={16} color="#059669" />
              <span>Fast 1-minute setup for clinics, salons &amp; desks</span>
            </div>
            <div className="light-bullet-item">
              <CheckCircle2 size={16} color="#2563eb" />
              <span>Fair digital queue tokens with live status tracking</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Registration Form (Pure High-Contrast Light Theme) */}
        <div className="light-form-col">
          <div className="light-form-header">
            <div className="light-sub-badge">
              <Sparkles size={13} color="#4338ca" />
              <span>Start Free • No Credit Card Required</span>
            </div>
            <h2 className="light-form-title">
              Create Your Account <span className="rocket-bounce">🚀</span>
            </h2>
            <p className="light-form-subtitle">
              Choose customer or business account type to get started
            </p>
          </div>

          {/* Pending Queue Alert (if user was trying to join before auth) */}
          {pendingQueue && (
            <div className="light-pending-alert">
              <Lock size={16} color="#4f46e5" style={{ flexShrink: 0 }} />
              <div>
                Create an account to join the queue for <strong style={{ color: '#0f172a' }}>{pendingQueue.service?.name}</strong> at <strong style={{ color: '#0f172a' }}>{pendingQueue.biz?.name}</strong>.
              </div>
            </div>
          )}

          {/* Role Segment Toggle (Customer vs Business) */}
          <div className="light-role-toggle-box">
            <button
              type="button"
              onClick={() => setRole('CUSTOMER')}
              className={`light-role-btn ${role === 'CUSTOMER' ? 'active-customer' : ''}`}
            >
              <Users size={15} />
              <span>Customer Account</span>
              {role === 'CUSTOMER' && <span className="active-glow-pip" />}
            </button>
            <button
              type="button"
              onClick={() => setRole('BUSINESS_USER')}
              className={`light-role-btn ${role === 'BUSINESS_USER' ? 'active-business' : ''}`}
            >
              <Store size={15} />
              <span>Business / Desk</span>
              {role === 'BUSINESS_USER' && <span className="active-glow-pip green" />}
            </button>
          </div>

          {error && (
            <div className="light-error-banner">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="light-form-fields">
            {/* Full Name */}
            <div className="light-input-group">
              <label className="light-input-label">
                Full Name <span className="star-req">*</span>
              </label>
              <div className="light-input-wrapper">
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Dr. Ramesh Gupta"
                  className="light-input"
                />
                <User size={17} className="light-input-icon" />
                <span className="light-focus-line" />
              </div>
            </div>

            {/* Email Address & Phone Number (Row 2) */}
            <div className="light-grid-2-fields">
              <div className="light-input-group">
                <label className="light-input-label">
                  Email Address <span className="star-req">*</span>
                </label>
                <div className="light-input-wrapper">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ramesh@example.com"
                    className="light-input"
                  />
                  <Mail size={17} className="light-input-icon" />
                  <span className="light-focus-line" />
                </div>
              </div>

              <div className="light-input-group">
                <label className="light-input-label">
                  Phone Number
                </label>
                <div className="light-input-wrapper">
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="light-input"
                  />
                  <Phone size={17} className="light-input-icon" />
                  <span className="light-focus-line" />
                </div>
              </div>
            </div>

            {/* Business Specific Fields (Only when role is BUSINESS_USER) */}
            {role === 'BUSINESS_USER' && (
              <div className="light-business-details-box">
                <div className="light-biz-badge">
                  <Sparkles size={12} color="#059669" />
                  <span>Business Configuration</span>
                </div>

                <div className="light-grid-2-fields" style={{ marginTop: 10 }}>
                  <div className="light-input-group">
                    <label className="light-input-label">
                      Business Name <span className="star-req">*</span>
                    </label>
                    <div className="light-input-wrapper">
                      <input
                        type="text"
                        required
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder="Sunshine Clinic"
                        className="light-input"
                      />
                      <Building2 size={17} className="light-input-icon" />
                      <span className="light-focus-line" />
                    </div>
                  </div>

                  <div className="light-input-group">
                    <label className="light-input-label">
                      Category
                    </label>
                    <div className="light-input-wrapper">
                      <select
                        value={businessCategory}
                        onChange={(e) => setBusinessCategory(e.target.value)}
                        className="light-input light-select"
                      >
                        <option value="Healthcare & Clinic">Healthcare &amp; Clinic</option>
                        <option value="Salon & Spa">Salon &amp; Spa</option>
                        <option value="Restaurant & Food">Restaurant &amp; Food</option>
                        <option value="Automotive & Service">Automotive &amp; Service</option>
                        <option value="Banking & Financial">Banking &amp; Financial</option>
                        <option value="Government & Academic">Government &amp; Academic</option>
                      </select>
                      <Tag size={17} className="light-input-icon" />
                      <span className="light-focus-line" />
                    </div>
                  </div>
                </div>

                {plans.length > 0 && (
                  <div className="light-input-group" style={{ marginTop: 12 }}>
                    <label className="light-input-label">
                      Subscription Tier
                    </label>
                    <div className="light-input-wrapper">
                      <select
                        value={selectedPlanId}
                        onChange={(e) => setSelectedPlanId(e.target.value)}
                        className="light-input light-select"
                      >
                        {plans.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} — {p.priceMonthly > 0 ? `₹${p.priceMonthly}/mo` : 'Free / Trial'}
                          </option>
                        ))}
                      </select>
                      <Zap size={17} className="light-input-icon" />
                      <span className="light-focus-line" />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Password Field */}
            <div className="light-input-group">
              <label className="light-input-label">
                Password <span className="star-req">*</span>
              </label>
              <div className="light-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="light-input"
                />
                <Lock size={17} className="light-input-icon" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="light-eye-toggle-btn"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
                <span className="light-focus-line" />
              </div>
            </div>

            {/* Submit Button with Shining Light Sweep */}
            <button
              type="submit"
              disabled={loading}
              className="light-submit-btn"
            >
              <span className="btn-shine-gleam" />
              <span className="btn-inner-content">
                {loading ? (
                  <>
                    <span className="light-spinner" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <span>Complete Free Registration</span>
                    <ArrowRight size={16} className="btn-icon-slide" />
                  </>
                )}
              </span>
            </button>
          </form>

          {/* Switch to Sign In */}
          <div className="light-form-footer">
            Already have an account?{' '}
            <button
              type="button"
              onClick={onLoginClick}
              className="light-switch-btn"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>

      {/* Scoped CSS Styles for Pure Light Theme with Shining & Micro-Animations */}
      <style>{`
        .light-auth-page-root {
          min-height: 85vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          padding: 36px 20px 70px 20px;
          background: radial-gradient(at 0% 0%, rgba(224, 231, 255, 0.6) 0px, transparent 50%),
                      radial-gradient(at 100% 0%, rgba(219, 234, 254, 0.7) 0px, transparent 50%),
                      radial-gradient(at 100% 100%, rgba(243, 232, 255, 0.6) 0px, transparent 50%),
                      radial-gradient(at 0% 100%, rgba(209, 250, 229, 0.4) 0px, transparent 50%),
                      #f8fafc;
          position: relative;
          overflow: hidden;
        }

        /* Ambient glowing pastel mesh blobs */
        .light-mesh-cyan {
          position: absolute;
          top: -60px;
          left: 10%;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(56, 189, 248, 0.22) 0%, rgba(56, 189, 248, 0) 70%);
          filter: blur(80px);
          pointer-events: none;
          animation: floatMeshLight 8s ease-in-out infinite alternate;
        }

        .light-mesh-violet {
          position: absolute;
          bottom: -80px;
          right: 8%;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(168, 85, 247, 0.18) 0%, rgba(168, 85, 247, 0) 70%);
          filter: blur(90px);
          pointer-events: none;
          animation: floatMeshLight 10s ease-in-out infinite alternate-reverse;
        }

        .light-mesh-emerald {
          position: absolute;
          top: 45%;
          right: 35%;
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, rgba(16, 185, 129, 0) 70%);
          filter: blur(70px);
          pointer-events: none;
        }

        @keyframes floatMeshLight {
          0% { transform: translate(0, 0) scale(0.95); opacity: 0.7; }
          100% { transform: translate(25px, -20px) scale(1.1); opacity: 1; }
        }

        /* Main Luminous Auth Card */
        .light-auth-card {
          position: relative;
          z-index: 10;
          max-width: 1040px;
          width: 100%;
          display: grid;
          grid-template-columns: 1.02fr 1fr;
          background: rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border-radius: 24px;
          border: 1px solid rgba(226, 232, 240, 0.9);
          box-shadow: 
            0 30px 80px -15px rgba(99, 102, 241, 0.15),
            0 10px 25px -5px rgba(15, 23, 42, 0.05),
            0 0 0 1px rgba(255, 255, 255, 0.95);
          overflow: hidden;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .light-auth-card:hover {
          box-shadow: 
            0 35px 85px -15px rgba(79, 70, 229, 0.22),
            0 15px 35px -5px rgba(15, 23, 42, 0.08);
          transform: translateY(-2px);
        }

        @media (max-width: 900px) {
          .light-auth-card {
            grid-template-columns: 1fr !important;
          }
        }

        /* Animated Shining Top Beam */
        .light-card-top-beam {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3.5px;
          background: linear-gradient(90deg, #38bdf8, #6366f1, #a855f7, #ec4899, #38bdf8);
          background-size: 200% 100%;
          z-index: 25;
          animation: moveBeam 4s linear infinite;
          box-shadow: 0 0 12px rgba(99, 102, 241, 0.5);
        }

        @keyframes moveBeam {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }

        /* Diagonal Gleam Sweep */
        .light-card-sweep-gleam {
          position: absolute;
          top: 0;
          left: -150%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.7), rgba(199, 210, 254, 0.25), transparent);
          transform: skewX(-20deg);
          pointer-events: none;
          z-index: 20;
          animation: sweepGleam 7s infinite ease-in-out;
        }

        @keyframes sweepGleam {
          0% { transform: translateX(0) skewX(-20deg); }
          50%, 100% { transform: translateX(280%) skewX(-20deg); }
        }

        /* --- LEFT COLUMN: Hero Showcase (100% Light Theme) --- */
        .light-hero-col {
          background: linear-gradient(155deg, #f8fafc 0%, #eff6ff 45%, #f5f3ff 100%);
          border-right: 1px solid rgba(226, 232, 240, 0.9);
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 30px 28px;
          color: #0f172a;
        }

        .hero-orb-cyan {
          position: absolute;
          top: -40px;
          left: -40px;
          width: 260px;
          height: 260px;
          background: radial-gradient(circle, rgba(56, 189, 248, 0.25) 0%, transparent 70%);
          border-radius: 50%;
          animation: floatOrb 8s infinite ease-in-out;
          pointer-events: none;
        }

        .hero-orb-violet {
          position: absolute;
          bottom: -50px;
          right: -50px;
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(168, 85, 247, 0.2) 0%, transparent 70%);
          border-radius: 50%;
          animation: floatOrb 10s infinite ease-in-out reverse;
          pointer-events: none;
        }

        @keyframes floatOrb {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-16px); }
        }

        .light-hero-top-row {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .light-hero-brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .light-brand-icon-box {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: linear-gradient(135deg, #2563eb, #6366f1);
          border: 1px solid rgba(255, 255, 255, 0.8);
          box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .light-brand-text {
          font-size: 1.25rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.02em;
          font-family: var(--font-heading);
        }

        .light-brand-accent {
          background: linear-gradient(135deg, #2563eb, #7c3aed);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .light-hero-pill-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid #bfdbfe;
          padding: 5px 12px;
          border-radius: var(--radius-full);
          font-size: 0.74rem;
          font-weight: 700;
          color: #1e40af;
          box-shadow: 0 2px 10px rgba(37, 99, 235, 0.08);
          backdrop-filter: blur(8px);
        }

        .live-sparkle-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 8px #10b981;
          animation: pingDot 1.5s infinite;
        }

        @keyframes pingDot {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.6); opacity: 0.4; }
          100% { transform: scale(1); opacity: 1; }
        }

        .light-hero-graphic-wrap {
          position: relative;
          z-index: 2;
          margin: 16px 0;
        }

        .light-img-frame {
          position: relative;
          border-radius: 18px;
          overflow: hidden;
          border: 1px solid rgba(226, 232, 240, 0.95);
          box-shadow: 0 16px 36px -10px rgba(99, 102, 241, 0.18), 0 4px 12px rgba(15, 23, 42, 0.05);
        }

        .light-hero-image {
          width: 100%;
          max-height: 195px;
          object-fit: cover;
          display: block;
          transition: transform 0.6s ease;
        }

        .light-img-frame:hover .light-hero-image {
          transform: scale(1.04);
        }

        .light-img-gradient-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, transparent 60%, rgba(15, 23, 42, 0.35) 100%);
          pointer-events: none;
        }

        .light-floating-counter-tag {
          position: absolute;
          bottom: 10px;
          left: 10px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(199, 210, 254, 0.9);
          padding: 5px 11px;
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.72rem;
          font-weight: 700;
          color: #1e1b4b;
          box-shadow: 0 6px 18px -4px rgba(15, 23, 42, 0.12);
        }

        .spark-pulse {
          animation: pulse 2s infinite;
        }

        .light-hero-text-block {
          margin-top: 14px;
        }

        .light-hero-title {
          font-size: 1.45rem;
          font-weight: 800;
          line-height: 1.25;
          margin-bottom: 6px;
          color: #0f172a;
        }

        .light-hero-gradient-title {
          background: linear-gradient(135deg, #2563eb 0%, #4f46e5 50%, #7c3aed 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .light-hero-desc {
          font-size: 0.84rem;
          color: #334155;
          line-height: 1.5;
          font-weight: 500;
        }

        .light-hero-bullets {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          gap: 8px;
          border-top: 1px solid rgba(226, 232, 240, 0.9);
          padding-top: 14px;
        }

        .light-bullet-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.81rem;
          color: #1e293b;
          font-weight: 600;
          background: rgba(255, 255, 255, 0.85);
          border: 1px solid rgba(219, 234, 254, 0.8);
          border-radius: 10px;
          padding: 8px 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.03);
        }

        /* --- RIGHT COLUMN: Registration Form (Pure Light Theme) --- */
        .light-form-col {
          padding: 30px 32px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          background: #ffffff;
        }

        .light-form-header {
          margin-bottom: 14px;
        }

        .light-sub-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 3px 10px;
          border-radius: var(--radius-full);
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          color: #1d4ed8;
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 6px;
        }

        .light-form-title {
          font-size: 1.6rem;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 3px;
          letter-spacing: -0.02em;
        }

        .rocket-bounce {
          display: inline-block;
          animation: bounceRocket 2.5s ease-in-out infinite alternate;
        }

        @keyframes bounceRocket {
          0% { transform: translateY(0); }
          100% { transform: translateY(-5px); }
        }

        .light-form-subtitle {
          font-size: 0.86rem;
          color: #64748b;
          font-weight: 500;
        }

        .light-pending-alert {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          color: #1e40af;
          padding: 10px 14px;
          border-radius: 10px;
          margin-bottom: 14px;
          font-size: 0.84rem;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* Role Segment Toggle */
        .light-role-toggle-box {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          background: #f1f5f9;
          border: 1.5px solid #e2e8f0;
          padding: 4px;
          border-radius: 12px;
          margin-bottom: 16px;
        }

        .light-role-btn {
          padding: 9px 0;
          border-radius: 9px;
          font-size: 0.84rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: none;
          cursor: pointer;
          background: transparent;
          color: #64748b;
          position: relative;
          transition: all 0.25s ease;
        }

        .light-role-btn:hover {
          color: #0f172a;
          background: rgba(255, 255, 255, 0.7);
        }

        .light-role-btn.active-customer {
          background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
          color: #ffffff !important;
          box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
        }

        .light-role-btn.active-business {
          background: linear-gradient(135deg, #059669 0%, #0d9488 100%);
          color: #ffffff !important;
          box-shadow: 0 4px 14px rgba(5, 150, 105, 0.35);
        }

        .active-glow-pip {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #ffffff;
          box-shadow: 0 0 6px #ffffff;
        }

        .light-error-banner {
          background: #fff1f2;
          border: 1px solid #fecdd3;
          color: #e11d48;
          padding: 9px 12px;
          border-radius: 10px;
          margin-bottom: 14px;
          font-size: 0.83rem;
          font-weight: 600;
        }

        .light-form-fields {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .light-input-group {
          display: flex;
          flex-direction: column;
        }

        .light-grid-2-fields {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        @media (max-width: 600px) {
          .light-grid-2-fields { grid-template-columns: 1fr; }
        }

        .light-input-label {
          display: block;
          font-size: 0.82rem;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 5px;
        }

        .star-req {
          color: #ef4444;
          font-weight: 800;
          margin-left: 2px;
        }

        /* High-Contrast Inputs */
        .light-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .light-input {
          width: 100%;
          padding: 10px 14px 10px 40px;
          border-radius: 11px;
          border: 1.5px solid #cbd5e1;
          background: #ffffff;
          color: #0f172a !important;
          font-size: 0.9rem;
          font-weight: 600;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          outline: none;
        }

        .light-input::placeholder {
          color: #94a3b8;
          font-weight: 400;
        }

        .light-input:hover {
          border-color: #94a3b8;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
        }

        .light-input:focus {
          border-color: #4f46e5;
          background: #ffffff;
          box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.15), 0 4px 12px rgba(79, 70, 229, 0.08);
          transform: translateY(-1px);
        }

        .light-select {
          cursor: pointer;
        }

        .light-select option {
          background: #ffffff;
          color: #0f172a;
        }

        .light-input-icon {
          position: absolute;
          left: 13px;
          color: #64748b;
          pointer-events: none;
          transition: color 0.2s ease, transform 0.2s ease;
        }

        .light-input-wrapper:focus-within .light-input-icon {
          color: #4f46e5;
          transform: scale(1.08);
        }

        .light-eye-toggle-btn {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 4px;
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .light-eye-toggle-btn:hover {
          color: #0f172a;
          background: #f1f5f9;
        }

        .light-business-details-box {
          background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
          border: 1.5px solid #a7f3d0;
          padding: 14px;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.08);
        }

        .light-biz-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.72rem;
          font-weight: 800;
          color: #065f46;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        /* Shining Animated Submit Button */
        .light-submit-btn {
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #2563eb 0%, #4f46e5 50%, #7c3aed 100%);
          color: #ffffff;
          font-weight: 700;
          font-size: 0.94rem;
          padding: 12px;
          border-radius: 11px;
          cursor: pointer;
          border: none;
          box-shadow: 
            0 8px 22px -4px rgba(79, 70, 229, 0.42),
            0 4px 10px -2px rgba(37, 99, 235, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          margin-top: 4px;
        }

        .light-submit-btn:hover:not(:disabled) {
          box-shadow: 
            0 12px 28px -4px rgba(79, 70, 229, 0.52),
            0 6px 14px rgba(37, 99, 235, 0.35);
          transform: translateY(-2px);
          filter: brightness(1.03);
        }

        .light-submit-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .btn-shine-gleam {
          position: absolute;
          top: 0;
          left: -120%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.45), transparent);
          transform: skewX(-25deg);
          animation: btnShine 3.5s infinite ease-in-out;
        }

        @keyframes btnShine {
          0% { transform: translateX(0) skewX(-25deg); }
          40%, 100% { transform: translateX(260%) skewX(-25deg); }
        }

        .btn-inner-content {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          position: relative;
          z-index: 2;
        }

        .btn-icon-slide {
          transition: transform 0.2s ease;
        }

        .light-submit-btn:hover .btn-icon-slide {
          transform: translateX(4px);
        }

        .light-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.4);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .light-form-footer {
          text-align: center;
          margin-top: 18px;
          font-size: 0.86rem;
          color: #64748b;
          font-weight: 500;
        }

        .light-switch-btn {
          background: none;
          border: none;
          color: #4f46e5;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 0.86rem;
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        .light-switch-btn:hover {
          color: #3730a3;
        }
      `}</style>
    </div>
  );
}
