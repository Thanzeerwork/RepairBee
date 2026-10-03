import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/client';

const RunnerAuthContext = createContext(null);

export const RunnerAuthProvider = ({ children }) => {
  const [runnerUser, setRunnerUser] = useState(() => {
    try {
      const saved = localStorage.getItem('rb_runner_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [runnerToken, setRunnerToken] = useState(() => localStorage.getItem('rb_runner_token') || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loginRunner = async (email, password) => {
    setLoading(true);
    setError('');
    try {
      const res = await authApi.login(email, password);
      const data = res.data || res;
      const accessToken = data.accessToken || data.token;
      const refreshToken = data.refreshToken;
      const user = data.user;

      if (user.role !== 'delivery_partner' && user.role !== 'admin') {
        throw new Error('Access denied. This terminal is strictly for verified RepairBee logistics couriers.');
      }

      setRunnerToken(accessToken);
      setRunnerUser(user);
      localStorage.setItem('rb_runner_token', accessToken);
      if (refreshToken) {
        localStorage.setItem('rb_runner_refresh_token', refreshToken);
      }
      localStorage.setItem('rb_runner_user', JSON.stringify(user));

      return { success: true, user };
    } catch (err) {
      const msg = err?.message || 'Courier login failed';
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  };

  const quickLoginRunner = async () => {
    return loginRunner('partner@repairbee.com', 'Partner@123');
  };

  const logoutRunner = () => {
    setRunnerToken(null);
    setRunnerUser(null);
    localStorage.removeItem('rb_runner_token');
    localStorage.removeItem('rb_runner_refresh_token');
    localStorage.removeItem('rb_runner_user');
  };

  return (
    <RunnerAuthContext.Provider
      value={{
        runnerUser,
        runnerToken,
        loading,
        error,
        isRunnerAuthenticated: !!runnerToken,
        loginRunner,
        quickLoginRunner,
        logoutRunner,
      }}
    >
      {children}
    </RunnerAuthContext.Provider>
  );
};

export const useRunnerAuth = () => {
  const context = useContext(RunnerAuthContext);
  if (!context) {
    throw new Error('useRunnerAuth must be used within a RunnerAuthProvider');
  }
  return context;
};
