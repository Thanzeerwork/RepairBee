import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Attach Authorization header if token exists
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('rb_admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle global response errors
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('rb_admin_token');
        localStorage.removeItem('rb_admin_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error.response?.data || error);
  }
);

export const authApi = {
  login: (email, password) => apiClient.post('/auth/login', { email, password }),
  getProfile: () => apiClient.get('/auth/me'),
};

export const analyticsApi = {
  getOverview: () => apiClient.get('/analytics/overview'),
  getOrderStats: (period = 'daily') => apiClient.get(`/analytics/orders?period=${period}`),
  getRevenueStats: () => apiClient.get('/analytics/revenue'),
  getTopShops: () => apiClient.get('/analytics/top-shops'),
  getTopPartners: () => apiClient.get('/analytics/top-partners'),
};

export const ordersApi = {
  getOrders: (params) => apiClient.get('/repairs/admin/all', { params }),
  getOrderById: (id) => apiClient.get(`/repairs/${id}`),
  assignPartner: (data) => apiClient.post('/deliveries/assign', data),
  releaseEscrow: (id) => apiClient.post(`/repairs/${id}/release-escrow`, {}),
};

export const shopsApi = {
  getShops: (params) => apiClient.get('/shops', { params }),
  getPendingShops: () => apiClient.get('/shops/pending'),
  getShopById: (id) => apiClient.get(`/shops/${id}`),
  approveShop: (id) => apiClient.patch(`/shops/${id}/approve`, {}),
  rejectShop: (id, reason) => apiClient.patch(`/shops/${id}/reject`, { reason }),
  updateCommission: (id, commission_rate) => apiClient.patch(`/shops/${id}/commission`, { commission_rate }),
  toggleBlock: (id) => apiClient.patch(`/shops/${id}/block`, {}),
};

export const disputesApi = {
  getDisputes: (params) => apiClient.get('/disputes', { params }),
  resolveDispute: (id, data) => apiClient.patch(`/disputes/${id}/resolve`, data),
};

export const withdrawalsApi = {
  getWithdrawals: (params) => apiClient.get('/withdrawals', { params }),
  processWithdrawal: (id, data) => apiClient.patch(`/withdrawals/${id}/process`, data),
};

export const promosApi = {
  getPromos: () => apiClient.get('/promos'),
  createPromo: (data) => apiClient.post('/promos', data),
};

export const usersApi = {
  listUsers: (params) => apiClient.get('/users', { params }),
  toggleBlock: (id) => apiClient.patch(`/users/${id}/block`, {}),
};
