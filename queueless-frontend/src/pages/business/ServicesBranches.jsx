import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Plus, Store, Clock, MapPin } from 'lucide-react';

export default function ServicesBranches() {
  const { activeBusiness } = useAuth();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    loadData();
  }, [activeBusiness]);

  async function loadData() {
    if (!activeBusiness) return;
    setLoading(false);
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

  const handleCreateService = async (e) => {
    e.preventDefault();
    if (!serviceName) return;
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
        loadData();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreateBranch = async (e) => {
    e.preventDefault();
    if (!branchName || !branchAddress || !branchCity) return;
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
        loadData();
      }
    } catch (err) {
      alert(err.message);
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 16, marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: '1.3rem' }}>{b.name}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
                    <MapPin size={14} color="#818cf8" />
                    <span>{b.address}, {b.city}</span>
                  </div>
                </div>
              </div>

              {/* Services list */}
              <div>
                <h4 style={{ fontSize: '0.95rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                  Offered Services ({b.services?.length || 0})
                </h4>

                {b.services?.length === 0 ? (
                  <p style={{ color: 'var(--text-dim)', fontSize: '0.88rem' }}>No services added for this branch yet.</p>
                ) : (
                  <div className="grid-cols-3">
                    {b.services?.map((svc) => (
                      <div key={svc.id} style={{ background: '#f8fafc', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                        <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: 4 }}>{svc.name}</div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>{svc.description || 'No description'}</p>
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
                <button type="submit" className="btn-primary">Create Branch</button>
              </div>
            </form>
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
                <button type="submit" className="btn-primary">Add Service</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
