/**
 * RepairBee API client — connects to the Express.js backend
 */
import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

// Dynamically resolve dev machine IP from Expo bundler hostUri (works for physical phones & emulators)
const hostUri = Constants.expoConfig?.hostUri;
const hostIp = hostUri ? hostUri.split(':')[0] : '172.19.38.32';

const API_BASE_URL = __DEV__
  ? `http://${hostIp}:3000/api/v1`
  : 'https://repairbee.onrender.com/api/v1';

const API_URL = API_BASE_URL;

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor — attach JWT token
    this.client.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        try {
          const token = await SecureStore.getItemAsync('accessToken');
          if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch (e) {
          // SecureStore not available (web)
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor — handle 401 and refresh token
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = await SecureStore.getItemAsync('refreshToken');
            if (refreshToken) {
              const res = await axios.post(`${API_URL}/auth/refresh-token`, {
                refreshToken,
              });

              const { accessToken, refreshToken: newRefreshToken } = res.data.data;
              await SecureStore.setItemAsync('accessToken', accessToken);
              await SecureStore.setItemAsync('refreshToken', newRefreshToken);

              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed — clear tokens and redirect to login
            await SecureStore.deleteItemAsync('accessToken');
            await SecureStore.deleteItemAsync('refreshToken');
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Auth
  login(email: string, password: string) {
    return this.client.post('/auth/login', { email, password });
  }

  register(data: { name: string; email: string; phone: string; password: string; referralCode?: string }) {
    return this.client.post('/auth/register', { ...data, role: 'customer' });
  }

  googleAuth(idToken: string) {
    return this.client.post('/auth/google', { idToken });
  }

  sendOtp(phone: string) {
    return this.client.post('/auth/send-otp', { phone });
  }

  verifyOtp(phone: string, otp: string) {
    return this.client.post('/auth/verify-otp', { phone, otp });
  }

  forgotPassword(email: string) {
    return this.client.post('/auth/forgot-password', { email });
  }

  resetPassword(data: { token?: string; email?: string; code?: string; password: string }) {
    return this.client.post('/auth/reset-password', data);
  }

  // User Profile
  getProfile() {
    return this.client.get('/users/profile');
  }

  updateProfile(data: Record<string, any>) {
    return this.client.put('/users/profile', data);
  }

  // Addresses
  getAddresses() {
    return this.client.get('/users/addresses');
  }

  addAddress(data: Record<string, any>) {
    return this.client.post('/users/addresses', data);
  }

  updateAddress(id: string, data: Record<string, any>) {
    return this.client.put(`/users/addresses/${id}`, data);
  }

  deleteAddress(id: string) {
    return this.client.delete(`/users/addresses/${id}`);
  }

  setDefaultAddress(id: string) {
    return this.client.patch(`/users/addresses/${id}/default`);
  }

  // Products & Issues
  getProducts() {
    return this.client.get('/products');
  }

  getIssueTypes(productId: string) {
    return this.client.get(`/products/${productId}/issues`);
  }

  // Shops
  getShops(params?: Record<string, any>) {
    return this.client.get('/shops', { params });
  }

  getShopById(id: string) {
    return this.client.get(`/shops/${id}`);
  }

  // Repair Orders
  createRepairOrder(data: any) {
    if (data instanceof FormData) {
      return this.client.post('/repairs', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
    return this.client.post('/repairs', data);
  }

  getMyOrders(params?: Record<string, any>) {
    return this.client.get('/repairs', { params });
  }

  getOrderById(id: string) {
    return this.client.get(`/repairs/${id}`);
  }

  getOrder(id: string) {
    return this.getOrderById(id);
  }

  cancelOrder(id: string) {
    return this.client.patch(`/repairs/${id}/cancel`);
  }

  confirmDelivery(id: string) {
    return this.client.post(`/repairs/${id}/confirm-delivery`);
  }

  // Quotes
  approveQuote(orderId: string) {
    return this.client.patch(`/quotes/${orderId}/approve`);
  }

  rejectQuote(orderId: string) {
    return this.client.patch(`/quotes/${orderId}/reject`);
  }

  // Payments
  createPaymentOrder(orderId: string, method: string = 'upi') {
    return this.client.post('/payments/create-order', { orderId, order_id: orderId, method });
  }

  verifyPayment(data: Record<string, any>) {
    return this.client.post('/payments/verify', data);
  }

  getWallet() {
    return this.client.get('/payments/wallet');
  }

  topUpWallet(amount: number) {
    return this.client.post('/payments/wallet/topup', { amount });
  }

  payFromWallet(orderId: string) {
    return this.client.post('/payments/wallet/pay', { orderId, order_id: orderId });
  }

  // Ratings
  submitRating(orderId: string, data: Record<string, any>) {
    return this.client.post(`/ratings/${orderId}`, data);
  }

  // Chat
  getChatMessages(orderId: string, chatType: string = 'customer_shop') {
    return this.client.get(`/chat/${orderId}/${chatType}`);
  }

  sendChatMessage(orderId: string, chatType: string = 'customer_shop', message: string) {
    return this.client.post(`/chat/${orderId}/${chatType}`, { message });
  }

  // Notifications
  getNotifications() {
    return this.client.get('/notifications');
  }

  markNotificationRead(id: string) {
    return this.client.patch(`/notifications/${id}/read`);
  }

  markAllNotificationsRead() {
    return this.client.patch('/notifications/read-all');
  }

  // Disputes
  raiseDispute(orderId: string, data: FormData) {
    return this.client.post(`/disputes/${orderId}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }

  // Warranty
  getWarrantyInfo(orderId: string) {
    return this.client.get(`/warranty/${orderId}`);
  }

  raiseWarrantyClaim(orderId: string) {
    return this.client.post(`/warranty/${orderId}/claim`);
  }

  // Promos
  applyPromoCode(code: string, orderId: string) {
    return this.client.post('/promos/apply', { code, orderId });
  }

  getActivePromos() {
    return this.client.get('/promos/active');
  }

  // Invoice
  getOrderInvoice(orderId: string) {
    return this.client.get(`/repairs/${orderId}/invoice`);
  }

  // Referrals
  getReferralCode() {
    return this.client.get('/referrals/my-code');
  }

  getReferralStats() {
    return this.client.get('/referrals/stats');
  }

  applyReferralCode(code: string) {
    return this.client.post('/referrals/apply', { code });
  }

  // Rewards
  getRewards() {
    return this.client.get('/rewards');
  }
}

export const api = new ApiClient();
