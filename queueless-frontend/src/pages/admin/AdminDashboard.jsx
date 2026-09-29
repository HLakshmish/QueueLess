import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { 
  ShieldCheck, 
  Building, 
  Users, 
  Layers, 
  CheckCircle, 
  AlertTriangle, 
  History,
  Activity,
  CreditCard,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Search,
  Check,
  X,
  RefreshCw,
  Mail,
  Phone,
  Clock,
  Sparkles,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

const COMMON_FEATURES = [
  'Live Queue Tracking',
  'SMS Notifications',
  'Email Notifications',
  'FCM Push Notifications',
  'Multi-Branch Support',
  'Custom Branding',
  'Standard Analytics',
  'Advanced Analytics',
  'Priority Support',
  'Dedicated SLA',
  '24/7 Phone Support',
  'API Access'
];

export default function AdminDashboard() {
  const [tab, setTab] = useState('subscriptions');
  const [stats, setStats] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [plans, setPlans] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state for subscriptions
  const [subSearch, setSubSearch] = useState('');
  const [subStatusFilter, setSubStatusFilter] = useState('ALL');
  const [subPlanFilter, setSubPlanFilter] = useState('ALL');

  // Plan Modal state (Create / Edit)
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [planForm, setPlanForm] = useState({
    name: '',
    priceMonthly: 0,
    maxBranches: 1,
    maxServices: 3,
    maxDailyQueueLimit: 50,
    features: [],
    isActive: true
  });
  const [customFeatureInput, setCustomFeatureInput] = useState('');
  const [savingPlan, setSavingPlan] = useState(false);

  // Manage Subscription Modal state
  const [manageSubModalOpen, setManageSubModalOpen] = useState(false);
  const [selectedSub, setSelectedSub] = useState(null);
  const [manageForm, setManageForm] = useState({
    planId: '',
    status: 'ACTIVE',
    extendDays: null,
    endDate: ''
  });
  const [savingSub, setSavingSub] = useState(false);

  // Assign New Subscription Modal state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({
    businessId: '',
    planId: '',
    status: 'ACTIVE',
    durationDays: 30
  });
  const [assigningSub, setAssigningSub] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [statsRes, bizRes, usersRes, logsRes, plansRes, subsRes] = await Promise.all([
        api.getPlatformAnalytics().catch(() => ({ success: false })),
        api.getAdminBusinesses().catch(() => ({ success: false, data: [] })),
        api.getAdminUsers().catch(() => ({ success: false, data: [] })),
        api.getAdminAuditLogs().catch(() => ({ success: false, data: [] })),
        api.getAdminPlans().catch(() => ({ success: false, data: [] })),
        api.getAdminSubscriptions().catch(() => ({ success: false, data: [] })),
      ]);

      if (statsRes.success) setStats(statsRes.data);
      if (bizRes.success) setBusinesses(bizRes.data || []);
      if (usersRes.success) setUsers(usersRes.data || []);
      if (logsRes.success) setAuditLogs(logsRes.data || []);
      if (plansRes.success) setPlans(plansRes.data || []);
      if (subsRes.success) setSubscriptions(subsRes.data || []);
    } catch (err) {
      console.error('Error loading admin dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }

  // --- PLAN ACTIONS ---
  const handleOpenCreatePlan = () => {
    setEditingPlan(null);
    setPlanForm({
      name: '',
      priceMonthly: 999,
      maxBranches: 1,
      maxServices: 5,
      maxDailyQueueLimit: 100,
      features: ['Live Queue Tracking', 'SMS Notifications', 'Standard Analytics'],
      isActive: true
    });
    setCustomFeatureInput('');
    setPlanModalOpen(true);
  };

  const handleOpenEditPlan = (p) => {
    setEditingPlan(p);
    setPlanForm({
      name: p.name || '',
      priceMonthly: p.priceMonthly || 0,
      maxBranches: p.maxBranches || 1,
      maxServices: p.maxServices || 1,
      maxDailyQueueLimit: p.maxDailyQueueLimit || 50,
      features: p.features || [],
      isActive: p.isActive ?? true
    });
    setCustomFeatureInput('');
    setPlanModalOpen(true);
  };

  const handleTogglePlanFeature = (feat) => {
    setPlanForm(prev => {
      const exists = prev.features.includes(feat);
      return {
        ...prev,
        features: exists ? prev.features.filter(f => f !== feat) : [...prev.features, feat]
      };
    });
  };

  const handleAddCustomFeature = (e) => {
    e.preventDefault();
    if (!customFeatureInput.trim()) return;
    if (!planForm.features.includes(customFeatureInput.trim())) {
      setPlanForm(prev => ({ ...prev, features: [...prev.features, customFeatureInput.trim()] }));
    }
    setCustomFeatureInput('');
  };

  const handleRemoveFeature = (feat) => {
    setPlanForm(prev => ({
      ...prev,
      features: prev.features.filter(f => f !== feat)
    }));
  };

  const handleSavePlan = async (e) => {
    e.preventDefault();
    if (!planForm.name.trim()) {
      alert('Plan name is required');
      return;
    }

    setSavingPlan(true);
    try {
      if (editingPlan) {
        const res = await api.updateAdminPlan(editingPlan.id, planForm);
        if (res.success) {
          setPlans(prev => prev.map(p => p.id === editingPlan.id ? res.data : p));
          setPlanModalOpen(false);
        }
      } else {
        const res = await api.createAdminPlan(planForm);
        if (res.success) {
          setPlans(prev => [...prev, res.data]);
          setPlanModalOpen(false);
        }
      }
    } catch (err) {
      alert(err.message || 'Failed to save plan');
    } finally {
      setSavingPlan(false);
    }
  };

  const handleDeletePlan = async (plan) => {
    const confirmMsg = plan._count?.subscriptions > 0
      ? `Plan "${plan.name}" currently has ${plan._count.subscriptions} active subscription(s). It will be deactivated instead of deleted. Continue?`
      : `Are you sure you want to permanently delete plan "${plan.name}"?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await api.deleteAdminPlan(plan.id);
      if (res.success) {
        if (res.deactivated) {
          setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, isActive: false } : p));
          alert(res.message);
        } else {
          setPlans(prev => prev.filter(p => p.id !== plan.id));
        }
      }
    } catch (err) {
      alert(err.message || 'Failed to delete plan');
    }
  };

  const handleTogglePlanActive = async (plan) => {
    try {
      const res = await api.updateAdminPlan(plan.id, { isActive: !plan.isActive });
      if (res.success) {
        setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, isActive: res.data.isActive } : p));
      }
    } catch (err) {
      alert(err.message || 'Failed to update plan status');
    }
  };

  // --- SUBSCRIPTION ACTIONS ---
  const handleOpenManageSub = (sub) => {
    setSelectedSub(sub);
    const endStr = sub.endDate ? new Date(sub.endDate).toISOString().split('T')[0] : '';
    setManageForm({
      planId: sub.planId,
      status: sub.status,
      extendDays: null,
      endDate: endStr
    });
    setManageSubModalOpen(true);
  };

  const handleSaveManageSub = async (e) => {
    e.preventDefault();
    if (!selectedSub) return;

    setSavingSub(true);
    try {
      const payload = {
        planId: manageForm.planId,
        status: manageForm.status,
      };

      if (manageForm.extendDays) {
        payload.extendDays = Number(manageForm.extendDays);
      } else if (manageForm.endDate) {
        payload.endDate = new Date(manageForm.endDate).toISOString();
      }

      const res = await api.updateAdminSubscription(selectedSub.id, payload);
      if (res.success) {
        setSubscriptions(prev => prev.map(s => s.id === selectedSub.id ? res.data : s));
        setManageSubModalOpen(false);
      }
    } catch (err) {
      alert(err.message || 'Failed to update subscription');
    } finally {
      setSavingSub(false);
    }
  };

  const handleQuickUpdateSubStatus = async (sub, newStatus) => {
    try {
      const res = await api.updateAdminSubscription(sub.id, { status: newStatus });
      if (res.success) {
        setSubscriptions(prev => prev.map(s => s.id === sub.id ? { ...s, status: newStatus } : s));
      }
    } catch (err) {
      alert(err.message || 'Failed to update status');
    }
  };

  const handleQuickExtendDays = async (sub, days) => {
    try {
      const res = await api.updateAdminSubscription(sub.id, { extendDays: days });
      if (res.success) {
        setSubscriptions(prev => prev.map(s => s.id === sub.id ? res.data : s));
        alert(`Extended subscription for "${sub.business.name}" by ${days} days!`);
      }
    } catch (err) {
      alert(err.message || 'Failed to extend subscription');
    }
  };

  const handleOpenAssignModal = () => {
    setAssignForm({
      businessId: businesses[0]?.id || '',
      planId: plans[0]?.id || '',
      status: 'ACTIVE',
      durationDays: 30
    });
    setAssignModalOpen(true);
  };

  const handleSaveAssignSub = async (e) => {
    e.preventDefault();
    if (!assignForm.businessId || !assignForm.planId) {
      alert('Please select both a business and a subscription plan.');
      return;
    }

    setAssigningSub(true);
    try {
      const res = await api.assignAdminSubscription(assignForm);
      if (res.success) {
        // Refresh subscriptions and businesses list
        const updatedSubs = await api.getAdminSubscriptions();
        if (updatedSubs.success) setSubscriptions(updatedSubs.data);
        setAssignModalOpen(false);
        alert('Subscription assigned successfully!');
      }
    } catch (err) {
      alert(err.message || 'Failed to assign subscription');
    } finally {
      setAssigningSub(false);
    }
  };

  const handleUpdateBusinessStatus = async (bizId, newStatus) => {
    try {
      const res = await api.updateBusinessStatus(bizId, newStatus);
      if (res.success) {
        setBusinesses(prev => prev.map(b => b.id === bizId ? { ...b, status: newStatus } : b));
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Filter subscriptions
  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = 
      !subSearch ||
      sub.business?.name?.toLowerCase().includes(subSearch.toLowerCase()) ||
      sub.business?.category?.toLowerCase().includes(subSearch.toLowerCase()) ||
      sub.business?.members?.some(m => 
        m.user?.fullName?.toLowerCase().includes(subSearch.toLowerCase()) ||
        m.user?.email?.toLowerCase().includes(subSearch.toLowerCase()) ||
        m.user?.phone?.includes(subSearch)
      );

    const matchesStatus = subStatusFilter === 'ALL' || sub.status === subStatusFilter;
    const matchesPlan = subPlanFilter === 'ALL' || sub.planId === subPlanFilter;

    return matchesSearch && matchesStatus && matchesPlan;
  });

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'ACTIVE': return 'badge-serving';
      case 'TRIAL': return 'badge-checked-in';
      case 'PAST_DUE': return 'badge-waiting';
      case 'SUSPENDED': return 'badge-danger';
      case 'EXPIRED': return 'badge-served';
      case 'CANCELLED': return 'badge-served';
      default: return 'badge-waiting';
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', color: 'var(--text-muted)' }}>
        <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 16px', display: 'block', color: 'var(--accent-primary)' }} />
        <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Loading Administrator Dashboard...</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: 4 }}>Syncing businesses, users, subscription plans, and audit logs...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1320, margin: '0 auto', padding: '32px 20px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#4f46e5', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <ShieldCheck size={18} /> Platform Administration & Operations
          </div>
          <h1 style={{ fontSize: '2.2rem', marginTop: 4, letterSpacing: '-0.02em' }}>QueueLess Command Center</h1>
        </div>

        {/* Tab Controls */}
        <div style={{ 
          display: 'flex', 
          gap: 6, 
          background: '#ffffff', 
          padding: 6, 
          borderRadius: 12, 
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          flexWrap: 'wrap'
        }}>
          <button 
            onClick={() => setTab('subscriptions')} 
            className={tab === 'subscriptions' ? 'btn-primary' : 'btn-secondary'} 
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
          >
            <CreditCard size={15} /> Subscribed Businesses ({subscriptions.length})
          </button>
          <button 
            onClick={() => setTab('plans')} 
            className={tab === 'plans' ? 'btn-primary' : 'btn-secondary'} 
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
          >
            <Layers size={15} /> Subscription Plans ({plans.length})
          </button>
          <button 
            onClick={() => setTab('businesses')} 
            className={tab === 'businesses' ? 'btn-primary' : 'btn-secondary'} 
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
          >
            <Building size={15} /> Businesses ({businesses.length})
          </button>
          <button 
            onClick={() => setTab('users')} 
            className={tab === 'users' ? 'btn-primary' : 'btn-secondary'} 
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
          >
            <Users size={15} /> Users ({users.length})
          </button>
          <button 
            onClick={() => setTab('logs')} 
            className={tab === 'logs' ? 'btn-primary' : 'btn-secondary'} 
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
          >
            <History size={15} /> Audit Trail ({auditLogs.length})
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid-cols-4" style={{ marginBottom: 32 }}>
        <div className="glass-panel" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Subscribed Businesses</span>
            <div style={{ background: '#ede9fe', padding: 6, borderRadius: 8, color: '#4f46e5' }}><CreditCard size={18} /></div>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 800, marginTop: 6 }}>{subscriptions.filter(s => s.status === 'ACTIVE' || s.status === 'TRIAL').length}</div>
          <div style={{ fontSize: '0.78rem', color: '#10b981', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
            <CheckCircle size={14} /> Active & Trial Subscriptions
          </div>
        </div>

        <div className="glass-panel" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Active SaaS Plans</span>
            <div style={{ background: '#e0e7ff', padding: 6, borderRadius: 8, color: '#4338ca' }}><Layers size={18} /></div>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 800, marginTop: 6 }}>{plans.filter(p => p.isActive).length} / {plans.length}</div>
          <div style={{ fontSize: '0.78rem', color: '#4f46e5', marginTop: 4 }}>Available for onboarding</div>
        </div>

        <div className="glass-panel" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Registered Businesses</span>
            <div style={{ background: '#ecfdf5', padding: 6, borderRadius: 8, color: '#059669' }}><Building size={18} /></div>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 800, marginTop: 6 }}>{businesses.length}</div>
          <div style={{ fontSize: '0.78rem', color: '#059669', marginTop: 4 }}>{businesses.filter(b => b.status === 'ACTIVE').length} approved & operational</div>
        </div>

        <div className="glass-panel" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Queue Volume</span>
            <div style={{ background: '#fef3c7', padding: 6, borderRadius: 8, color: '#d97706' }}><Activity size={18} /></div>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 800, marginTop: 6 }}>{stats?.totalEntries || 0}</div>
          <div style={{ fontSize: '0.78rem', color: '#d97706', marginTop: 4 }}>{stats?.totalServed || 0} tickets served</div>
        </div>
      </div>

      {/* --- TAB 1: SUBSCRIBED BUSINESSES (MANAGE BUSINESS USERS) --- */}
      {tab === 'subscriptions' && (
        <div className="glass-panel" style={{ padding: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Subscribed Business Accounts</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: 2 }}>
                Monitor subscribed business owners, active plans, expiration dates, and tier upgrades.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button 
                onClick={handleOpenAssignModal}
                className="btn-primary" 
                style={{ padding: '9px 16px', fontSize: '0.85rem' }}
              >
                <Plus size={16} /> Assign Subscription
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 260, position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input 
                type="text" 
                placeholder="Search business name, owner name, email, phone..." 
                value={subSearch}
                onChange={(e) => setSubSearch(e.target.value)}
                className="form-input" 
                style={{ paddingLeft: 38, fontSize: '0.9rem' }}
              />
            </div>

            <select 
              value={subStatusFilter} 
              onChange={(e) => setSubStatusFilter(e.target.value)}
              className="form-input" 
              style={{ width: 'auto', minWidth: 160, fontSize: '0.88rem' }}
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="TRIAL">TRIAL</option>
              <option value="PAST_DUE">PAST DUE</option>
              <option value="SUSPENDED">SUSPENDED</option>
              <option value="EXPIRED">EXPIRED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>

            <select 
              value={subPlanFilter} 
              onChange={(e) => setSubPlanFilter(e.target.value)}
              className="form-input" 
              style={{ width: 'auto', minWidth: 160, fontSize: '0.88rem' }}
            >
              <option value="ALL">All Plans</option>
              {plans.map(p => (
                <option key={p.id} value={p.id}>{p.name} (₹{p.priceMonthly}/mo)</option>
              ))}
            </select>
          </div>

          {/* Subscriptions Table */}
          <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '14px 16px' }}>Business</th>
                  <th style={{ padding: '14px 16px' }}>Business User (Owner)</th>
                  <th style={{ padding: '14px 16px' }}>Plan & Pricing</th>
                  <th style={{ padding: '14px 16px' }}>Status</th>
                  <th style={{ padding: '14px 16px' }}>Validity & Expiry</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubscriptions.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
                      No subscribed businesses found matching the criteria.
                    </td>
                  </tr>
                ) : (
                  filteredSubscriptions.map((sub) => {
                    const owner = sub.business?.members?.find(m => m.isOwner)?.user;
                    const endDate = sub.endDate ? new Date(sub.endDate) : null;
                    const isExpired = endDate && endDate < new Date();
                    const daysRemaining = endDate ? Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24)) : null;

                    return (
                      <tr key={sub.id} style={{ borderBottom: '1px solid var(--border-subtle)', background: '#ffffff' }}>
                        {/* Business Name */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{sub.business?.name}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: 2 }}>
                            {sub.business?.category} • {sub.business?._count?.branches || 1} branch(es)
                          </div>
                        </td>

                        {/* Owner / Business User */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 600 }}>{owner?.fullName || 'Business Administrator'}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                            <Mail size={12} /> {owner?.email || 'N/A'}
                          </div>
                          {owner?.phone && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                              <Phone size={12} /> {owner?.phone}
                            </div>
                          )}
                        </td>

                        {/* Plan */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 700, color: '#4f46e5' }}>{sub.plan?.name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {sub.plan?.priceMonthly > 0 ? `₹${sub.plan?.priceMonthly} / mo` : 'Free Tier'}
                          </div>
                        </td>

                        {/* Status */}
                        <td style={{ padding: '14px 16px' }}>
                          <span className={`badge ${getStatusBadgeClass(sub.status)}`}>
                            {sub.status}
                          </span>
                        </td>

                        {/* Validity */}
                        <td style={{ padding: '14px 16px' }}>
                          {endDate ? (
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.82rem', color: isExpired ? '#e11d48' : 'var(--text-main)' }}>
                                {endDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: isExpired ? '#e11d48' : '#059669', marginTop: 2 }}>
                                {isExpired ? 'Expired' : `${daysRemaining} days left`}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-dim)', fontSize: '0.82rem' }}>No expiration</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            <button 
                              onClick={() => handleOpenManageSub(sub)}
                              className="btn-secondary" 
                              style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                              title="Modify plan, status, or dates"
                            >
                              <Edit2 size={13} /> Manage
                            </button>

                            {sub.status === 'SUSPENDED' ? (
                              <button 
                                onClick={() => handleQuickUpdateSubStatus(sub, 'ACTIVE')}
                                className="btn-success" 
                                style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                                title="Reactivate subscription"
                              >
                                Activate
                              </button>
                            ) : sub.status === 'ACTIVE' ? (
                              <button 
                                onClick={() => handleQuickUpdateSubStatus(sub, 'SUSPENDED')}
                                className="btn-danger" 
                                style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                                title="Suspend subscription"
                              >
                                Suspend
                              </button>
                            ) : null}

                            <button 
                              onClick={() => handleQuickExtendDays(sub, 30)}
                              style={{ 
                                background: '#f0fdf4', 
                                border: '1px solid #bbf7d0', 
                                color: '#16a34a', 
                                padding: '5px 10px', 
                                borderRadius: 8, 
                                fontSize: '0.75rem', 
                                fontWeight: 600 
                              }}
                              title="Extend subscription validity by 30 days"
                            >
                              +30 Days
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 2: SUBSCRIPTION PLANS (CREATE & MANAGE PLANS) --- */}
      {tab === 'plans' && (
        <div>
          {/* Header */}
          <div className="glass-panel" style={{ padding: 24, marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Subscription SaaS Plans</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: 2 }}>
                  Create and manage subscription tiers, branch and service limits, daily queue allowances, and pricing.
                </p>
              </div>
              <button 
                onClick={handleOpenCreatePlan}
                className="btn-primary" 
                style={{ padding: '10px 18px', fontSize: '0.9rem' }}
              >
                <Plus size={16} /> Create Subscription Plan
              </button>
            </div>
          </div>

          {/* Plan Cards Grid */}
          <div className="grid-cols-3">
            {plans.map((p) => {
              const subscriberCount = p._count?.subscriptions || 0;
              return (
                <div 
                  key={p.id} 
                  className={p.isActive ? "glass-panel" : "glass-panel"} 
                  style={{ 
                    padding: 24, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'space-between',
                    position: 'relative',
                    opacity: p.isActive ? 1 : 0.7,
                    border: p.isActive ? '1px solid var(--border-subtle)' : '1px dashed #cbd5e1'
                  }}
                >
                  <div>
                    {/* Header: Title, Active Badge */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <h3 style={{ fontSize: '1.35rem', fontWeight: 700 }}>{p.name}</h3>
                      <span className={`badge ${p.isActive ? 'badge-serving' : 'badge-served'}`}>
                        {p.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </div>

                    {/* Price */}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, margin: '14px 0 16px' }}>
                      <span style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--text-main)' }}>₹{p.priceMonthly}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>/ month</span>
                    </div>

                    {/* Subscriber Count Pill */}
                    <div style={{ 
                      background: '#f1f5f9', 
                      borderRadius: 8, 
                      padding: '6px 12px', 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: 6, 
                      fontSize: '0.8rem', 
                      color: 'var(--text-muted)',
                      marginBottom: 18,
                      fontWeight: 600
                    }}>
                      <Users size={14} color="#4f46e5" />
                      <span>{subscriberCount} business user{subscriberCount === 1 ? '' : 's'} subscribed</span>
                    </div>

                    {/* Specifications */}
                    <div style={{ 
                      background: '#fafafa', 
                      border: '1px solid var(--border-subtle)', 
                      borderRadius: 10, 
                      padding: '12px 14px', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: 8,
                      fontSize: '0.85rem',
                      marginBottom: 18
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Max Branches:</span>
                        <span style={{ fontWeight: 700 }}>{p.maxBranches}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Max Services:</span>
                        <span style={{ fontWeight: 700 }}>{p.maxServices}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Daily Queue Limit:</span>
                        <span style={{ fontWeight: 700 }}>{p.maxDailyQueueLimit}</span>
                      </div>
                    </div>

                    {/* Features list */}
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 8 }}>
                        Included Features ({p.features?.length || 0})
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {p.features?.map((feat, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.84rem' }}>
                            <Check size={14} color="#10b981" />
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16, display: 'flex', gap: 8 }}>
                    <button 
                      onClick={() => handleOpenEditPlan(p)}
                      className="btn-secondary" 
                      style={{ flex: 1, justifyContent: 'center', padding: '8px 12px', fontSize: '0.82rem' }}
                    >
                      <Edit2 size={14} /> Edit Plan
                    </button>
                    <button 
                      onClick={() => handleTogglePlanActive(p)}
                      className="btn-secondary" 
                      style={{ padding: '8px 12px', fontSize: '0.82rem' }}
                      title={p.isActive ? "Deactivate plan" : "Activate plan"}
                    >
                      {p.isActive ? <ToggleRight size={16} color="#10b981" /> : <ToggleLeft size={16} color="#64748b" />}
                    </button>
                    <button 
                      onClick={() => handleDeletePlan(p)}
                      className="btn-danger" 
                      style={{ padding: '8px 12px', fontSize: '0.82rem' }}
                      title="Delete or Deactivate Plan"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- TAB 3: REGISTERED BUSINESSES --- */}
      {tab === 'businesses' && (
        <div className="glass-panel" style={{ padding: 24 }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: 16 }}>Registered Businesses & Approvals</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 16px' }}>Business Name</th>
                  <th style={{ padding: '12px 16px' }}>Category</th>
                  <th style={{ padding: '12px 16px' }}>Owner</th>
                  <th style={{ padding: '12px 16px' }}>Subscribed Plan</th>
                  <th style={{ padding: '12px 16px' }}>Approval Status</th>
                  <th style={{ padding: '12px 16px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {businesses.map((biz) => {
                  const owner = biz.members?.find(m => m.isOwner)?.user;
                  return (
                    <tr key={biz.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 600 }}>{biz.name}</td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>{biz.category}</td>
                      <td style={{ padding: '14px 16px' }}>{owner?.fullName || 'N/A'}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span className="badge badge-waiting">{biz.subscription?.plan?.name || 'Trial'}</span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span className={`badge ${biz.status === 'ACTIVE' ? 'badge-serving' : 'badge-waiting'}`}>
                          {biz.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {biz.status !== 'ACTIVE' ? (
                            <button 
                              onClick={() => handleUpdateBusinessStatus(biz.id, 'ACTIVE')} 
                              className="btn-success" 
                              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                            >
                              Approve
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleUpdateBusinessStatus(biz.id, 'SUSPENDED')} 
                              className="btn-danger" 
                              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                            >
                              Suspend
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 4: USERS --- */}
      {tab === 'users' && (
        <div className="glass-panel" style={{ padding: 24 }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: 16 }}>All Platform Users</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 16px' }}>Full Name</th>
                  <th style={{ padding: '12px 16px' }}>Email</th>
                  <th style={{ padding: '12px 16px' }}>Phone</th>
                  <th style={{ padding: '12px 16px' }}>Application Role</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>{u.fullName}</td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>{u.email}</td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-dim)' }}>{u.phone || 'N/A'}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className="badge badge-called">{u.role}</span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className={`badge ${u.isActive ? 'badge-serving' : 'badge-waiting'}`}>
                        {u.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 5: AUDIT LOGS --- */}
      {tab === 'logs' && (
        <div className="glass-panel" style={{ padding: 24 }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: 16 }}>Security & Administration Audit Trail</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {auditLogs.map((log) => (
              <div 
                key={log.id} 
                style={{ 
                  background: '#f8fafc', 
                  border: '1px solid var(--border-subtle)', 
                  borderRadius: 10, 
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.85rem',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                }}
              >
                <div>
                  <span style={{ fontWeight: 700, color: '#4f46e5', marginRight: 10 }}>{log.action}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{log.details}</span>
                </div>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>
                  {new Date(log.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 1: CREATE / EDIT SUBSCRIPTION PLAN
         ======================================================== */}
      {planModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20
        }}>
          <div className="glass-panel" style={{
            maxWidth: 640,
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: 32,
            boxShadow: '0 20px 40px -10px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800 }}>
                  {editingPlan ? `Edit Plan: ${editingPlan.name}` : 'Create New Subscription Plan'}
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  Configure tier limits, monthly pricing, and business features.
                </p>
              </div>
              <button 
                onClick={() => setPlanModalOpen(false)}
                style={{ background: 'transparent', color: 'var(--text-dim)', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSavePlan} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  Plan Name *
                </label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Starter, Growth, Enterprise Plus"
                  value={planForm.name}
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  className="form-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                    Monthly Price (₹ INR) *
                  </label>
                  <input 
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={planForm.priceMonthly}
                    onChange={(e) => setPlanForm({ ...planForm, priceMonthly: parseFloat(e.target.value) || 0 })}
                    className="form-input"
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Set 0 for a free tier</span>
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                    Max Branches Allowed *
                  </label>
                  <input 
                    type="number"
                    min="1"
                    required
                    value={planForm.maxBranches}
                    onChange={(e) => setPlanForm({ ...planForm, maxBranches: parseInt(e.target.value) || 1 })}
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                    Max Services per Branch *
                  </label>
                  <input 
                    type="number"
                    min="1"
                    required
                    value={planForm.maxServices}
                    onChange={(e) => setPlanForm({ ...planForm, maxServices: parseInt(e.target.value) || 1 })}
                    className="form-input"
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                    Daily Queue Entry Capacity *
                  </label>
                  <input 
                    type="number"
                    min="1"
                    required
                    value={planForm.maxDailyQueueLimit}
                    onChange={(e) => setPlanForm({ ...planForm, maxDailyQueueLimit: parseInt(e.target.value) || 50 })}
                    className="form-input"
                  />
                </div>
              </div>

              {/* Feature pills & tags */}
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  Included Features
                </label>

                {/* Common feature quick-toggle pills */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                  {COMMON_FEATURES.map((feat) => {
                    const isSelected = planForm.features.includes(feat);
                    return (
                      <button
                        key={feat}
                        type="button"
                        onClick={() => handleTogglePlanFeature(feat)}
                        style={{
                          background: isSelected ? 'var(--accent-primary)' : '#f1f5f9',
                          color: isSelected ? '#ffffff' : 'var(--text-main)',
                          border: '1px solid ' + (isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)'),
                          borderRadius: 20,
                          padding: '4px 10px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        {isSelected ? <Check size={12} /> : <Plus size={12} />}
                        {feat}
                      </button>
                    );
                  })}
                </div>

                {/* Custom feature input */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <input 
                    type="text" 
                    placeholder="Add custom feature..." 
                    value={customFeatureInput}
                    onChange={(e) => setCustomFeatureInput(e.target.value)}
                    className="form-input"
                    style={{ fontSize: '0.85rem', padding: '8px 12px' }}
                  />
                  <button 
                    type="button" 
                    onClick={handleAddCustomFeature}
                    className="btn-secondary" 
                    style={{ padding: '8px 14px', fontSize: '0.85rem' }}
                  >
                    Add
                  </button>
                </div>

                {/* Currently selected features */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {planForm.features.map((feat) => (
                    <span 
                      key={feat}
                      style={{
                        background: '#e0e7ff',
                        color: '#4338ca',
                        borderRadius: 16,
                        padding: '4px 10px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      {feat}
                      <X size={12} style={{ cursor: 'pointer' }} onClick={() => handleRemoveFeature(feat)} />
                    </span>
                  ))}
                </div>
              </div>

              {/* Active Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                <input 
                  type="checkbox" 
                  id="isActiveToggle" 
                  checked={planForm.isActive}
                  onChange={(e) => setPlanForm({ ...planForm, isActive: e.target.checked })}
                  style={{ width: 18, height: 18, accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                />
                <label htmlFor="isActiveToggle" style={{ fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer' }}>
                  Make this plan active and visible to businesses
                </label>
              </div>

              {/* Form buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                <button 
                  type="button" 
                  onClick={() => setPlanModalOpen(false)}
                  className="btn-secondary"
                  disabled={savingPlan}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={savingPlan}
                >
                  {savingPlan ? 'Saving...' : editingPlan ? 'Update Plan' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: MANAGE SUBSCRIBED BUSINESS USER
         ======================================================== */}
      {manageSubModalOpen && selectedSub && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20
        }}>
          <div className="glass-panel" style={{
            maxWidth: 540,
            width: '100%',
            padding: 32,
            boxShadow: '0 20px 40px -10px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Manage Business Subscription</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  {selectedSub.business?.name}
                </p>
              </div>
              <button 
                onClick={() => setManageSubModalOpen(false)}
                style={{ background: 'transparent', color: 'var(--text-dim)', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveManageSub} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  Assigned Subscription Plan
                </label>
                <select 
                  value={manageForm.planId}
                  onChange={(e) => setManageForm({ ...manageForm, planId: e.target.value })}
                  className="form-input"
                  style={{ fontSize: '0.9rem' }}
                >
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} — ₹{p.priceMonthly}/mo ({p.maxBranches} branches, {p.maxServices} services)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  Subscription Status
                </label>
                <select 
                  value={manageForm.status}
                  onChange={(e) => setManageForm({ ...manageForm, status: e.target.value })}
                  className="form-input"
                  style={{ fontSize: '0.9rem' }}
                >
                  <option value="ACTIVE">ACTIVE (Full access)</option>
                  <option value="TRIAL">TRIAL (Free evaluation)</option>
                  <option value="PAST_DUE">PAST DUE (Payment pending)</option>
                  <option value="SUSPENDED">SUSPENDED (Restricted access)</option>
                  <option value="EXPIRED">EXPIRED (Terminated term)</option>
                  <option value="CANCELLED">CANCELLED (Account closed)</option>
                </select>
              </div>

              {/* Expiration date & quick extensions */}
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  Expiration Date
                </label>
                <input 
                  type="date"
                  value={manageForm.endDate}
                  onChange={(e) => setManageForm({ ...manageForm, endDate: e.target.value, extendDays: null })}
                  className="form-input"
                  style={{ fontSize: '0.9rem', marginBottom: 8 }}
                />

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Quick Extend:</span>
                  {[15, 30, 90, 365].map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        const current = selectedSub.endDate ? new Date(selectedSub.endDate) : new Date();
                        const newDate = new Date(current.getTime() + d * 24 * 60 * 60 * 1000);
                        setManageForm({ 
                          ...manageForm, 
                          extendDays: d, 
                          endDate: newDate.toISOString().split('T')[0] 
                        });
                      }}
                      style={{
                        background: '#f1f5f9',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 6,
                        padding: '3px 8px',
                        fontSize: '0.75rem',
                        fontWeight: 600
                      }}
                    >
                      +{d} Days
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                <button 
                  type="button" 
                  onClick={() => setManageSubModalOpen(false)}
                  className="btn-secondary"
                  disabled={savingSub}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={savingSub}
                >
                  {savingSub ? 'Saving...' : 'Update Subscription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 3: ASSIGN NEW SUBSCRIPTION TO BUSINESS
         ======================================================== */}
      {assignModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20
        }}>
          <div className="glass-panel" style={{
            maxWidth: 540,
            width: '100%',
            padding: 32,
            boxShadow: '0 20px 40px -10px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Assign Subscription to Business</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  Grant or initialize a subscription tier for an onboarded business.
                </p>
              </div>
              <button 
                onClick={() => setAssignModalOpen(false)}
                style={{ background: 'transparent', color: 'var(--text-dim)', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveAssignSub} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  Select Business *
                </label>
                <select 
                  required
                  value={assignForm.businessId}
                  onChange={(e) => setAssignForm({ ...assignForm, businessId: e.target.value })}
                  className="form-input"
                  style={{ fontSize: '0.9rem' }}
                >
                  <option value="">-- Choose a business --</option>
                  {businesses.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.category || 'General'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  Select Subscription Plan *
                </label>
                <select 
                  required
                  value={assignForm.planId}
                  onChange={(e) => setAssignForm({ ...assignForm, planId: e.target.value })}
                  className="form-input"
                  style={{ fontSize: '0.9rem' }}
                >
                  <option value="">-- Choose a plan --</option>
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} — ₹{p.priceMonthly}/mo
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                    Initial Status
                  </label>
                  <select 
                    value={assignForm.status}
                    onChange={(e) => setAssignForm({ ...assignForm, status: e.target.value })}
                    className="form-input"
                    style={{ fontSize: '0.9rem' }}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="TRIAL">TRIAL</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                    Duration
                  </label>
                  <select 
                    value={assignForm.durationDays}
                    onChange={(e) => setAssignForm({ ...assignForm, durationDays: parseInt(e.target.value) || 30 })}
                    className="form-input"
                    style={{ fontSize: '0.9rem' }}
                  >
                    <option value={15}>15 Days</option>
                    <option value={30}>30 Days (1 Month)</option>
                    <option value={90}>90 Days (3 Months)</option>
                    <option value={180}>180 Days (6 Months)</option>
                    <option value={365}>365 Days (1 Year)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                <button 
                  type="button" 
                  onClick={() => setAssignModalOpen(false)}
                  className="btn-secondary"
                  disabled={assigningSub}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={assigningSub}
                >
                  {assigningSub ? 'Assigning...' : 'Assign Subscription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
