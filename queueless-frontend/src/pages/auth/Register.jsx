import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Clock } from 'lucide-react';

export default function Register({ onLoginClick, onRegisterSuccess }) {
  const { register, refreshUser } = useAuth();
  const [role, setRole] = useState('CUSTOMER'); // CUSTOMER or BUSINESS_USER
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      const user = await register({
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
    <div style={{ maxWidth: 480, margin: '40px auto', padding: '0 20px' }}>
      <div className="glass-panel-glow" style={{ padding: 36 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: '1.8rem' }}>Create QueueLess Account</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
            Select your account type to get started
          </p>
        </div>

        {/* Role Toggle Selector */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
          background: '#f1f5f9',
          padding: 4,
          borderRadius: 12,
          marginBottom: 24
        }}>
          <button
            type="button"
            onClick={() => setRole('CUSTOMER')}
            style={{
              padding: '10px 0',
              borderRadius: 8,
              fontSize: '0.88rem',
              fontWeight: 600,
              background: role === 'CUSTOMER' ? 'var(--accent-primary)' : 'transparent',
              color: role === 'CUSTOMER' ? '#fff' : 'var(--text-muted)',
            }}
          >
            Customer
          </button>
          <button
            type="button"
            onClick={() => setRole('BUSINESS_USER')}
            style={{
              padding: '10px 0',
              borderRadius: 8,
              fontSize: '0.88rem',
              fontWeight: 600,
              background: role === 'BUSINESS_USER' ? 'var(--accent-primary)' : 'transparent',
              color: role === 'BUSINESS_USER' ? '#fff' : 'var(--text-muted)',
            }}
          >
            Business / Clinic
          </button>
        </div>

        {error && (
          <div style={{ background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#fb7185', padding: 12, borderRadius: 8, fontSize: '0.85rem', marginBottom: 20 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Your Full Name *
            </label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. Dr. Ramesh Gupta" 
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Email Address *
            </label>
            <input 
              type="email" 
              className="form-input" 
              placeholder="name@example.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Phone Number
            </label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="+91 9876543210" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          {role === 'BUSINESS_USER' && (
            <>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Business Name *
                </label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Sunshine Polyclinic" 
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Business Category
                </label>
                <select 
                  className="form-input" 
                  value={businessCategory}
                  onChange={(e) => setBusinessCategory(e.target.value)}
                >
                  <option value="Healthcare & Clinic">Healthcare & Clinic</option>
                  <option value="Salon & Spa">Salon & Spa</option>
                  <option value="Restaurant & Food">Restaurant & Food</option>
                  <option value="Automotive & Service">Automotive & Service</option>
                  <option value="Banking & Financial">Banking & Financial</option>
                  <option value="Government & Academic">Government & Academic</option>
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Subscription Tier
                </label>
                <select 
                  className="form-input" 
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                >
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.priceMonthly > 0 ? `₹${p.priceMonthly}/mo` : 'Free / Trial'}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Password *
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
            {loading ? 'Creating Account...' : 'Complete Registration'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <span onClick={onLoginClick} style={{ color: '#818cf8', fontWeight: 600, cursor: 'pointer' }}>
            Sign In
          </span>
        </div>
      </div>
    </div>
  );
}
