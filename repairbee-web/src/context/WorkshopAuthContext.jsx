import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi, workshopApi } from '../api/client';

const WorkshopAuthContext = createContext(null);

export const WorkshopAuthProvider = ({ children }) => {
  const [workshopUser, setWorkshopUser] = useState(() => {
    try {
      const saved = localStorage.getItem('rb_workshop_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [workshopToken, setWorkshopToken] = useState(() => localStorage.getItem('rb_workshop_token') || null);
  const [shopDetails, setShopDetails] = useState(null);
  const [shopStats, setShopStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchShopDashboard = async () => {
    if (!workshopToken) return;
    try {
      const res = await workshopApi.getDashboard();
      if (res?.data) {
        setShopDetails(res.data.shop);
        setShopStats(res.data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch shop dashboard:', err);
    }
  };

  useEffect(() => {
    if (workshopToken) {
      fetchShopDashboard();
    }
  }, [workshopToken]);

  const loginWorkshop = async (email, password) => {
    setLoading(true);
    setError('');
    try {
      const res = await authApi.login(email, password);
      const data = res.data || res;
      const accessToken = data.accessToken || data.token;
      const refreshToken = data.refreshToken;
      const user = data.user;

      if (user.role !== 'shop_owner' && user.role !== 'technician') {
        throw new Error('Access denied. This portal requires workshop partner credentials.');
      }

      setWorkshopToken(accessToken);
      setWorkshopUser(user);
      localStorage.setItem('rb_workshop_token', accessToken);
      if (refreshToken) {
        localStorage.setItem('rb_workshop_refresh_token', refreshToken);
      }
      localStorage.setItem('rb_workshop_user', JSON.stringify(user));

      // Fetch dashboard
      const dashRes = await workshopApi.getDashboard();
      if (dashRes?.data) {
        setShopDetails(dashRes.data.shop);
        setShopStats(dashRes.data.stats);
      }

      return { success: true, user };
    } catch (err) {
      const msg = err?.message || 'Workshop login failed';
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  };

  const quickLoginWorkshop = async () => {
    return loginWorkshop('shopowner@repairbee.com', 'Shop@123');
  };

  const logoutWorkshop = () => {
    setWorkshopToken(null);
    setWorkshopUser(null);
    setShopDetails(null);
    setShopStats(null);
    localStorage.removeItem('rb_workshop_token');
    localStorage.removeItem('rb_workshop_refresh_token');
    localStorage.removeItem('rb_workshop_user');
  };

  return (
    <WorkshopAuthContext.Provider
      value={{
        workshopUser,
        workshopToken,
        shopDetails,
        shopStats,
        loading,
        error,
        isWorkshopAuthenticated: !!workshopToken,
        loginWorkshop,
        quickLoginWorkshop,
        logoutWorkshop,
        refreshShopDashboard: fetchShopDashboard
      }}
    >
      {children}
    </WorkshopAuthContext.Provider>
  );
};

export const useWorkshopAuth = () => {
  const context = useContext(WorkshopAuthContext);
  if (!context) {
    throw new Error('useWorkshopAuth must be used within a WorkshopAuthProvider');
  }
  return context;
};
