const BASE_URL = '/api';

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('twin_spin_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
    cache: 'no-store' // Strict anti-cache
  });

  if (response.status === 401) {
    localStorage.removeItem('twin_spin_token');
    localStorage.removeItem('twin_spin_user');
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    throw new Error('Session expired. Please log in again.');
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.error || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  // Auth
  login: (credentials) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  getMe: () => apiRequest('/auth/me'),

  // Games (with timestamp cache-buster)
  getGames: (activeOnly = false) => apiRequest(`/games?${activeOnly ? 'active=true&' : ''}_t=${Date.now()}`),
  createGame: (data) => apiRequest('/games', { method: 'POST', body: JSON.stringify(data) }),
  updateGame: (id, data) => apiRequest(`/games/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleGame: (id) => apiRequest(`/games/${id}/toggle`, { method: 'PATCH' }),

  // Discounts (with timestamp cache-buster)
  getDiscounts: (activeOnly = false) => apiRequest(`/discounts?${activeOnly ? 'active=true&' : ''}_t=${Date.now()}`),
  createDiscount: (data) => apiRequest('/discounts', { method: 'POST', body: JSON.stringify(data) }),
  updateDiscount: (id, data) => apiRequest(`/discounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleDiscount: (id) => apiRequest(`/discounts/${id}/toggle`, { method: 'PATCH' }),

  // Tickets
  getTickets: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.customer_name) params.append('customer_name', filters.customer_name);
    if (filters.customer_phone) params.append('customer_phone', filters.customer_phone);
    if (filters.date) params.append('date', filters.date);
    if (filters.ticket_id) params.append('ticket_id', filters.ticket_id);
    params.append('_t', Date.now());
    const qs = params.toString();
    return apiRequest(`/tickets${qs ? `?${qs}` : ''}`);
  },
  getTicketById: (id) => apiRequest(`/tickets/${id}`),
  createTicket: (data) => apiRequest('/tickets', { method: 'POST', body: JSON.stringify(data) }),
  syncOfflineTickets: (offline_tickets) => apiRequest('/tickets/sync-offline', { method: 'POST', body: JSON.stringify({ offline_tickets }) }),
  syncPendingSheets: () => apiRequest('/tickets/sync-pending-sheets', { method: 'POST' }),
  updateTicket: (id, data) => apiRequest(`/tickets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTicket: (id) => apiRequest(`/tickets/${id}`, { method: 'DELETE' }),

  // Queue
  getQueue: () => apiRequest(`/queue?_t=${Date.now()}`),
  startQueueSession: (ticket_id, item_id) => apiRequest('/queue/start', { method: 'POST', body: JSON.stringify({ ticket_id, item_id }) }),
  endQueueSession: (ticket_id, item_id, auto_promote = true) => apiRequest('/queue/end', { method: 'POST', body: JSON.stringify({ ticket_id, item_id, auto_promote }) }),

  // Settings
  getSettings: () => apiRequest(`/settings?_t=${Date.now()}`),
  updateSettings: (data) => apiRequest('/settings', { method: 'PUT', body: JSON.stringify(data) }),
  uploadQR: (formData) => apiRequest('/settings/upload-qr', { method: 'POST', body: formData }),
  testGoogleSheet: (webhook_url) => apiRequest('/settings/test-sheet', { method: 'POST', body: JSON.stringify({ webhook_url }) }),

  // Users Management (Admin)
  getUsers: () => apiRequest('/users'),
  createUser: (data) => apiRequest('/users', { method: 'POST', body: JSON.stringify(data) }),
  deleteUser: (id) => apiRequest(`/users/${id}`, { method: 'DELETE' }),
  updateUserPassword: (id, new_password) => apiRequest(`/users/${id}/password`, { method: 'PUT', body: JSON.stringify({ new_password }) }),

  // Reports
  getDashboardReports: () => apiRequest(`/reports/dashboard?_t=${Date.now()}`)
};
