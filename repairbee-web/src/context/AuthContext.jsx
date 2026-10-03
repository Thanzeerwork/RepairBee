import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi, apiClient } from '../api/client';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('rb_customer_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('rb_customer_token') || null);
  const [loading, setLoading] = useState(false);
  const [authMethod, setAuthMethod] = useState(() => localStorage.getItem('rb_auth_method') || 'local'); // 'supabase' | 'local'

  // Sync Supabase session state on load & listen for auth changes (e.g. OAuth redirects)
  useEffect(() => {
    let mounted = true;

    const initSupabaseSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.access_token) {
          const supabaseToken = session.access_token;
          // Sync with backend to get database user record
          try {
            const res = await apiClient.get('/users/profile', {
              headers: { Authorization: `Bearer ${supabaseToken}` },
            });
            const dbUser = res.data?.data || res.data || res;
            if (mounted && dbUser) {
              setToken(supabaseToken);
              setUser(dbUser);
              setAuthMethod('supabase');
              localStorage.setItem('rb_customer_token', supabaseToken);
              localStorage.setItem('rb_customer_user', JSON.stringify(dbUser));
              localStorage.setItem('rb_auth_method', 'supabase');
            }
          } catch (err) {
            console.warn('Backend user profile sync pending:', err.message);
          }
        }
      } catch (err) {
        console.error('Supabase session init error:', err);
      }
    };

    initSupabaseSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        const supabaseToken = session.access_token;
        try {
          const res = await apiClient.get('/users/profile', {
            headers: { Authorization: `Bearer ${supabaseToken}` },
          });
          const dbUser = res.data?.data || res.data || res;
          if (mounted && dbUser) {
            setToken(supabaseToken);
            setUser(dbUser);
            setAuthMethod('supabase');
            localStorage.setItem('rb_customer_token', supabaseToken);
            localStorage.setItem('rb_customer_user', JSON.stringify(dbUser));
            localStorage.setItem('rb_auth_method', 'supabase');
          }
        } catch (err) {
          console.warn('Auth state change profile fetch error:', err.message);
        }
      } else if (event === 'SIGNED_OUT') {
        if (authMethod === 'supabase') {
          logout();
        }
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  /**
   * Supabase Password Login
   */
  const signInWithSupabase = async (email, password) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new Error(error.message);
      }

      const supabaseToken = data.session.access_token;
      // Sync with RepairBee backend database
      const profileRes = await apiClient.get('/users/profile', {
        headers: { Authorization: `Bearer ${supabaseToken}` },
      });
      const dbUser = profileRes.data?.data || profileRes.data || profileRes;

      setToken(supabaseToken);
      setUser(dbUser);
      setAuthMethod('supabase');
      localStorage.setItem('rb_customer_token', supabaseToken);
      localStorage.setItem('rb_customer_user', JSON.stringify(dbUser));
      localStorage.setItem('rb_auth_method', 'supabase');

      return { success: true, user: dbUser };
    } catch (err) {
      console.error('Supabase login error:', err);
      return { success: false, message: err.message || 'Supabase login failed' };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Supabase Signup
   */
  const signUpWithSupabase = async (email, password, metadata = {}) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: metadata.name,
            phone: metadata.phone,
            role: metadata.role || 'customer',
          },
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.session) {
        const supabaseToken = data.session.access_token;
        const profileRes = await apiClient.get('/users/profile', {
          headers: { Authorization: `Bearer ${supabaseToken}` },
        });
        const dbUser = profileRes.data?.data || profileRes.data || profileRes;

        setToken(supabaseToken);
        setUser(dbUser);
        setAuthMethod('supabase');
        localStorage.setItem('rb_customer_token', supabaseToken);
        localStorage.setItem('rb_customer_user', JSON.stringify(dbUser));
        localStorage.setItem('rb_auth_method', 'supabase');

        return { success: true, user: dbUser, needsVerification: false };
      }

      return {
        success: true,
        user: data.user,
        needsVerification: true,
        message: 'Account registered! Please check your email to verify your account.',
      };
    } catch (err) {
      console.error('Supabase signup error:', err);
      return { success: false, message: err.message || 'Supabase signup failed' };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Supabase Google OAuth
   */
  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('Google OAuth error:', err);
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Native RepairBee Backend Login (Preserved for Demo / Quick Login)
   */
  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      const data = res.data || res;
      const accessToken = data.accessToken || data.token;
      const refreshToken = data.refreshToken;
      const userData = data.user;

      setToken(accessToken);
      setUser(userData);
      setAuthMethod('local');
      localStorage.setItem('rb_customer_token', accessToken);
      localStorage.setItem('rb_auth_method', 'local');
      if (refreshToken) {
        localStorage.setItem('rb_customer_refresh_token', refreshToken);
      }
      localStorage.setItem('rb_customer_user', JSON.stringify(userData));
      return { success: true, user: userData };
    } catch (err) {
      console.error('Customer login error:', err);
      return { success: false, message: err?.message || 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Native RepairBee Backend Register
   */
  const register = async (formData) => {
    setLoading(true);
    try {
      const res = await authApi.register({ ...formData, role: 'customer' });
      const data = res.data || res;
      const accessToken = data.accessToken || data.token;
      const refreshToken = data.refreshToken;
      const userData = data.user;

      setToken(accessToken);
      setUser(userData);
      setAuthMethod('local');
      localStorage.setItem('rb_customer_token', accessToken);
      localStorage.setItem('rb_auth_method', 'local');
      if (refreshToken) {
        localStorage.setItem('rb_customer_refresh_token', refreshToken);
      }
      localStorage.setItem('rb_customer_user', JSON.stringify(userData));
      return { success: true, user: userData };
    } catch (err) {
      console.error('Customer registration error:', err);
      return { success: false, message: err?.message || 'Registration failed' };
    } finally {
      setLoading(false);
    }
  };

  const quickLoginCustomer = () => {
    return login('customer@repairbee.com', 'Customer@123');
  };

  const refreshSession = async () => {
    if (authMethod === 'supabase') {
      const { data: { session } } = await supabase.auth.refreshSession();
      if (session) {
        setToken(session.access_token);
        localStorage.setItem('rb_customer_token', session.access_token);
        return { success: true };
      }
    }
    const refreshToken = localStorage.getItem('rb_customer_refresh_token');
    if (refreshToken) {
      try {
        const res = await authApi.refreshToken(refreshToken);
        const data = res.data || res;
        if (data.accessToken) {
          setToken(data.accessToken);
          localStorage.setItem('rb_customer_token', data.accessToken);
          if (data.refreshToken) {
            localStorage.setItem('rb_customer_refresh_token', data.refreshToken);
          }
          return { success: true };
        }
      } catch (err) {
        console.warn('Customer refresh token failed, attempting silent login', err);
      }
    }
    return quickLoginCustomer();
  };

  const logout = async () => {
    if (authMethod === 'supabase') {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Supabase signOut error:', e);
      }
    }
    setToken(null);
    setUser(null);
    localStorage.removeItem('rb_customer_token');
    localStorage.removeItem('rb_customer_refresh_token');
    localStorage.removeItem('rb_customer_user');
    localStorage.removeItem('rb_auth_method');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        authMethod,
        loading,
        login,
        register,
        signInWithSupabase,
        signUpWithSupabase,
        signInWithGoogle,
        logout,
        quickLoginCustomer,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
