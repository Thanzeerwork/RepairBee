/**
 * Auth Store — Zustand state management for authentication
 */
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { api } from '../api/client';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  profilePicUrl?: string;
  walletBalance: number;
  referralCode?: string;
  isActive: boolean;
  createdAt: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; phone: string; password: string; referralCode?: string }) => Promise<void>;
  googleAuth: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  loadSession: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
  clearError: () => void;
}

function normalizeUser(raw: any): User {
  if (!raw) return raw;
  return {
    ...raw,
    walletBalance: raw.walletBalance !== undefined ? raw.walletBalance : Number(raw.wallet_balance || 0),
    referralCode: raw.referralCode || raw.referral_code,
    profilePicUrl: raw.profilePicUrl || raw.profile_pic_url,
    isActive: raw.isActive !== undefined ? raw.isActive : (raw.is_active ?? true),
  };
}

function extractErrorMessage(err: any, fallback: string): string {
  if (err.response?.data?.errors && Array.isArray(err.response.data.errors) && err.response.data.errors.length > 0) {
    const first = err.response.data.errors[0];
    return first.message || first.msg || fallback;
  }
  if (err.response?.data?.message) {
    return err.response.data.message;
  }
  if (err.message && err.message.includes('Network Error')) {
    return 'Unable to reach backend server. Please ensure phone and PC are on the same Wi-Fi.';
  }
  return err.message || fallback;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.login(email, password);
      const { user, accessToken, refreshToken } = res.data.data;

      await SecureStore.setItemAsync('accessToken', accessToken);
      await SecureStore.setItemAsync('refreshToken', refreshToken);

      set({ user: normalizeUser(user), isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      const message = extractErrorMessage(err, 'Login failed. Please try again.');
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.register(data);
      const { user, accessToken, refreshToken } = res.data.data;

      await SecureStore.setItemAsync('accessToken', accessToken);
      await SecureStore.setItemAsync('refreshToken', refreshToken);

      set({ user: normalizeUser(user), isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      const message = extractErrorMessage(err, 'Registration failed. Please try again.');
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  googleAuth: async (idToken) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.googleAuth(idToken);
      const { user, accessToken, refreshToken } = res.data.data;

      await SecureStore.setItemAsync('accessToken', accessToken);
      await SecureStore.setItemAsync('refreshToken', refreshToken);

      set({ user: normalizeUser(user), isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      const message = err.response?.data?.message || 'Google sign-in failed.';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    set({ user: null, isAuthenticated: false, isLoading: false, error: null });
  },

  loadSession: async () => {
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      if (token) {
        const res = await api.getProfile();
        set({ user: normalizeUser(res.data.data), isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      // Token expired or invalid
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
      set({ isLoading: false });
    }
  },

  refreshProfile: async () => {
    try {
      const res = await api.getProfile();
      if (res.data?.data) {
        set({ user: normalizeUser(res.data.data) });
      }
    } catch {
      // Keep existing user if request fails
    }
  },

  updateUser: (data) => {
    set((state) => ({
      user: state.user ? normalizeUser({ ...state.user, ...data }) : null,
    }));
  },

  clearError: () => set({ error: null }),
}));
