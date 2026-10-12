/**
 * Auth Store — Zustand state management for authentication
 */
import { create } from 'zustand';
import { storage } from '../utils/storage';
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
      const normalized = normalizeUser(user);

      await Promise.all([
        storage.setItem('accessToken', accessToken),
        storage.setItem('refreshToken', refreshToken),
        storage.setItem('savedUser', JSON.stringify(normalized)),
      ]);

      set({ user: normalized, isAuthenticated: true, isLoading: false });
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
      const normalized = normalizeUser(user);

      await Promise.all([
        storage.setItem('accessToken', accessToken),
        storage.setItem('refreshToken', refreshToken),
        storage.setItem('savedUser', JSON.stringify(normalized)),
      ]);

      set({ user: normalized, isAuthenticated: true, isLoading: false });
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
      const normalized = normalizeUser(user);

      await Promise.all([
        storage.setItem('accessToken', accessToken),
        storage.setItem('refreshToken', refreshToken),
        storage.setItem('savedUser', JSON.stringify(normalized)),
      ]);

      set({ user: normalized, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      const message = err.response?.data?.message || 'Google sign-in failed.';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  logout: async () => {
    await Promise.all([
      storage.deleteItem('accessToken'),
      storage.deleteItem('refreshToken'),
      storage.deleteItem('savedUser'),
    ]);
    set({ user: null, isAuthenticated: false, isLoading: false, error: null });
  },

  /**
   * Offline-first session restoration:
   * Instantly hydrates the saved user from storage so the app opens immediately
   * without requiring login or waiting for network roundtrips.
   */
  loadSession: async () => {
    try {
      const [token, savedUserStr] = await Promise.all([
        storage.getItem('accessToken'),
        storage.getItem('savedUser'),
      ]);

      if (token && savedUserStr) {
        try {
          const cachedUser = normalizeUser(JSON.parse(savedUserStr));
          // Instantly mark user as authenticated so UI is ready immediately
          set({ user: cachedUser, isAuthenticated: true, isLoading: false });
        } catch {
          set({ isAuthenticated: true, isLoading: false });
        }

        // Revalidate profile in background (non-blocking)
        try {
          const res = await api.getProfile();
          if (res.data?.data) {
            const freshUser = normalizeUser(res.data.data);
            set({ user: freshUser });
            await storage.setItem('savedUser', JSON.stringify(freshUser));
          }
        } catch (profileErr: any) {
          // If token explicitly expired (401), try refresh token
          if (profileErr.response?.status === 401) {
            const refreshToken = await storage.getItem('refreshToken');
            if (refreshToken) {
              try {
                const refreshRes = await api.refreshToken(refreshToken);
                const { accessToken: newToken, refreshToken: newRefresh } = refreshRes.data.data;
                await storage.setItem('accessToken', newToken);
                if (newRefresh) await storage.setItem('refreshToken', newRefresh);

                const retryProfile = await api.getProfile();
                if (retryProfile.data?.data) {
                  const freshUser = normalizeUser(retryProfile.data.data);
                  set({ user: freshUser });
                  await storage.setItem('savedUser', JSON.stringify(freshUser));
                }
                return;
              } catch {
                // Refresh also failed -> truly expired
                await Promise.all([
                  storage.deleteItem('accessToken'),
                  storage.deleteItem('refreshToken'),
                  storage.deleteItem('savedUser'),
                ]);
                set({ user: null, isAuthenticated: false, isLoading: false });
                return;
              }
            }
          }
          // Network errors / 500s: Do NOT log out, keep the cached user authenticated!
        }
      } else if (token) {
        // Token exists but no cached user string: fetch profile
        try {
          const res = await api.getProfile();
          if (res.data?.data) {
            const freshUser = normalizeUser(res.data.data);
            await storage.setItem('savedUser', JSON.stringify(freshUser));
            set({ user: freshUser, isAuthenticated: true, isLoading: false });
          } else {
            set({ isLoading: false });
          }
        } catch {
          // If offline, keep token
          set({ isAuthenticated: true, isLoading: false });
        }
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  refreshProfile: async () => {
    try {
      const res = await api.getProfile();
      if (res.data?.data) {
        const freshUser = normalizeUser(res.data.data);
        set({ user: freshUser });
        await storage.setItem('savedUser', JSON.stringify(freshUser));
      }
    } catch {
      // Keep existing user if request fails
    }
  },

  updateUser: (data) => {
    set((state) => {
      const updated = state.user ? normalizeUser({ ...state.user, ...data }) : null;
      if (updated) {
        storage.setItem('savedUser', JSON.stringify(updated)).catch(() => {});
      }
      return { user: updated };
    });
  },

  clearError: () => set({ error: null }),
}));
