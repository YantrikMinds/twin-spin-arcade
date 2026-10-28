import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('twin_spin_user');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const res = await api.login({ username, password });
      localStorage.setItem('twin_spin_token', res.token);
      localStorage.setItem('twin_spin_user', JSON.stringify(res.user));
      setUser(res.user);
      return res.user;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('twin_spin_token');
    localStorage.removeItem('twin_spin_user');
    setUser(null);
  };

  const isAdmin = user?.role === 'admin';
  const isBilling = user?.role === 'billing';

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAdmin, isBilling }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
