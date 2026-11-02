import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const token = localStorage.getItem('queueless_token');
      if (token) {
        try {
          const res = await api.getMe();
          if (res.success && res.data) {
            setUser(res.data);
          } else {
            localStorage.removeItem('queueless_token');
          }
        } catch (err) {
          console.error('Failed to restore session:', err);
          localStorage.removeItem('queueless_token');
        }
      }
      setLoading(false);
    }
    loadUser();
  }, []);

  const login = async (email, password) => {
    const res = await api.login({ email, password });
    if (res.success && res.data) {
      localStorage.setItem('queueless_token', res.data.token);
      setUser(res.data.user);
      return res.data.user;
    }
    throw new Error(res.error || 'Login failed');
  };

  const register = async (payload) => {
    const res = await api.register(payload);
    if (res.success && res.data) {
      localStorage.setItem('queueless_token', res.data.token);
      setUser(res.data.user);
      return res.data.user;
    }
    throw new Error(res.error || 'Registration failed');
  };

  const logout = () => {
    localStorage.removeItem('queueless_token');
    setUser(null);
  };

  const refreshUser = async (explicitToken = null) => {
    if (explicitToken) {
      localStorage.setItem('queueless_token', explicitToken);
    }
    const token = localStorage.getItem('queueless_token');
    if (token) {
      try {
        const res = await api.getMe();
        if (res.success && res.data) {
          setUser(res.data);
          return res.data;
        }
      } catch (err) {
        console.error('Failed to reload user session:', err);
      }
    }
    return null;
  };

  // Demo 1-click login switch
  const quickLogin = async (roleType) => {
    let email = '';
    let pass = '';
    if (roleType === 'APPLICATION_MANAGER') {
      email = 'admin@queueless.com';
      pass = 'admin123';
    } else if (roleType === 'BUSINESS_USER') {
      email = 'dr.sharma@apexclinic.com';
      pass = 'business123';
    } else {
      email = 'rahul.verma@example.com';
      pass = 'customer123';
    }
    return await login(email, pass);
  };

  const activeBusiness = user?.memberships?.[0]?.business || null;

  const isSubscriptionActive = (() => {
    if (!user || user.role !== 'BUSINESS_USER') return true;
    if (!activeBusiness) return false;
    const sub = activeBusiness.subscription;
    if (!sub) return false;
    if (!['ACTIVE', 'TRIAL'].includes(sub.status)) return false;
    if (sub.endDate && new Date(sub.endDate).getTime() <= Date.now()) return false;
    return true;
  })();

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        activeBusiness,
        isSubscriptionActive,
        loading,
        login,
        register,
        logout,
        quickLogin,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
