import React from 'react';
import { Lock, CreditCard, ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function SubscriptionRequiredCard({ onGoToSubscription, featureName = 'Business Actions' }) {
  return (
    <div className="page-container" style={{ maxWidth: 800, marginTop: 40, marginBottom: 60 }}>
      <div 
        className="shining-card" 
        style={{
          background: 'linear-gradient(180deg, #ffffff 0%, #fff7ed 100%)',
          border: '2px solid rgba(249, 115, 22, 0.4)',
          borderRadius: 24,
          padding: '48px 36px',
          textAlign: 'center',
          boxShadow: '0 20px 45px -10px rgba(249, 115, 22, 0.2)'
        }}
      >
        <div 
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            boxShadow: '0 8px 24px rgba(239, 68, 68, 0.35)'
          }}
        >
          <Lock size={36} color="#ffffff" />
        </div>

        <span 
          style={{
            background: 'rgba(239, 68, 68, 0.12)',
            color: '#dc2626',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            padding: '4px 14px',
            borderRadius: 20,
            fontSize: '0.78rem',
            fontWeight: 800,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            display: 'inline-block',
            marginBottom: 16
          }}
        >
          Plan Over &bull; Access Locked
        </span>

        <h2 style={{ fontSize: '1.9rem', fontWeight: 850, color: '#0f172a', marginBottom: 14 }}>
          Subscription Plan Required
        </h2>

        <p style={{ fontSize: '1rem', color: '#64748b', maxWidth: 540, margin: '0 auto 28px', lineHeight: 1.6 }}>
          Your business subscription plan has expired. To access <strong>{featureName}</strong>, manage live customer queues, open counters, and view analytics, you must take a subscription again.
        </p>

        <div 
          style={{
            background: 'rgba(255, 255, 255, 0.85)',
            border: '1px solid rgba(226, 232, 240, 0.9)',
            borderRadius: 16,
            padding: '20px 24px',
            maxWidth: 520,
            margin: '0 auto 32px',
            textAlign: 'left'
          }}
        >
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShieldAlert size={16} color="#f97316" /> What happens once you renew?
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.82rem', color: '#64748b' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={15} color="#10b981" />
              <span>Full immediate access restored to Queue Desk &amp; Token Calling</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={15} color="#10b981" />
              <span>Multi-counter management, branch services &amp; hours configuration</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={15} color="#10b981" />
              <span>Real-time platform throughput analytics &amp; audit tracking</span>
            </div>
          </div>
        </div>

        <button
          onClick={onGoToSubscription}
          className="btn-primary"
          style={{
            padding: '14px 32px',
            fontSize: '1rem',
            fontWeight: 700,
            borderRadius: 30,
            background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
            boxShadow: '0 8px 24px rgba(239, 68, 68, 0.35)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            cursor: 'pointer'
          }}
        >
          <CreditCard size={18} />
          <span>Take a Subscription to Continue</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
