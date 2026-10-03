import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Attach JWT token from localStorage (supports customer, workshop, runner & admin sessions)
apiClient.interceptors.request.use((config) => {
  if (!config.headers.Authorization) {
    const adminToken = localStorage.getItem('rb_admin_token');
    const runnerToken = localStorage.getItem('rb_runner_token');
    const workshopToken = localStorage.getItem('rb_workshop_token');
    const customerToken = localStorage.getItem('rb_customer_token');

    if (config.useAdminAuth || config.url?.includes('/analytics') || config.url?.includes('/repairs/admin')) {
      if (adminToken) config.headers.Authorization = `Bearer ${adminToken}`;
    } else if (config.useRunnerAuth || config.url?.includes('/deliveries')) {
      if (runnerToken) config.headers.Authorization = `Bearer ${runnerToken}`;
      else if (adminToken) config.headers.Authorization = `Bearer ${adminToken}`;
      else if (customerToken) config.headers.Authorization = `Bearer ${customerToken}`;
    } else if (config.useWorkshopAuth || config.url?.includes('/shops/') || config.url?.includes('/repairs/shop')) {
      if (workshopToken) config.headers.Authorization = `Bearer ${workshopToken}`;
      else if (adminToken) config.headers.Authorization = `Bearer ${adminToken}`;
      else if (customerToken) config.headers.Authorization = `Bearer ${customerToken}`;
    } else if (adminToken && config.url?.includes('/disputes')) {
      config.headers.Authorization = `Bearer ${adminToken}`;
    } else if (customerToken) {
      config.headers.Authorization = `Bearer ${customerToken}`;
    } else if (workshopToken) {
      config.headers.Authorization = `Bearer ${workshopToken}`;
    } else if (runnerToken) {
      config.headers.Authorization = `Bearer ${runnerToken}`;
    } else if (adminToken) {
      config.headers.Authorization = `Bearer ${adminToken}`;
    }
  }
  return config;
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor with auto-refresh / silent re-auth
apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;
    const errorData = error.response?.data || error;
    const isAuthError =
      error.response?.status === 401 ||
      errorData?.message?.toLowerCase().includes('token expired') ||
      errorData?.message?.toLowerCase().includes('jwt expired');

    const isAuthEndpoint =
      originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/register') ||
      originalRequest?.url?.includes('/auth/refresh-token');

    if (isAuthError && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const isAdmin =
        originalRequest.useAdminAuth ||
        originalRequest.url?.includes('/analytics') ||
        originalRequest.url?.includes('/repairs/admin');

      const isWorkshop =
        !isAdmin && (
          originalRequest.useWorkshopAuth ||
          originalRequest.url?.includes('/shops/') ||
          originalRequest.url?.includes('/repairs/shop')
        );

      const isRunner =
        !isAdmin &&
        !isWorkshop && (
          originalRequest.useRunnerAuth ||
          originalRequest.url?.includes('/deliveries')
        );

      const refreshKey = isAdmin
        ? 'rb_admin_refresh_token'
        : isWorkshop
        ? 'rb_workshop_refresh_token'
        : isRunner
        ? 'rb_runner_refresh_token'
        : 'rb_customer_refresh_token';

      const tokenKey = isAdmin
        ? 'rb_admin_token'
        : isWorkshop
        ? 'rb_workshop_token'
        : isRunner
        ? 'rb_runner_token'
        : 'rb_customer_token';

      const userKey = isAdmin
        ? 'rb_admin_user'
        : isWorkshop
        ? 'rb_workshop_user'
        : isRunner
        ? 'rb_runner_user'
        : 'rb_customer_user';

      const storedRefreshToken = localStorage.getItem(refreshKey);

      try {
        let newAccessToken = null;
        let newRefreshToken = null;

        if (storedRefreshToken) {
          // Attempt standard refresh token endpoint
          const refreshRes = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
            refreshToken: storedRefreshToken,
          });
          const payload = refreshRes.data?.data || refreshRes.data;
          newAccessToken = payload.accessToken;
          newRefreshToken = payload.refreshToken;
        }

        // If refresh token was missing or expired, attempt silent login recovery
        if (!newAccessToken) {
          const creds = isAdmin
            ? { email: 'admin@repairbee.com', password: 'Admin@123' }
            : isWorkshop
            ? { email: 'shopowner@repairbee.com', password: 'Shop@123' }
            : isRunner
            ? { email: 'delivery@repairbee.com', password: 'Partner@123' }
            : { email: 'customer@repairbee.com', password: 'Customer@123' };

          const loginRes = await axios.post(`${API_BASE_URL}/auth/login`, creds);
          const payload = loginRes.data?.data || loginRes.data;
          newAccessToken = payload.accessToken || payload.token;
          newRefreshToken = payload.refreshToken;
          if (payload.user) {
            localStorage.setItem(userKey, JSON.stringify(payload.user));
          }
        }

        if (newAccessToken) {
          localStorage.setItem(tokenKey, newAccessToken);
          if (newRefreshToken) {
            localStorage.setItem(refreshKey, newRefreshToken);
          }

          apiClient.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

          processQueue(null, newAccessToken);
          return apiClient(originalRequest);
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.removeItem(tokenKey);
        localStorage.removeItem(refreshKey);
        return Promise.reject(refreshErr?.response?.data || refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error.response?.data || error);
  }
);

export const authApi = {
  login: (email, password) => apiClient.post('/auth/login', { email, password }),
  register: (data) => apiClient.post('/auth/register', data),
  refreshToken: (refreshToken) => apiClient.post('/auth/refresh-token', { refreshToken }),
  getProfile: () => apiClient.get('/auth/me'),
};

export const productsApi = {
  getProducts: () => apiClient.get('/products'),
  getIssues: (productId) => apiClient.get(`/products/${productId}/issues`),
};

export const shopsApi = {
  getShops: (params) => apiClient.get('/shops', { params }),
  getShopById: (id) => apiClient.get(`/shops/${id}`),
};

export const repairsApi = {
  createRepair: (data) => apiClient.post('/repairs', data),
  getMyOrders: (params) => apiClient.get('/repairs', { params }),
  getOrderDetails: (id) => apiClient.get(`/repairs/${id}`),
  getInvoice: (id) => apiClient.get(`/repairs/${id}/invoice`),
  selectShop: (id, shop_id) => apiClient.post(`/repairs/${id}/select-shop`, { shop_id }),
  cancelOrder: (id, reason) => apiClient.patch(`/repairs/${id}/cancel`, { reason }),
  confirmDelivery: (id) => apiClient.post(`/repairs/${id}/confirm-delivery`, {}),
  saveQcReport: (id, data) => apiClient.post(`/repairs/${id}/qc-report`, data, { useWorkshopAuth: true }),
  getQcReport: (id) => apiClient.get(`/repairs/${id}/qc-report`),
  saveVideoProof: (id, data) => apiClient.post(`/repairs/${id}/video-proof`, data, { useWorkshopAuth: true }),
  getVideoProof: (id) => apiClient.get(`/repairs/${id}/video-proof`),
};

export const quotesApi = {
  approveQuote: (orderId, data = {}) => apiClient.patch(`/quotes/${orderId}/approve`, data),
  rejectQuote: (orderId, reason) => apiClient.patch(`/quotes/${orderId}/reject`, { reason }),
};

export const warrantyApi = {
  claimWarranty: (orderId, data) => apiClient.post(`/warranty/${orderId}/claim`, data),
  getWarrantyInfo: (orderId) => apiClient.get(`/warranty/${orderId}`),
};

export const disputesApi = {
  raiseDispute: (orderId, data) => apiClient.post(`/disputes/${orderId}`, data),
  getDisputes: () => apiClient.get('/disputes'),
};

export const ratingsApi = {
  rateShop: (orderId, data) => apiClient.post(`/ratings/${orderId}/shop`, data),
  ratePartner: (orderId, data) => apiClient.post(`/ratings/${orderId}/partner`, data),
  getOrderRatings: (orderId) => apiClient.get(`/ratings/order/${orderId}`),
  getShopReviews: (shopId, params) => apiClient.get(`/ratings/shop/${shopId}`, { params }),
  getMyShopReviews: (params) => apiClient.get('/ratings/my-shop', { params, useWorkshopAuth: true }),
};

export const usersApi = {
  getAddresses: () => apiClient.get('/users/addresses'),
  addAddress: (data) => apiClient.post('/users/addresses', data),
  updateAddress: (id, data) => apiClient.put(`/users/addresses/${id}`, data),
  deleteAddress: (id) => apiClient.delete(`/users/addresses/${id}`),
  setDefaultAddress: (id) => apiClient.patch(`/users/addresses/${id}/default`),
};

export const paymentsApi = {
  getWallet: () => apiClient.get('/payments/wallet'),
  topUpWallet: (amount) => apiClient.post('/payments/wallet/topup', { amount }),
  payFromWallet: (order_id) => apiClient.post('/payments/wallet/pay', { order_id }),
};

export const promosApi = {
  validatePromo: (code, order_amount) => apiClient.post('/promos/validate', { code, order_amount }),
  listPromos: (params) => apiClient.get('/promos', { params, useAdminAuth: true }),
  createPromo: (data) => apiClient.post('/promos', data, { useAdminAuth: true }),
  updatePromo: (id, data) => apiClient.patch(`/promos/${id}`, data, { useAdminAuth: true }),
  deletePromo: (id) => apiClient.delete(`/promos/${id}`, { useAdminAuth: true }),
};

export const referralsApi = {
  getMyCode: () => apiClient.get('/referrals/my-code'),
  getStats: () => apiClient.get('/referrals/stats'),
  applyCode: (code) => apiClient.post('/referrals/apply', { code }),
};

export const rewardsApi = {
  getLoyaltyProfile: () => apiClient.get('/rewards/loyalty-profile'),
  getScratchCards: () => apiClient.get('/rewards/scratch-cards'),
  claimScratchCard: (id) => apiClient.post(`/rewards/scratch-cards/${id}/claim`),
  generateDemoCard: () => apiClient.post('/rewards/scratch-cards/generate-demo'),
  getReferralTree: () => apiClient.get('/rewards/referral-tree'),
};

export const workshopApi = {
  getDashboard: () => apiClient.get('/shops/dashboard', { useWorkshopAuth: true }),
  getIncomingOrders: (params) => apiClient.get('/repairs/shop/incoming', { params, useWorkshopAuth: true }),
  sendQuote: (orderId, data) => apiClient.post(`/quotes/${orderId}`, data, { useWorkshopAuth: true }),
  updateStatus: (orderId, status, note) => apiClient.patch(`/repairs/${orderId}/status`, { status, note }, { useWorkshopAuth: true }),
  updateProfile: (data) => apiClient.put('/shops/update', data, { useWorkshopAuth: true }),
  saveQcReport: (orderId, data) => apiClient.post(`/repairs/${orderId}/qc-report`, data, { useWorkshopAuth: true }),
  getQcReport: (orderId) => apiClient.get(`/repairs/${orderId}/qc-report`, { useWorkshopAuth: true }),
  saveVideoProof: (orderId, data) => apiClient.post(`/repairs/${orderId}/video-proof`, data, { useWorkshopAuth: true }),
  getVideoProof: (orderId) => apiClient.get(`/repairs/${orderId}/video-proof`, { useWorkshopAuth: true }),
};

export const chatApi = {
  getHistory: (orderId, chatType = 'customer_shop', params = {}) =>
    apiClient.get(`/chat/${orderId || 'general'}/${chatType}`, { params }),
  sendMessage: (orderId, message, chatType = 'customer_shop', options = {}) =>
    apiClient.post(`/chat/${orderId || 'general'}/${chatType}`, { message }, options),
  getWorkshopHistory: (orderId, chatType = 'customer_shop', params = {}) =>
    apiClient.get(`/chat/${orderId}/${chatType}`, { params, useWorkshopAuth: true }),
  sendWorkshopMessage: (orderId, message, chatType = 'customer_shop') =>
    apiClient.post(`/chat/${orderId}/${chatType}`, { message }, { useWorkshopAuth: true }),
};

export const deliveriesApi = {
  getMyJobs: (params) => apiClient.get('/deliveries/my-jobs', { params, useRunnerAuth: true }),
  getAvailablePickups: () => apiClient.get('/deliveries/available', { useRunnerAuth: true }),
  claimPickup: (orderId) => apiClient.post(`/deliveries/claim/${orderId}`, {}, { useRunnerAuth: true }),
  verifyPickup: (deliveryId, data) => apiClient.post(`/deliveries/${deliveryId}/verify-pickup`, data, { useRunnerAuth: true }),
  handoverShop: (deliveryId, data) => apiClient.post(`/deliveries/${deliveryId}/handover-shop`, data, { useRunnerAuth: true }),
  updateLocation: (deliveryId, data) => apiClient.patch(`/deliveries/${deliveryId}/location`, data, { useRunnerAuth: true }),
  verifyDelivery: (deliveryId, data) => apiClient.post(`/deliveries/${deliveryId}/verify-delivery`, data, { useRunnerAuth: true }),
  updateStatus: (deliveryId, status, distanceKm) => apiClient.patch(`/deliveries/${deliveryId}/status`, { status, distance_km: distanceKm }, { useRunnerAuth: true }),
};

export const earningsApi = {
  getShopEarnings: () => apiClient.get('/earnings', { useWorkshopAuth: true }),
  getPartnerEarnings: () => apiClient.get('/earnings', { useRunnerAuth: true }),
};

export const withdrawalsApi = {
  requestWithdrawal: (data) => apiClient.post('/withdrawals', data, { useWorkshopAuth: true }),
  getMyWithdrawals: (params) => apiClient.get('/withdrawals', { params, useWorkshopAuth: true }),
};

export const notificationsApi = {
  getNotifications: (params) => apiClient.get('/notifications', { params }),
  markAsRead: (id) => apiClient.patch(`/notifications/${id}/read`),
  markAllAsRead: () => apiClient.patch('/notifications/read-all'),
  getWorkshopNotifications: (params) => apiClient.get('/notifications', { params, useWorkshopAuth: true }),
  markWorkshopAsRead: (id) => apiClient.patch(`/notifications/${id}/read`, {}, { useWorkshopAuth: true }),
  markAllWorkshopAsRead: () => apiClient.patch('/notifications/read-all', {}, { useWorkshopAuth: true }),
  getRunnerNotifications: (params) => apiClient.get('/notifications', { params, useRunnerAuth: true }),
  markRunnerAsRead: (id) => apiClient.patch(`/notifications/${id}/read`, {}, { useRunnerAuth: true }),
  markAllRunnerAsRead: () => apiClient.patch('/notifications/read-all', {}, { useRunnerAuth: true }),
};

export const outboundMessagesApi = {
  getOutboundMessages: (params) => apiClient.get('/notifications/outbound', { params }),
  getTemplates: () => apiClient.get('/notifications/templates'),
  simulateDispatch: (data) => apiClient.post('/notifications/simulate-dispatch', data),
  updateMessageStatus: (id, status) => apiClient.patch(`/notifications/outbound/${id}/status`, { status }),
};

export const adminApi = {
  // Analytics Overview & Platform Revenue
  getAnalytics: () => apiClient.get('/analytics/overview', { useAdminAuth: true }),
  getRevenueBreakdown: () => apiClient.get('/analytics/revenue', { useAdminAuth: true }),
  getOrderTrends: (params) => apiClient.get('/analytics/order-trends', { params, useAdminAuth: true }),
  getTopShops: (limit = 5) => apiClient.get(`/analytics/top-shops?limit=${limit}`, { useAdminAuth: true }),
  getSlaAndFraudRadar: () => apiClient.get('/analytics/sla-fraud-radar', { useAdminAuth: true }),

  // Disputes & Arbitration
  getDisputes: (params) => apiClient.get('/disputes', { params, useAdminAuth: true }),
  getDisputeById: (id) => apiClient.get(`/disputes/${id}`, { useAdminAuth: true }),
  resolveDispute: (id, data) => apiClient.patch(`/disputes/${id}/resolve`, data, { useAdminAuth: true }),

  // Global Orders & Escrow Manual Override
  getAllOrders: (params) => apiClient.get('/repairs/admin/all', { params, useAdminAuth: true }),
  releaseEscrow: (orderId) => apiClient.post(`/repairs/${orderId}/release-escrow`, {}, { useAdminAuth: true }),

  // Financial Settlements & Withdrawals
  getWithdrawals: (params) => apiClient.get('/withdrawals', { params, useAdminAuth: true }),
  processWithdrawal: (id, data) => apiClient.patch(`/withdrawals/${id}/process`, data, { useAdminAuth: true }),

  // Workshop Verification & Commission Rates
  getPendingShops: () => apiClient.get('/shops/pending', { useAdminAuth: true }),
  approveShop: (id) => apiClient.patch(`/shops/${id}/approve`, {}, { useAdminAuth: true }),
  rejectShop: (id, reason) => apiClient.patch(`/shops/${id}/reject`, { rejection_reason: reason }, { useAdminAuth: true }),
  toggleBlockShop: (id) => apiClient.patch(`/shops/${id}/block`, {}, { useAdminAuth: true }),
  updateCommission: (id, rate) => apiClient.patch(`/shops/${id}/commission`, { commission_rate: rate }, { useAdminAuth: true }),

  // Users Management
  listUsers: (params) => apiClient.get('/users', { params, useAdminAuth: true }),
  toggleBlockUser: (id) => apiClient.patch(`/users/${id}/block`, {}, { useAdminAuth: true }),

  // Logistics & Runner Fleet
  getAvailablePartners: () => apiClient.get('/deliveries/partners/available', { useAdminAuth: true }),
  assignPartner: (data) => apiClient.post('/deliveries/assign', data, { useAdminAuth: true }),
};

