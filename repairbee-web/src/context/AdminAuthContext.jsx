import React, { createContext, useContext, useState } from 'react';
import { authApi } from '../api/client';

const AdminAuthContext = createContext(null);

export const AdminAuthProvider = ({ children }) => {
  const [adminUser, setAdminUser] = useState(() => {
    try {
      const saved = localStorage.getItem('rb_admin_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('rb_admin_token') || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loginAdmin = async (email, password) => {
    setLoading(true);
    setError('');
    try {
      const res = await authApi.login(email, password);
      const data = res.data || res;
      const accessToken = data.accessToken || data.token;
      const refreshToken = data.refreshToken;
      const user = data.user;

      if (user.role !== 'admin') {
        throw new Error('Access denied. Administrator privileges required.');
      }

      setAdminToken(accessToken);
      setAdminUser(user);
      localStorage.setItem('rb_admin_token', accessToken);
      if (refreshToken) {
        localStorage.setItem('rb_admin_refresh_token', refreshToken);
      }
      localStorage.setItem('rb_admin_user', JSON.stringify(user));

      return { success: true, user };
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Admin authentication failed';
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  };

  const quickLoginAdmin = async () => {
    return loginAdmin('admin@repairbee.com', 'Admin@123');
  };

  const logoutAdmin = () => {
    setAdminToken(null);
    setAdminUser(null);
    localStorage.removeItem('rb_admin_token');
    localStorage.removeItem('rb_admin_refresh_token');
    localStorage.removeItem('rb_admin_user');
  };

  return (
    <AdminAuthContext.Provider
      value={{
        adminUser,
        adminToken,
        isAdminAuthenticated: !!adminToken,
        loading,
        error,
        loginAdmin,
        quickLoginAdmin,
        logoutAdmin,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};
