import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Check, ShieldCheck, Zap } from 'lucide-react';

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function SubscriptionBilling() {
  const { user, activeBusiness } = useAuth();
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
      const isPaid = Number(plan.priceMonthly) > 0;

      if (!isPaid) {
        // Free / Trial plan upgrade
        const res = await api.subscribeBusiness({
          businessId: activeBusiness.id,
          planId: plan.id,
        });
        if (res.success) {
          alert(`Successfully switched to the ${plan.name} Plan!`);
          setCurrentPlan(plan);
        }
        setSubscribing(false);
        return;
      }

      // Paid Plan via Razorpay
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Unable to load Razorpay payment SDK. Please check your internet connection.');
      }

      const orderRes = await api.createRazorpayOrder({
        planId: plan.id,
        businessId: activeBusiness.id,
        notes: {
          businessName: activeBusiness.name,
          planName: plan.name,
        },
      });

      if (!orderRes.success || !orderRes.order) {
        throw new Error(orderRes.error || 'Failed to create Razorpay payment order.');
      }

      const options = {
        key: orderRes.keyId || 'rzp_test_TqueU0bD2Nnjpq',
        amount: orderRes.order.amount,
        currency: orderRes.order.currency || 'INR',
        name: 'QueueLess Subscriptions',
        description: `Upgrade to ${plan.name} Plan - ${activeBusiness.name}`,
        order_id: orderRes.order.id,
        prefill: {
          name: user?.fullName || '',
          email: user?.email || '',
          contact: user?.phone || '',
        },
        theme: {
          color: '#4f46e5',
        },
        modal: {
          ondismiss: () => {
            setSubmitting(false);
          },
        },
        handler: async function (response) {
          try {
            // Verify payment and upgrade subscription on backend
            const verifyRes = await api.verifyRazorpayPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              businessId: activeBusiness.id,
              planId: plan.id,
            });

            if (verifyRes.success) {
              alert(`Payment successful! Your business is now on the ${plan.name} Plan.`);
              setCurrentPlan(plan);
            } else {
              alert(verifyRes.error || 'Payment verification failed.');
            }
          } catch (vErr) {
            alert(vErr.message || 'Error completing subscription verification.');
          } finally {
            setSubscribing(false);
          }
        },
      };

      const rzpInstance = new window.Razorpay(options);
      rzpInstance.on('payment.failed', function (resp) {
        setSubscribing(false);
        alert(resp.error?.description || 'Payment was cancelled or failed.');
      });
      rzpInstance.open();
    } catch (err) {
      alert(err.message || 'Failed to initiate plan upgrade.');
      setSubscribing(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container" style={{ maxWidth: 1200 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div className="skeleton skeleton-line medium" style={{ margin: '0 auto 12px', height: 32 }} />
          <div className="skeleton skeleton-line long" style={{ margin: '0 auto', height: 16 }} />
        </div>
        <div className="grid-cols-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton skeleton-card" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: 1200 }}>
      <div className="page-header" style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1 style={{ fontSize: '2.4rem', marginBottom: 12 }}>
          Subscription &amp; <span style={{ background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>SaaS Plans</span>
        </h1>
        <p style={{ maxWidth: 600, margin: '0 auto' }}>
          Select the optimal plan to scale your physical queues, multi-branch coverage, and live analytics.
        </p>
      </div>

      <div className="grid-cols-4">
        {plans.map((p) => {
          const isCurrent = currentPlan?.id === p.id;
          const isPro = p.name?.toLowerCase().includes('pro');
          return (
            <div 
              key={p.id} 
              className={isCurrent ? "shining-card glass-panel-glow" : "shining-card"} 
              style={{ 
                padding: 28, 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'space-between',
                position: 'relative',
                background: '#ffffff'
              }}
            >
              <div>
                {(isCurrent || isPro) && (
                  <div style={{ marginBottom: 10 }}>
                    {isCurrent ? (
                      <span style={{
                        background: 'var(--accent-primary)',
                        color: '#ffffff',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        padding: '4px 12px',
                        borderRadius: 20,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        boxShadow: '0 2px 8px rgba(99, 102, 241, 0.25)',
                        display: 'inline-block',
                        lineHeight: 1.2
                      }}>
                        Active Plan
                      </span>
                    ) : (
                      <span style={{
                        background: 'var(--accent-gradient)',
                        color: '#ffffff',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        padding: '4px 12px',
                        borderRadius: 20,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        boxShadow: '0 2px 8px rgba(99, 102, 241, 0.2)',
                        display: 'inline-block',
                        lineHeight: 1.2
                      }}>
                        Most Popular
                      </span>
                    )}
                  </div>
                )}

                <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 6 }}>{p.name}</h3>
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
