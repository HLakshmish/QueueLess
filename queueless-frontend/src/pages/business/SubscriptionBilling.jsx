import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Check, ShieldCheck, Zap, AlertTriangle, CheckCircle2, Lock, ArrowRight, RefreshCw } from 'lucide-react';

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

export default function SubscriptionBilling({ onPlanActivated }) {
  const { user, activeBusiness, refreshUser, isSubscriptionActive } = useAuth();
  const [plans, setPlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState('');

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
          setSubscriptionData(bRes.data.subscription);
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
    setActionSuccessMessage('');

    try {
      const isPaid = Number(plan.priceMonthly) > 0;

      if (!isPaid) {
        // Free / Trial plan upgrade or renewal
        const res = await api.subscribeBusiness({
          businessId: activeBusiness.id,
          planId: plan.id,
        });
        if (res.success) {
          await refreshUser();
          await loadPlans();
          setActionSuccessMessage(`Successfully subscribed to ${plan.name} Plan! All business actions are now unlocked.`);
          if (onPlanActivated) {
            setTimeout(() => onPlanActivated(), 1800);
          }
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
        description: `Subscription to ${plan.name} Plan - ${activeBusiness.name}`,
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
            setSubscribing(false);
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
              await refreshUser();
              await loadPlans();
              setActionSuccessMessage(`Payment successful! Your business is now on the ${plan.name} Plan. Business desk unlocked!`);
              if (onPlanActivated) {
                setTimeout(() => onPlanActivated(), 1800);
              }
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

  const isExpired = !isSubscriptionActive;
  const endDateStr = subscriptionData?.endDate ? new Date(subscriptionData.endDate).toLocaleDateString() : 'N/A';

  return (
    <div className="page-container" style={{ maxWidth: 1200 }}>
      {/* Top Status Banner */}
      {isExpired ? (
        <div
          style={{
            background: 'linear-gradient(135deg, #fef2f2 0%, #fff7ed 100%)',
            border: '2px solid #f87171',
            borderRadius: 18,
            padding: '24px 28px',
            marginBottom: 32,
            boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 20
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 50,
              height: 50,
              borderRadius: 14,
              background: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)',
              flexShrink: 0
            }}>
              <Lock size={26} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <span style={{ fontSize: '1.18rem', fontWeight: 800, color: '#991b1b' }}>
                  Subscription Plan Over &bull; Renewal Required
                </span>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  background: '#ef4444',
                  color: '#ffffff',
                  padding: '2px 8px',
                  borderRadius: 12,
                  textTransform: 'uppercase'
                }}>
                  Actions Locked
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.88rem', color: '#7f1d1d' }}>
                Your business subscription has expired (ended on {endDateStr}). <strong>You must take a subscription again below</strong>. Once subscribed, you will immediately be able to move to actions inside the business portal (Queue Desk, Services, Counters &amp; Analytics).
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            background: 'linear-gradient(135deg, #f0fdf4 0%, #f0fdfa 100%)',
            border: '1px solid #86efac',
            borderRadius: 18,
            padding: '18px 24px',
            marginBottom: 32,
            display: 'flex',
            alignItems: 'center',
            gap: 16
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <CheckCircle2 size={24} color="#16a34a" />
            <div>
              <div style={{ fontWeight: 800, color: '#166534', fontSize: '0.98rem' }}>
                Subscription is Active &bull; {currentPlan?.name || 'Standard'} Plan
              </div>
              <div style={{ fontSize: '0.82rem', color: '#15803d' }}>
                Valid through {endDateStr}. All business actions and queue operations are currently unlocked.
              </div>
            </div>
          </div>
        </div>
      )}

      {actionSuccessMessage && (
        <div
          style={{
            background: '#ecfdf5',
            border: '1px solid #34d399',
            borderRadius: 14,
            padding: '16px 20px',
            marginBottom: 28,
            color: '#065f46',
            fontWeight: 700,
            fontSize: '0.92rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CheckCircle2 size={20} color="#059669" />
            <span>{actionSuccessMessage}</span>
          </div>
          {onPlanActivated && (
            <button
              onClick={onPlanActivated}
              className="btn-primary"
              style={{ padding: '6px 16px', fontSize: '0.82rem', borderRadius: 20 }}
            >
              Proceed to Queue Desk &rarr;
            </button>
          )}
        </div>
      )}

      <div className="page-header" style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1 style={{ fontSize: '2.4rem', marginBottom: 12 }}>
          Subscription &amp; <span style={{ background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>SaaS Plans</span>
        </h1>
        <p style={{ maxWidth: 650, margin: '0 auto', color: 'var(--text-muted)' }}>
          Select or renew a plan to enable physical queue ticketing, multi-branch desks, counter services, and live customer throughput.
        </p>
      </div>

      <div className="grid-cols-4">
        {plans.map((p) => {
          const isCurrent = currentPlan?.id === p.id;
          const isPro = p.name?.toLowerCase().includes('pro');
          // If expired, the current plan can be renewed!
          const canRenewCurrent = isCurrent && isExpired;
          const isButtonDisabled = (isCurrent && !isExpired) || subscribing;

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
                background: '#ffffff',
                border: canRenewCurrent ? '2px solid #f87171' : isCurrent ? '2px solid var(--accent-primary)' : '1px solid var(--border-light)'
              }}
            >
              <div>
                {(isCurrent || isPro) && (
                  <div style={{ marginBottom: 10 }}>
                    {isCurrent ? (
                      isExpired ? (
                        <span style={{
                          background: '#ef4444',
                          color: '#ffffff',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          padding: '4px 12px',
                          borderRadius: 20,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          boxShadow: '0 2px 8px rgba(239, 68, 68, 0.35)',
                          display: 'inline-block',
                          lineHeight: 1.2
                        }}>
                          Plan Expired
                        </span>
                      ) : (
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
                      )
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
                disabled={isButtonDisabled}
                className={canRenewCurrent ? "btn-primary" : isCurrent && !isExpired ? "btn-secondary" : "btn-primary"}
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  background: canRenewCurrent ? 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)' : undefined,
                  boxShadow: canRenewCurrent ? '0 4px 14px rgba(239, 68, 68, 0.35)' : undefined
                }}
              >
                {canRenewCurrent ? (
                  `Renew ${p.name} Plan`
                ) : isCurrent && !isExpired ? (
                  'Current Active Plan'
                ) : (
                  `Subscribe to ${p.name}`
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
