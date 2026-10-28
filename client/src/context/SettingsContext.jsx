import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from './AuthContext';

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    store_name: 'Twin Spin Arcade Cafe',
    tagline: 'The Ultimate Gaming Arcade Experience',
    address: 'Phoenix Marketcity, Ground Floor, Kurla West, Mumbai 400070',
    phone: '+91 98765 43210',
    printer_paper_width: '58mm',
    payment_qr_image_url: '',
    receipt_footer_note: 'Thank you for playing at Twin Spin! Tokens are non-refundable.'
  });
  const [loading, setLoading] = useState(false);

  const fetchSettings = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await api.getSettings();
      setSettings(prev => ({ ...prev, ...data }));
    } catch (err) {
      console.warn('Could not load settings:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const updateSettings = async (updates) => {
    const updated = await api.updateSettings(updates);
    setSettings(prev => ({ ...prev, ...updated }));
    return updated;
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, refreshSettings: fetchSettings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within SettingsProvider');
  return context;
}
