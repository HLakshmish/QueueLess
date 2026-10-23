import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Plus, Store, Clock, MapPin, Edit2, Trash2, AlertTriangle, X, Check, Upload, Image as ImageIcon } from 'lucide-react';

// Client-side image processor: compresses and resizes to lightweight DataURL
const processImageFile = (file, callback) => {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new window.Image();
    img.onload = () => {
      const maxW = 1200;
      const maxH = 800;
      let width = img.width;
      let height = img.height;

      if (width > maxW || height > maxH) {
        if (width / height > maxW / maxH) {
          height = Math.round((height * maxW) / width);
          width = maxW;
        } else {
          width = Math.round((width * maxH) / height);
          height = maxH;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
      callback(dataUrl);
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
};

export default function ServicesBranches() {
  const { activeBusiness } = useAuth();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // File input refs for system file choosing
  const addFileInputRef = useRef(null);
  const editFileInputRef = useRef(null);

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
  const [branchImageUrl, setBranchImageUrl] = useState('');

  // Edit branch state
  const [editingBranch, setEditingBranch] = useState(null);
  const [editBranchName, setEditBranchName] = useState('');
  const [editBranchAddress, setEditBranchAddress] = useState('');
  const [editBranchCity, setEditBranchCity] = useState('');
  const [editBranchImageUrl, setEditBranchImageUrl] = useState('');

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
        imageUrl: branchImageUrl ? branchImageUrl.trim() : null,
      });
      if (res.success) {
        setShowAddBranch(false);
        setBranchName('');
        setBranchAddress('');
        setBranchCity('');
        setBranchImageUrl('');
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
    setEditBranchImageUrl(branch.imageUrl || '');
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
        imageUrl: editBranchImageUrl ? editBranchImageUrl.trim() : '',
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
    <div className="page-container" style={{ maxWidth: 1100 }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1>Branches &amp; Service Queues</h1>
          <p>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {[1, 2].map((i) => (
            <div key={i} className="skeleton" style={{ height: 220, borderRadius: 16 }} />
          ))}
        </div>
      ) : branches.length === 0 ? (
        <div className="glass-panel empty-state">
          <div className="empty-state-icon">
            <Store size={28} />
          </div>
          <h3>No branches registered</h3>
          <p>Add your first business location to start accepting queues.</p>
          <button onClick={() => setShowAddBranch(true)} className="btn-primary">
            <Plus size={16} /> Add Branch
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {branches.map((b) => (
            <div key={b.id} className="shining-card" style={{ padding: 24, background: '#ffffff' }}>
              {/* Branch Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 16, marginBottom: 20, flexWrap: 'wrap', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  {b.imageUrl ? (
                    <img 
                      src={b.imageUrl} 
                      alt={b.name} 
                      style={{ 
                        width: 64, 
                        height: 64, 
                        borderRadius: 14, 
                        objectFit: 'cover', 
                        border: '1.5px solid var(--border-subtle)', 
                        boxShadow: '0 4px 12px rgba(0,0,0,0.06)' 
                      }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div style={{ 
                      width: 64, 
                      height: 64, 
                      borderRadius: 14, 
                      background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      color: 'var(--accent-primary, #4f46e5)',
                      border: '1px solid #c7d2fe'
                    }}>
                      <Store size={28} />
                    </div>
                  )}

                  <div>
                    <h3 style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0 0 4px 0' }}>{b.name}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      <MapPin size={14} color="var(--accent-primary)" />
                      <span>{b.address}, {b.city}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={() => handleOpenEditBranch(b)}
                    className="btn-secondary"
                    style={{ padding: '6px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}
                    title="Edit Branch Location"
                  >
                    <Edit2 size={13} /> Edit
                  </button>
                  <button
                    onClick={() => setDeletingBranch(b)}
                    className="btn-danger"
                    style={{ padding: '6px 14px', fontSize: '0.82rem' }}
                    title="Delete Branch Location"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </div>

              {/* Services list */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <h4 style={{ fontSize: '0.82rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
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
                      color: 'var(--accent-primary)',
                      fontSize: '0.82rem',
                      fontWeight: 700,
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
                                className="btn-secondary"
                                style={{ padding: '5px 8px', fontSize: '0.75rem' }}
                                title="Edit Service Desk"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => setDeletingService(svc)}
                                className="btn-danger"
                                style={{ padding: '5px 8px', fontSize: '0.75rem' }}
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
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h3>Add Physical Branch</h3>
              <p>Register a new location for your business</p>
            </div>
            <form onSubmit={handleCreateBranch}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-main)', fontWeight: 700, display: 'block', marginBottom: 4 }}>Branch Name *</label>
                <input className="form-input" placeholder="e.g. Koteshwara Branch" value={branchName} onChange={(e) => setBranchName(e.target.value)} required />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-main)', fontWeight: 700, display: 'block', marginBottom: 4 }}>Street Address *</label>
                <input className="form-input" placeholder="e.g. Beejadi-Koteshwara Road, near High School" value={branchAddress} onChange={(e) => setBranchAddress(e.target.value)} required />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-main)', fontWeight: 700, display: 'block', marginBottom: 4 }}>City *</label>
                <input className="form-input" placeholder="e.g. Koteshwara / Kundapura" value={branchCity} onChange={(e) => setBranchCity(e.target.value)} required />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-main)', fontWeight: 700, display: 'block', marginBottom: 6 }}>
                  Branch Photo <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>(Optional)</span>
                </label>

                {branchImageUrl ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: 10,
                    background: '#f8fafc',
                    borderRadius: 12,
                    border: '1.5px solid #c7d2fe'
                  }}>
                    <img 
                      src={branchImageUrl} 
                      alt="Preview" 
                      style={{ width: 72, height: 50, borderRadius: 8, objectFit: 'cover', border: '1px solid #e2e8f0' }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Check size={14} color="#16a34a" /> Image Selected
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        Ready to save with branch
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => addFileInputRef.current && addFileInputRef.current.click()}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: 8,
                          padding: '5px 10px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: '#334155',
                          cursor: 'pointer'
                        }}
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setBranchImageUrl('');
                          if (addFileInputRef.current) addFileInputRef.current.value = '';
                        }}
                        style={{
                          background: '#fee2e2',
                          border: '1px solid #fecaca',
                          borderRadius: 8,
                          padding: '5px 8px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: '#dc2626',
                          cursor: 'pointer'
                        }}
                        title="Remove Image"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* Choose from System Dropzone Button */}
                    <div 
                      onClick={() => addFileInputRef.current && addFileInputRef.current.click()}
                      style={{
                        border: '2px dashed #cbd5e1',
                        borderRadius: 14,
                        padding: '16px 14px',
                        textAlign: 'center',
                        background: '#f8fafc',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#6366f1';
                        e.currentTarget.style.background = '#f0f4ff';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#cbd5e1';
                        e.currentTarget.style.background = '#f8fafc';
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5' }}>
                          <Upload size={18} />
                        </div>
                        <div>
                          <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#4338ca' }}>📁 Choose Image from System</span>
                          <p style={{ margin: '2px 0 0', fontSize: '0.74rem', color: '#64748b' }}>Select photo from your computer or device</p>
                        </div>
                      </div>
                    </div>

                    {/* Or Paste URL option */}
                    <div style={{ marginTop: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>Or paste image web link:</span>
                      </div>
                      <input 
                        className="form-input" 
                        placeholder="https://... image link" 
                        value={branchImageUrl} 
                        onChange={(e) => setBranchImageUrl(e.target.value)} 
                        style={{ fontSize: '0.8rem', padding: '7px 10px' }}
                      />
                    </div>
                  </div>
                )}

                <input 
                  type="file" 
                  ref={addFileInputRef} 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      processImageFile(file, (dataUrl) => setBranchImageUrl(dataUrl));
                    }
                  }} 
                />
              </div>
              <div className="modal-footer">
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
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h3>Edit Branch Location</h3>
              <p>Update physical address, name and branch photo</p>
            </div>
            <form onSubmit={handleUpdateBranch}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-main)', fontWeight: 700, display: 'block', marginBottom: 4 }}>Branch Name *</label>
                <input className="form-input" placeholder="e.g. Koteshwara Branch" value={editBranchName} onChange={(e) => setEditBranchName(e.target.value)} required />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-main)', fontWeight: 700, display: 'block', marginBottom: 4 }}>Street Address *</label>
                <input className="form-input" placeholder="e.g. Beejadi-Koteshwara Road, near High School" value={editBranchAddress} onChange={(e) => setEditBranchAddress(e.target.value)} required />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-main)', fontWeight: 700, display: 'block', marginBottom: 4 }}>City *</label>
                <input className="form-input" placeholder="e.g. Koteshwara / Kundapura" value={editBranchCity} onChange={(e) => setEditBranchCity(e.target.value)} required />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-main)', fontWeight: 700, display: 'block', marginBottom: 6 }}>
                  Branch Photo <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>(Optional)</span>
                </label>

                {editBranchImageUrl ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: 10,
                    background: '#f8fafc',
                    borderRadius: 12,
                    border: '1.5px solid #c7d2fe'
                  }}>
                    <img 
                      src={editBranchImageUrl} 
                      alt="Preview" 
                      style={{ width: 72, height: 50, borderRadius: 8, objectFit: 'cover', border: '1px solid #e2e8f0' }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Check size={14} color="#16a34a" /> Image Selected
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        Ready to save with branch
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => editFileInputRef.current && editFileInputRef.current.click()}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: 8,
                          padding: '5px 10px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: '#334155',
                          cursor: 'pointer'
                        }}
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditBranchImageUrl('');
                          if (editFileInputRef.current) editFileInputRef.current.value = '';
                        }}
                        style={{
                          background: '#fee2e2',
                          border: '1px solid #fecaca',
                          borderRadius: 8,
                          padding: '5px 8px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: '#dc2626',
                          cursor: 'pointer'
                        }}
                        title="Remove Image"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* Choose from System Dropzone Button */}
                    <div 
                      onClick={() => editFileInputRef.current && editFileInputRef.current.click()}
                      style={{
                        border: '2px dashed #cbd5e1',
                        borderRadius: 14,
                        padding: '16px 14px',
                        textAlign: 'center',
                        background: '#f8fafc',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#6366f1';
                        e.currentTarget.style.background = '#f0f4ff';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#cbd5e1';
                        e.currentTarget.style.background = '#f8fafc';
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5' }}>
                          <Upload size={18} />
                        </div>
                        <div>
                          <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#4338ca' }}>📁 Choose Image from System</span>
                          <p style={{ margin: '2px 0 0', fontSize: '0.74rem', color: '#64748b' }}>Select photo from your computer or device</p>
                        </div>
                      </div>
                    </div>

                    {/* Or Paste URL option */}
                    <div style={{ marginTop: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>Or paste image web link:</span>
                      </div>
                      <input 
                        className="form-input" 
                        placeholder="https://... image link" 
                        value={editBranchImageUrl} 
                        onChange={(e) => setEditBranchImageUrl(e.target.value)} 
                        style={{ fontSize: '0.8rem', padding: '7px 10px' }}
                      />
                    </div>
                  </div>
                )}

                <input 
                  type="file" 
                  ref={editFileInputRef} 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      processImageFile(file, (dataUrl) => setEditBranchImageUrl(dataUrl));
                    }
                  }} 
                />
              </div>
              <div className="modal-footer">
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
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 440, textAlign: 'center' }}>
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

            <div className="modal-footer" style={{ justifyContent: 'center' }}>
              <button type="button" onClick={() => setDeletingBranch(null)} className="btn-secondary">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteBranch}
                disabled={actionLoading}
                className="btn-danger"
                style={{ background: '#dc2626', color: '#fff' }}
              >
                {actionLoading ? 'Deleting...' : 'Yes, Delete Branch'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Service Modal */}
      {showAddService && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h3>Add Service &amp; Live Queue</h3>
              <p>Configure consultation desk and estimated duration</p>
            </div>
            <form onSubmit={handleCreateService}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-main)', fontWeight: 700, display: 'block', marginBottom: 4 }}>Branch *</label>
                <select className="form-input" value={selectedBranchId} onChange={(e) => setSelectedBranchId(e.target.value)}>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-main)', fontWeight: 700, display: 'block', marginBottom: 4 }}>Service Name *</label>
                <input className="form-input" placeholder="e.g. Pediatric Consultation" value={serviceName} onChange={(e) => setServiceName(e.target.value)} required />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-main)', fontWeight: 700, display: 'block', marginBottom: 4 }}>Description</label>
                <input className="form-input" placeholder="e.g. Child health, routine vaccines" value={serviceDesc} onChange={(e) => setServiceDesc(e.target.value)} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-main)', fontWeight: 700, display: 'block', marginBottom: 4 }}>Avg Duration (mins per person) *</label>
                <input type="number" min="1" max="180" className="form-input" value={avgDuration} onChange={(e) => setAvgDuration(e.target.value)} required />
              </div>
              <div className="modal-footer">
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
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h3>Edit Service Desk</h3>
              <p>Update service details and estimated wait times</p>
            </div>
            <form onSubmit={handleUpdateService}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-main)', fontWeight: 700, display: 'block', marginBottom: 4 }}>Service Name *</label>
                <input className="form-input" placeholder="e.g. Pediatric Consultation" value={editServiceName} onChange={(e) => setEditServiceName(e.target.value)} required />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-main)', fontWeight: 700, display: 'block', marginBottom: 4 }}>Description</label>
                <input className="form-input" placeholder="e.g. Child health, routine vaccines" value={editServiceDesc} onChange={(e) => setEditServiceDesc(e.target.value)} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-main)', fontWeight: 700, display: 'block', marginBottom: 4 }}>Avg Duration (mins per person) *</label>
                <input type="number" min="1" max="180" className="form-input" value={editAvgDuration} onChange={(e) => setEditAvgDuration(e.target.value)} required />
              </div>
              <div className="modal-footer">
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
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 440, textAlign: 'center' }}>
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

            <div className="modal-footer" style={{ justifyContent: 'center' }}>
              <button type="button" onClick={() => setDeletingService(null)} className="btn-secondary">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteService}
                disabled={actionLoading}
                className="btn-danger"
                style={{ background: '#dc2626', color: '#fff' }}
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
