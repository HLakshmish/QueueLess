import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Check, ShieldCheck, Zap } from 'lucide-react';

export default function SubscriptionBilling() {
  const { activeBusiness } = useAuth();
  const [plans, setPlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    loadPlans();
  }, [activeBusiness]);

  async function loadPlans() {
    try {
      const res = await api.getPlans();
      if (res.success) {
        setPlans(res.data);
      }
      if (activeBusiness?.id) {
        const bRes = await api.getBusinessById(activeBusiness.id);
        if (bRes.success && bRes.data.subscription) {
          setCurrentPlan(bRes.data.subscription.plan);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleSelectPlan = async (plan) => {
    if (!activeBusiness) return;
    setSubscribing(true);
    try {
      const res = await api.subscribeBusiness({
        businessId: activeBusiness.id,
        planId: plan.id,
      });
      if (res.success) {
        alert(`Successfully upgraded to the ${plan.name} Plan!`);
        setCurrentPlan(plan);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setSubscribing(false);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading plans...</div>;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1 style={{ fontSize: '2.4rem', marginBottom: 12 }}>
          Subscription & <span style={{ background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>SaaS Plans</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', maxWidth: 600, margin: '0 auto' }}>
          Select the optimal plan to scale your physical queues, multi-branch coverage, and live analytics.
        </p>
      </div>

      <div className="grid-cols-4">
        {plans.map((p) => {
          const isCurrent = currentPlan?.id === p.id;
          return (
            <div 
              key={p.id} 
              className={isCurrent ? "glass-panel-glow" : "glass-panel"} 
              style={{ 
                padding: 28, 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'space-between',
                position: 'relative'
              }}
            >
              {isCurrent && (
                <div style={{
                  position: 'absolute',
                  top: -12,
                  right: 20,
                  background: 'var(--accent-primary)',
                  color: '#fff',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  padding: '4px 10px',
                  borderRadius: 20,
                  textTransform: 'uppercase'
                }}>
                  Active Plan
                </div>
              )}

              <div>
                <h3 style={{ fontSize: '1.4rem', marginBottom: 6 }}>{p.name}</h3>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, margin: '16px 0 20px' }}>
                  <span style={{ fontSize: '2.2rem', fontWeight: 800 }}>₹{p.priceMonthly}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>/ month</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
                    <Check size={16} color="#10b981" />
                    <span>Up to {p.maxBranches} Branches</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
                    <Check size={16} color="#10b981" />
                    <span>Up to {p.maxServices} Active Services</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
                    <Check size={16} color="#10b981" />
                    <span>{p.maxDailyQueueLimit} Daily Queue Limit</span>
                  </div>
                  {p.features?.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
                      <Check size={16} color="#10b981" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button 
                onClick={() => handleSelectPlan(p)} 
                disabled={isCurrent || subscribing}
                className={isCurrent ? "btn-secondary" : "btn-primary"}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {isCurrent ? 'Current Plan' : `Upgrade to ${p.name}`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
