const API_BASE = '/api/v1';

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('queueless_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.error || data?.message || `Request failed (${response.status})`;
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  // Auth
  login: (credentials) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (payload) => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  getMe: () => apiRequest('/auth/me'),

  // Businesses
  getBusinesses: (params = '') => apiRequest(`/businesses${params ? `?${params}` : ''}`),
  getBusinessById: (id) => apiRequest(`/businesses/${id}`),
  createBusiness: (data) => apiRequest('/businesses', { method: 'POST', body: JSON.stringify(data) }),
  updateBusiness: (id, data) => apiRequest(`/businesses/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  getBusinessBranches: (id) => apiRequest(`/businesses/${id}/branches`),
  createBranch: (businessId, data) => apiRequest(`/businesses/${businessId}/branches`, { method: 'POST', body: JSON.stringify(data) }),
  createService: (branchId, data) => apiRequest(`/branches/${branchId}/services`, { method: 'POST', body: JSON.stringify(data) }),

  // Queues
  openQueue: (serviceId, data) => apiRequest(`/services/${serviceId}/queues`, { method: 'POST', body: JSON.stringify(data) }),
  getQueue: (id) => apiRequest(`/queues/${id}`),
  joinQueue: (id, data) => apiRequest(`/queues/${id}/join`, { method: 'POST', body: JSON.stringify(data) }),
  callNext: (id) => apiRequest(`/queues/${id}/call-next`, { method: 'POST' }),
  pauseQueue: (id) => apiRequest(`/queues/${id}/pause`, { method: 'POST' }),
  resumeQueue: (id) => apiRequest(`/queues/${id}/resume`, { method: 'POST' }),
  closeQueue: (id) => apiRequest(`/queues/${id}/close`, { method: 'POST' }),

  // Queue Entries
  getEntry: (id) => apiRequest(`/queue-entries/${id}`),
  checkIn: (id) => apiRequest(`/queue-entries/${id}/check-in`, { method: 'POST' }),
  serveEntry: (id) => apiRequest(`/queue-entries/${id}/serve`, { method: 'POST' }),
  skipEntry: (id) => apiRequest(`/queue-entries/${id}/skip`, { method: 'POST' }),
  recallEntry: (id) => apiRequest(`/queue-entries/${id}/recall`, { method: 'POST' }),
  cancelEntry: (id) => apiRequest(`/queue-entries/${id}/cancel`, { method: 'POST' }),
  getCustomerHistory: () => apiRequest('/queue-entries/customer/history'),

  // Subscriptions & Plans
  getPlans: () => apiRequest('/subscriptions/plans'),
  subscribeBusiness: (data) => apiRequest('/subscriptions/subscribe', { method: 'POST', body: JSON.stringify(data) }),

  // Analytics
  getBusinessAnalytics: (businessId) => apiRequest(`/analytics/business/${businessId}`),
  getPlatformAnalytics: () => apiRequest('/analytics/platform'),

  // Admin
  getAdminUsers: () => apiRequest('/admin/users'),
  getAdminBusinesses: () => apiRequest('/admin/businesses'),
  updateBusinessStatus: (id, status) => apiRequest(`/admin/businesses/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  getAdminAuditLogs: () => apiRequest('/admin/audit-logs'),
};
