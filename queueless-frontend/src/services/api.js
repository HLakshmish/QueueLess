const API_BASE = '/api/v1';

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('queueless_token');
  const method = (options.method || 'GET').toUpperCase();

  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const fetchOptions = {
    ...options,
    method,
  };

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    if (!headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    if (fetchOptions.body === undefined) {
      fetchOptions.body = JSON.stringify({});
    }
  } else {
    delete headers['Content-Type'];
  }

  fetchOptions.headers = headers;

  const response = await fetch(`${API_BASE}${endpoint}`, fetchOptions);

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.error || data?.message || (typeof data === 'string' ? data : `Request failed (${response.status})`);
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
  getAdminPlans: () => apiRequest('/admin/plans'),
  createAdminPlan: (data) => apiRequest('/admin/plans', { method: 'POST', body: JSON.stringify(data) }),
  updateAdminPlan: (id, data) => apiRequest(`/admin/plans/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteAdminPlan: (id) => apiRequest(`/admin/plans/${id}`, { method: 'DELETE' }),
  getAdminSubscriptions: () => apiRequest('/admin/subscriptions'),
  updateAdminSubscription: (id, data) => apiRequest(`/admin/subscriptions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  assignAdminSubscription: (data) => apiRequest('/admin/subscriptions/assign', { method: 'POST', body: JSON.stringify(data) }),

  // Notifications
  getNotifications: () => apiRequest('/notifications'),
  markNotificationRead: (id) => apiRequest(`/notifications/${id}/read`, { method: 'PATCH' }),
};
