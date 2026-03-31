import React, { createContext, ReactNode, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AppSettings {
  darkMode: boolean;
  notifyCritical: boolean;
  notifyDailySummary: boolean;
}

interface AppSettingsContextData {
  settings: AppSettings;
  loading: boolean;
  updateSettings: (next: Partial<AppSettings>) => Promise<void>;
}

const STORAGE_KEY = '@estufa2:app_settings';

const defaultSettings: AppSettings = {
  darkMode: false,
  notifyCritical: true,
  notifyDailySummary: true,
};

export const AppSettingsContext = createContext<AppSettingsContextData>({} as AppSettingsContextData);

export const AppSettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as AppSettings;
          setSettings({ ...defaultSettings, ...parsed });
        }
      } catch (error) {
        console.error('Erro ao carregar preferências locais:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const updateSettings = async (next: Partial<AppSettings>) => {
    const updated = { ...settings, ...next };
    setSettings(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  return (
    <AppSettingsContext.Provider value={{ settings, loading, updateSettings }}>
      {children}
    </AppSettingsContext.Provider>
  );
};
