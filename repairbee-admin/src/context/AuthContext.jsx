import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('rb_admin_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('rb_admin_token') || null);
  const [loading, setLoading] = useState(false);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      // Backend returns { success: true, data: { accessToken, user } }
      const data = res.data || res;
      const accessToken = data.accessToken || data.token;
      const userData = data.user || { name: 'Super Admin', email, role: 'admin' };

      setToken(accessToken);
      setUser(userData);
      localStorage.setItem('rb_admin_token', accessToken);
      localStorage.setItem('rb_admin_user', JSON.stringify(userData));
      return { success: true, user: userData };
    } catch (err) {
      console.error('Login error:', err);
      return { 
        success: false, 
        message: err.message || 'Invalid credentials or server unavailable' 
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('rb_admin_token');
    localStorage.removeItem('rb_admin_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
