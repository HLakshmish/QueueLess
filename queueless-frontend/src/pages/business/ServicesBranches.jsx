import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Plus, Store, Clock, MapPin, Edit2, Trash2, AlertTriangle, X, Check } from 'lucide-react';

export default function ServicesBranches() {
  const { activeBusiness } = useAuth();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // New service form state
  const [showAddService, setShowAddService] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [serviceDesc, setServiceDesc] = useState('');
  const [avgDuration, setAvgDuration] = useState('15');

  // New branch form state
  const [showAddBranch, setShowAddBranch] = useState(false);
  const [branchName, setBranchName] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [branchCity, setBranchCity] = useState('');

  // Edit branch state
  const [editingBranch, setEditingBranch] = useState(null);
  const [editBranchName, setEditBranchName] = useState('');
  const [editBranchAddress, setEditBranchAddress] = useState('');
  const [editBranchCity, setEditBranchCity] = useState('');

  // Delete branch state
  const [deletingBranch, setDeletingBranch] = useState(null);

  // Edit service state
  const [editingService, setEditingService] = useState(null);
  const [editServiceName, setEditServiceName] = useState('');
  const [editServiceDesc, setEditServiceDesc] = useState('');
  const [editAvgDuration, setEditAvgDuration] = useState('15');

  // Delete service state
  const [deletingService, setDeletingService] = useState(null);

  useEffect(() => {
    loadData();
  }, [activeBusiness]);

  async function loadData() {
    if (!activeBusiness) return;
    setLoading(true);
    try {
      const res = await api.getBusinessBranches(activeBusiness.id);
      if (res.success) {
        setBranches(res.data);
        if (res.data.length > 0 && !selectedBranchId) {
          setSelectedBranchId(res.data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // --- Branch Actions ---

  const handleCreateBranch = async (e) => {
    e.preventDefault();
    if (!branchName || !branchAddress || !branchCity) return;
    setActionLoading(true);
    try {
      const res = await api.createBranch(activeBusiness.id, {
        name: branchName,
        address: branchAddress,
        city: branchCity,
      });
      if (res.success) {
        setShowAddBranch(false);
        setBranchName('');
        setBranchAddress('');
        setBranchCity('');
        await loadData();
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenEditBranch = (branch) => {
    setEditingBranch(branch);
    setEditBranchName(branch.name);
    setEditBranchAddress(branch.address || '');
    setEditBranchCity(branch.city || '');
  };

  const handleUpdateBranch = async (e) => {
    e.preventDefault();
    if (!editingBranch || !editBranchName || !editBranchAddress || !editBranchCity) return;
    setActionLoading(true);
    try {
      const res = await api.updateBranch(editingBranch.id, {
        name: editBranchName,
        address: editBranchAddress,
        city: editBranchCity,
      });
      if (res.success) {
        setEditingBranch(null);
        await loadData();
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDeleteBranch = async () => {
    if (!deletingBranch) return;
    setActionLoading(true);
    try {
      const res = await api.deleteBranch(deletingBranch.id);
      if (res.success) {
        setDeletingBranch(null);
        await loadData();
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // --- Service Actions ---

  const handleCreateService = async (e) => {
    e.preventDefault();
    if (!serviceName) return;
    setActionLoading(true);
    try {
      const res = await api.createService(selectedBranchId, {
        name: serviceName,
        description: serviceDesc,
        avgDurationMinutes: parseInt(avgDuration, 10),
      });
      if (res.success) {
        // Also open a queue for this service
        await api.openQueue(res.data.id, { title: `${serviceName} Queue` });
        setShowAddService(false);
        setServiceName('');
        setServiceDesc('');
        setAvgDuration('15');
        await loadData();
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenEditService = (service) => {
    setEditingService(service);
    setEditServiceName(service.name);
    setEditServiceDesc(service.description || '');
    setEditAvgDuration(String(service.avgDurationMinutes || 15));
  };

  const handleUpdateService = async (e) => {
    e.preventDefault();
    if (!editingService || !editServiceName) return;
    setActionLoading(true);
    try {
      const res = await api.updateService(editingService.id, {
        name: editServiceName,
        description: editServiceDesc,
        avgDurationMinutes: parseInt(editAvgDuration, 10) || 15,
      });
      if (res.success) {
        setEditingService(null);
        await loadData();
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDeleteService = async () => {
    if (!deletingService) return;
    setActionLoading(true);
    try {
      const res = await api.deleteService(deletingService.id);
      if (res.success) {
        setDeletingService(null);
        await loadData();
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>Branches & Service Queues</h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Configure physical branch locations, consultation desks, and estimated service durations.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => setShowAddBranch(true)} className="btn-secondary">
            <Plus size={16} /> Add Branch
          </button>
          <button onClick={() => setShowAddService(true)} className="btn-primary" disabled={branches.length === 0}>
            <Plus size={16} /> Add Service
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading branches...</div>
      ) : branches.length === 0 ? (
        <div className="glass-panel" style={{ padding: 48, textAlign: 'center' }}>
          <Store size={44} style={{ opacity: 0.5, marginBottom: 12 }} />
          <h3>No branches registered</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>Add your first business location to start accepting queues.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {branches.map((b) => (
            <div key={b.id} className="glass-panel" style={{ padding: 24 }}>
              {/* Branch Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 16, marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 700 }}>{b.name}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
                    <MapPin size={14} color="#818cf8" />
                    <span>{b.address}, {b.city}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={() => handleOpenEditBranch(b)}
                    className="btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}
                    title="Edit Branch Location"
                  >
                    <Edit2 size={13} /> Edit
                  </button>
                  <button
                    onClick={() => setDeletingBranch(b)}
                    style={{
                      padding: '6px 12px',
                      fontSize: '0.82rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      background: '#fff1f2',
                      color: '#e11d48',
                      border: '1px solid #fecdd3',
                      borderRadius: 'var(--radius-md, 8px)',
                      cursor: 'pointer',
                      fontWeight: 600,
                      transition: 'all 0.15s ease'
                    }}
                    title="Delete Branch Location"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </div>

              {/* Services list */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <h4 style={{ fontSize: '0.88rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
                    Offered Services ({b.services?.length || 0})
                  </h4>
                  <button
                    onClick={() => {
                      setSelectedBranchId(b.id);
                      setShowAddService(true);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#007bff',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <Plus size={14} /> Add Service Here
                  </button>
                </div>

                {b.services?.length === 0 ? (
                  <p style={{ color: 'var(--text-dim)', fontSize: '0.88rem' }}>No services added for this branch yet.</p>
                ) : (
                  <div className="grid-cols-3">
                    {b.services?.map((svc) => (
                      <div 
                        key={svc.id} 
                        style={{ 
                          background: '#f8fafc', 
                          border: '1px solid var(--border-subtle)', 
                          borderRadius: 12, 
                          padding: 16, 
                          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)', paddingRight: 8 }}>
                              {svc.name}
                            </div>
                            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                              <button
                                onClick={() => handleOpenEditService(svc)}
                                style={{
                                  background: '#ffffff',
                                  border: '1px solid var(--border-subtle)',
                                  borderRadius: 6,
                                  padding: '5px',
                                  cursor: 'pointer',
                                  color: '#007bff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'background 0.15s ease'
                                }}
                                title="Edit Service Desk"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => setDeletingService(svc)}
                                style={{
                                  background: '#fff1f2',
                                  border: '1px solid #fecdd3',
                                  borderRadius: 6,
                                  padding: '5px',
                                  cursor: 'pointer',
                                  color: '#e11d48',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'background 0.15s ease'
                                }}
                                title="Delete Service Desk"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 14, minHeight: 24 }}>
                            {svc.description || 'No description'}
                          </p>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#059669', fontWeight: 600 }}>
                          <Clock size={14} />
                          <span>Avg {svc.avgDurationMinutes} mins / person</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- MODALS --- */}

      {/* Add Branch Modal */}
      {showAddBranch && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 20
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: 440, padding: 30, background: '#ffffff', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <h3 style={{ fontSize: '1.3rem', marginBottom: 16 }}>Add Physical Branch</h3>
            <form onSubmit={handleCreateBranch}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Branch Name</label>
                <input className="form-input" placeholder="e.g. Indiranagar Outpatient Center" value={branchName} onChange={(e) => setBranchName(e.target.value)} required />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Street Address</label>
                <input className="form-input" placeholder="e.g. 100 Feet Road" value={branchAddress} onChange={(e) => setBranchAddress(e.target.value)} required />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>City</label>
                <input className="form-input" placeholder="e.g. Bengaluru" value={branchCity} onChange={(e) => setBranchCity(e.target.value)} required />
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowAddBranch(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={actionLoading} className="btn-primary">
                  {actionLoading ? 'Creating...' : 'Create Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Branch Modal */}
      {editingBranch && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 20
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: 440, padding: 30, background: '#ffffff', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <h3 style={{ fontSize: '1.3rem', marginBottom: 16 }}>Edit Branch Location</h3>
            <form onSubmit={handleUpdateBranch}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Branch Name</label>
                <input className="form-input" placeholder="e.g. Indiranagar Outpatient Center" value={editBranchName} onChange={(e) => setEditBranchName(e.target.value)} required />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Street Address</label>
                <input className="form-input" placeholder="e.g. 100 Feet Road" value={editBranchAddress} onChange={(e) => setEditBranchAddress(e.target.value)} required />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>City</label>
                <input className="form-input" placeholder="e.g. Bengaluru" value={editBranchCity} onChange={(e) => setEditBranchCity(e.target.value)} required />
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setEditingBranch(null)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={actionLoading} className="btn-primary">
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Branch Confirmation Modal */}
      {deletingBranch && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 20
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: 440, padding: 30, background: '#ffffff', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', textAlign: 'center' }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: '#fee2e2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <AlertTriangle size={26} />
            </div>

            <h3 style={{ fontSize: '1.25rem', marginBottom: 8, color: 'var(--text-main)' }}>Delete Branch Location?</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.5, marginBottom: 24 }}>
              Are you sure you want to delete <strong style={{ color: 'var(--text-main)' }}>"{deletingBranch.name}"</strong>? This will permanently delete this branch location along with all of its consultation desks and queues.
            </p>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button type="button" onClick={() => setDeletingBranch(null)} className="btn-secondary" style={{ padding: '9px 18px' }}>
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteBranch}
                disabled={actionLoading}
                style={{
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 'var(--radius-md, 8px)',
                  padding: '9px 20px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {actionLoading ? 'Deleting...' : 'Yes, Delete Branch'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Service Modal */}
      {showAddService && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 20
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: 460, padding: 30, background: '#ffffff', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <h3 style={{ fontSize: '1.3rem', marginBottom: 16 }}>Add Service & Live Queue</h3>
            <form onSubmit={handleCreateService}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Branch</label>
                <select className="form-input" value={selectedBranchId} onChange={(e) => setSelectedBranchId(e.target.value)}>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Service Name</label>
                <input className="form-input" placeholder="e.g. Pediatric Consultation" value={serviceName} onChange={(e) => setServiceName(e.target.value)} required />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Description</label>
                <input className="form-input" placeholder="e.g. Child health, routine vaccines" value={serviceDesc} onChange={(e) => setServiceDesc(e.target.value)} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Avg Duration (mins per person)</label>
                <input type="number" min="1" max="180" className="form-input" value={avgDuration} onChange={(e) => setAvgDuration(e.target.value)} required />
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowAddService(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={actionLoading} className="btn-primary">
                  {actionLoading ? 'Adding...' : 'Add Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Service Modal */}
      {editingService && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 20
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: 460, padding: 30, background: '#ffffff', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <h3 style={{ fontSize: '1.3rem', marginBottom: 16 }}>Edit Service Desk</h3>
            <form onSubmit={handleUpdateService}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Service Name</label>
                <input className="form-input" placeholder="e.g. Pediatric Consultation" value={editServiceName} onChange={(e) => setEditServiceName(e.target.value)} required />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Description</label>
                <input className="form-input" placeholder="e.g. Child health, routine vaccines" value={editServiceDesc} onChange={(e) => setEditServiceDesc(e.target.value)} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Avg Duration (mins per person)</label>
                <input type="number" min="1" max="180" className="form-input" value={editAvgDuration} onChange={(e) => setEditAvgDuration(e.target.value)} required />
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setEditingService(null)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={actionLoading} className="btn-primary">
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Service Confirmation Modal */}
      {deletingService && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 20
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: 440, padding: 30, background: '#ffffff', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', textAlign: 'center' }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: '#fee2e2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <AlertTriangle size={26} />
            </div>

            <h3 style={{ fontSize: '1.25rem', marginBottom: 8, color: 'var(--text-main)' }}>Delete Service Desk?</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.5, marginBottom: 24 }}>
              Are you sure you want to delete service desk <strong style={{ color: 'var(--text-main)' }}>"{deletingService.name}"</strong>? This will permanently delete this service and its active queues and tickets.
            </p>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button type="button" onClick={() => setDeletingService(null)} className="btn-secondary" style={{ padding: '9px 18px' }}>
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteService}
                disabled={actionLoading}
                style={{
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 'var(--radius-md, 8px)',
                  padding: '9px 20px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {actionLoading ? 'Deleting...' : 'Yes, Delete Service'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
