import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { 
  Building2, 
  CreditCard, 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  Store, 
  ShieldCheck, 
  Zap, 
  Clock, 
  Users, 
  Layers, 
  MapPin,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

const CATEGORIES = [
  'Healthcare & Clinic',
  'Salon & Spa',
  'Restaurant & Food',
  'Automotive & Service',
  'Banking & Financial',
  'Government & Academic',
  'Retail & Shopping',
  'Hospital & Diagnostic',
  'Professional Services',
  'Other'
];

export default function JoinBusiness({ onSuccess, onCancel }) {
  const { user, register, refreshUser } = useAuth();

  const [step, setStep] = useState(1);
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loadingPlans, setLoadingPlans] = useState(true);

  // Form State
  const [formData, setFormData] = useState({
    // User credentials (if not logged in)
    fullName: user?.fullName || '',
    email: user?.email || '',
    password: '',
    phone: user?.phone || '',

    // Business details
    businessName: '',
    category: 'Healthcare & Clinic',
    businessPhone: user?.phone || '',
    businessEmail: user?.email || '',
    description: '',

    // Primary branch
    branchName: 'Main Branch',
    address: '',
    city: 'Bengaluru',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPlans();
  }, []);

  async function loadPlans() {
    setLoadingPlans(true);
    try {
      const res = await api.getPlans();
      if (res.success && res.data?.length > 0) {
        setPlans(res.data);
        // Default to first active plan or Pro plan
        const recommended = res.data.find(p => p.name.toLowerCase().includes('pro')) || res.data[0];
        setSelectedPlan(recommended);
      }
    } catch (err) {
      console.error('Failed to load plans:', err);
    } finally {
      setLoadingPlans(false);
    }
  }

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
    setStep(2);
  };

  const handleNextToReview = (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.businessName.trim()) {
      setError('Business name is required');
      return;
    }

    if (!user && (!formData.email || !formData.password || !formData.fullName)) {
      setError('Please provide your name, email, and password to create your account.');
      return;
    }

    setStep(3);
  };

  const handleFinalSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      let activeToken = localStorage.getItem('queueless_token');

      // 1. If not logged in, register first as BUSINESS_USER
      if (!user) {
        const regRes = await register({
          fullName: formData.fullName,
          email: formData.email,
          password: formData.password,
          phone: formData.phone || formData.businessPhone,
          role: 'BUSINESS_USER',
        });
        activeToken = localStorage.getItem('queueless_token');
      }

      // 2. Create business and associate selected subscription plan
      const bizRes = await api.createBusiness({
        name: formData.businessName,
        category: formData.category,
        description: formData.description || `Premier ${formData.category} operating on QueueLess`,
        phone: formData.businessPhone || formData.phone,
        email: formData.businessEmail || formData.email,
        initialBranchName: formData.branchName || 'Main Branch',
        address: formData.address || 'Headquarters',
        city: formData.city || 'Bengaluru',
        planId: selectedPlan?.id,
      });

      if (!bizRes.success) {
        throw new Error(bizRes.error || 'Failed to create business');
      }

      // 3. Refresh user session with new token if supplied
      if (bizRes.token) {
        await refreshUser(bizRes.token);
      } else {
        await refreshUser();
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(err.message || 'Failed to complete registration and subscription.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '36px 20px 80px' }}>
      {/* Top Banner / Progress Indicator */}
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: 8, 
          background: '#ede9fe', 
          color: '#4f46e5', 
          padding: '6px 14px', 
          borderRadius: 20, 
          fontSize: '0.82rem', 
          fontWeight: 700, 
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: 12
        }}>
          <Sparkles size={16} /> Partner with QueueLess
        </div>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
          Launch Your <span style={{ background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Business Queues</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: 620, margin: '8px auto 0' }}>
          Empower your clinic, salon, or service center with real-time digital queues, multi-branch desks, and automated notifications.
        </p>

        {/* Step Indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 24, marginTop: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => setStep(1)}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: step >= 1 ? 'var(--accent-primary)' : '#e2e8f0',
              color: step >= 1 ? '#ffffff' : 'var(--text-dim)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.9rem'
            }}>
              1
            </div>
            <span style={{ fontSize: '0.88rem', fontWeight: step === 1 ? 700 : 500, color: step === 1 ? 'var(--text-main)' : 'var(--text-muted)' }}>
              Choose Plan
            </span>
          </div>

          <div style={{ width: 40, height: 2, background: step >= 2 ? 'var(--accent-primary)' : '#cbd5e1' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => selectedPlan && setStep(2)}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: step >= 2 ? 'var(--accent-primary)' : '#e2e8f0',
              color: step >= 2 ? '#ffffff' : 'var(--text-dim)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.9rem'
            }}>
              2
            </div>
            <span style={{ fontSize: '0.88rem', fontWeight: step === 2 ? 700 : 500, color: step === 2 ? 'var(--text-main)' : 'var(--text-muted)' }}>
              Business Profile
            </span>
          </div>

          <div style={{ width: 40, height: 2, background: step >= 3 ? 'var(--accent-primary)' : '#cbd5e1' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: step >= 3 ? 'var(--accent-primary)' : '#e2e8f0',
              color: step >= 3 ? '#ffffff' : 'var(--text-dim)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.9rem'
            }}>
              3
            </div>
            <span style={{ fontSize: '0.88rem', fontWeight: step === 3 ? 700 : 500, color: step === 3 ? 'var(--text-main)' : 'var(--text-muted)' }}>
              Review & Launch
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div style={{
          maxWidth: 720,
          margin: '0 auto 24px',
          background: 'rgba(244, 63, 94, 0.1)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          color: '#e11d48',
          padding: '14px 18px',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: '0.9rem'
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* ========================================================
          STEP 1: SELECT SUBSCRIPTION PLAN
         ======================================================== */}
      {step === 1 && (
        <div>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 700 }}>Step 1: Select a Subscription Tier</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginTop: 4 }}>
              Choose the package that aligns with your branches, queue volume, and customer notification needs.
            </p>
          </div>

          {loadingPlans ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
              Loading subscription plans...
            </div>
          ) : (
            <div className="grid-cols-4" style={{ alignItems: 'stretch' }}>
              {plans.map((p) => {
                const isSelected = selectedPlan?.id === p.id;
                const isPro = p.name.toLowerCase().includes('pro');

                return (
                  <div 
                    key={p.id} 
                    className={isSelected ? "glass-panel-glow" : "glass-panel"} 
                    style={{ 
                      padding: 24, 
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'space-between',
                      position: 'relative',
                      border: isSelected ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer'
                    }}
                    onClick={() => setSelectedPlan(p)}
                  >
                    {isPro && (
                      <div style={{
                        position: 'absolute',
                        top: -12,
                        right: 18,
                        background: 'var(--accent-gradient)',
                        color: '#fff',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        padding: '3px 10px',
                        borderRadius: 20,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        Most Popular
                      </div>
                    )}

                    <div>
                      <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 4 }}>{p.name}</h3>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, margin: '14px 0 16px' }}>
                        <span style={{ fontSize: '2.2rem', fontWeight: 800 }}>₹{p.priceMonthly}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>/ month</span>
                      </div>

                      {/* Specs */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20, borderTop: '1px solid var(--border-subtle)', paddingTop: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.84rem' }}>
                          <Check size={15} color="#10b981" />
                          <span>Up to <strong>{p.maxBranches}</strong> {p.maxBranches === 1 ? 'Branch' : 'Branches'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.84rem' }}>
                          <Check size={15} color="#10b981" />
                          <span>Up to <strong>{p.maxServices}</strong> Services per branch</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.84rem' }}>
                          <Check size={15} color="#10b981" />
                          <span><strong>{p.maxDailyQueueLimit}</strong> Daily Queue Limit</span>
                        </div>
                        {p.features?.map((f, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.84rem' }}>
                            <Check size={15} color="#10b981" />
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button 
                      type="button"
                      onClick={() => handleSelectPlan(p)} 
                      className={isSelected ? "btn-primary" : "btn-secondary"}
                      style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}
                    >
                      {isSelected ? 'Selected' : 'Select Plan'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Action Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 36 }}>
            <button type="button" onClick={onCancel} className="btn-secondary">
              Back to Discover Queues
            </button>
            <button 
              type="button" 
              onClick={() => setStep(2)} 
              disabled={!selectedPlan}
              className="btn-primary"
              style={{ padding: '12px 28px', fontSize: '1rem' }}
            >
              Continue with {selectedPlan?.name || 'Selected'} Plan <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          STEP 2: BUSINESS & USER REGISTRATION FORM
         ======================================================== */}
      {step === 2 && (
        <div style={{ maxWidth: 740, margin: '0 auto' }}>
          <div className="glass-panel" style={{ padding: 36 }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Step 2: Business Profile & Registration</h2>
                <div style={{ 
                  background: '#ede9fe', 
                  color: '#4f46e5', 
                  borderRadius: 8, 
                  padding: '4px 10px', 
                  fontSize: '0.8rem', 
                  fontWeight: 700 
                }}>
                  {selectedPlan?.name} (₹{selectedPlan?.priceMonthly}/mo)
                </div>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: 4 }}>
                Enter the operational credentials and location for your business desk.
              </p>
            </div>

            <form onSubmit={handleNextToReview} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* User Account Section */}
              {user ? (
                <div style={{ 
                  background: '#f8fafc', 
                  border: '1px solid var(--border-subtle)', 
                  borderRadius: 12, 
                  padding: '16px 20px', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center' 
                }}>
                  <div>
                    <div style={{ fontSize: '0.78rem', color: '#4f46e5', fontWeight: 700, textTransform: 'uppercase' }}>
                      Account Upgrade
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', marginTop: 2 }}>{user.fullName} ({user.email})</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Your current account will be upgraded to Business Partner with owner privileges.
                    </div>
                  </div>
                  <div style={{ background: '#dcfce7', color: '#15803d', padding: '6px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700 }}>
                    Logged In
                  </div>
                </div>
              ) : (
                <div style={{ background: '#fafafa', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 20 }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 14 }}>Business User Account Credentials</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Your Full Name *</label>
                      <input 
                        type="text" 
                        required
                        className="form-input" 
                        placeholder="e.g. Dr. Rajesh Sharma"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Email Address *</label>
                      <input 
                        type="email" 
                        required
                        className="form-input" 
                        placeholder="contact@business.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Account Password *</label>
                      <input 
                        type="password" 
                        required
                        className="form-input" 
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Phone Number</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="+91 9876543210"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Business Entity Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                    Business / Clinic Name *
                  </label>
                  <input 
                    type="text" 
                    required
                    className="form-input"
                    placeholder="e.g. Apex Health & Wellness"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                    Business Category *
                  </label>
                  <select 
                    className="form-input"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  Business Tagline / Short Description
                </label>
                <input 
                  type="text" 
                  className="form-input"
                  placeholder="e.g. Premier outpatient clinic providing general medicine and diagnostics"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {/* Primary Branch Info */}
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 18 }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 12 }}>Primary Branch Location</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 14 }}>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                      Branch Name
                    </label>
                    <input 
                      type="text" 
                      className="form-input"
                      placeholder="e.g. Indiranagar Branch or Main Desk"
                      value={formData.branchName}
                      onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                      City *
                    </label>
                    <input 
                      type="text" 
                      required
                      className="form-input"
                      placeholder="e.g. Bengaluru"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                    Address / Landmark
                  </label>
                  <input 
                    type="text" 
                    className="form-input"
                    placeholder="e.g. 100 Feet Road, 12th Main, HAL 2nd Stage"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
              </div>

              {/* Step Navigation */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 }}>
                <button type="button" onClick={() => setStep(1)} className="btn-secondary">
                  <ArrowLeft size={16} /> Change Plan
                </button>
                <button type="submit" className="btn-primary" style={{ padding: '12px 28px' }}>
                  Proceed to Review <ArrowRight size={16} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          STEP 3: REVIEW & LAUNCH BUSINESS DESK
         ======================================================== */}
      {step === 3 && (
        <div style={{ maxWidth: 740, margin: '0 auto' }}>
          <div className="glass-panel" style={{ padding: 36 }}>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ 
                width: 54, 
                height: 54, 
                borderRadius: '50%', 
                background: '#ede9fe', 
                color: '#4f46e5', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                margin: '0 auto 12px' 
              }}>
                <CheckCircle2 size={30} />
              </div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 700 }}>Review & Activate Subscription</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
                Please review your selected subscription tier and business details before launching.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Selected Plan Summary Card */}
              <div style={{ 
                background: 'linear-gradient(135deg, #f8fafc 0%, #ede9fe 100%)', 
                border: '1px solid #c7d2fe', 
                borderRadius: 14, 
                padding: 22 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase' }}>
                      Subscription Plan
                    </span>
                    <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: 2 }}>{selectedPlan?.name} Tier</h3>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1e1b4b' }}>₹{selectedPlan?.priceMonthly}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/ month</div>
                  </div>
                </div>

                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(3, 1fr)', 
                  gap: 12, 
                  marginTop: 16, 
                  paddingTop: 14, 
                  borderTop: '1px solid rgba(99, 102, 241, 0.2)' 
                }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Branch Capacity</span>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Up to {selectedPlan?.maxBranches}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Services per Branch</span>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Up to {selectedPlan?.maxServices}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Daily Queue Limit</span>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{selectedPlan?.maxDailyQueueLimit} tokens</div>
                  </div>
                </div>
              </div>

              {/* Business Profile Details */}
              <div style={{ background: '#ffffff', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: 22 }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 14 }}>Business & Location Summary</h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, fontSize: '0.88rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}>Business Name</span>
                    <div style={{ fontWeight: 700 }}>{formData.businessName}</div>
                  </div>

                  <div>
                    <span style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}>Category</span>
                    <div style={{ fontWeight: 700 }}>{formData.category}</div>
                  </div>

                  <div>
                    <span style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}>Primary Branch</span>
                    <div style={{ fontWeight: 600 }}>{formData.branchName} ({formData.city})</div>
                  </div>

                  <div>
                    <span style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}>Address</span>
                    <div style={{ fontWeight: 600 }}>{formData.address || 'Central Headquarters'}</div>
                  </div>

                  <div>
                    <span style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}>Account Owner</span>
                    <div style={{ fontWeight: 600 }}>{user ? user.fullName : formData.fullName}</div>
                  </div>

                  <div>
                    <span style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}>Contact Email</span>
                    <div style={{ fontWeight: 600 }}>{user ? user.email : formData.email}</div>
                  </div>
                </div>
              </div>

              {/* Billing Info Notice */}
              <div style={{ 
                background: '#f0fdf4', 
                border: '1px solid #bbf7d0', 
                borderRadius: 12, 
                padding: '14px 18px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: 12,
                fontSize: '0.85rem',
                color: '#15803d'
              }}>
                <Zap size={20} />
                <span>
                  {selectedPlan?.priceMonthly > 0 
                    ? `Instant activation! 30 days active billing begins today at ₹${selectedPlan?.priceMonthly}/month. Cancel or upgrade anytime.` 
                    : '14 days full trial activated immediately with no credit card required.'}
                </span>
              </div>

              {/* Launch & Back Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
                <button 
                  type="button" 
                  onClick={() => setStep(2)} 
                  className="btn-secondary"
                  disabled={submitting}
                >
                  <ArrowLeft size={16} /> Edit Details
                </button>
                <button 
                  type="button" 
                  onClick={handleFinalSubmit}
                  className="btn-primary"
                  disabled={submitting}
                  style={{ padding: '14px 32px', fontSize: '1rem', fontWeight: 700 }}
                >
                  {submitting ? 'Setting up Desk...' : 'Confirm & Launch Live Desk'} <ArrowRight size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
