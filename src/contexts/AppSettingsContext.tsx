import React, { createContext, ReactNode, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  APP_SETTINGS_STORAGE_KEY,
  AppSettings,
  defaultAppSettings,
  mergeAppSettings,
  normalizeAppSettings,
} from './appSettingsHelpers';

interface AppSettingsContextData {
  settings: AppSettings;
  loading: boolean;
  updateSettings: (next: Partial<AppSettings>) => Promise<void>;
}

export const AppSettingsContext = createContext<AppSettingsContextData>({} as AppSettingsContextData);

export const AppSettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<AppSettings>(defaultAppSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const raw = await AsyncStorage.getItem(APP_SETTINGS_STORAGE_KEY);
        setSettings(normalizeAppSettings(raw));
      } catch (error) {
        console.error('Erro ao carregar preferencias locais:', error);
        setSettings(defaultAppSettings);
      } finally {
        setLoading(false);
      }
    };

    void loadSettings();
  }, []);

  const updateSettings = async (next: Partial<AppSettings>) => {
    const previous = settings;
    const updated = mergeAppSettings(previous, next);
    setSettings(updated);

    try {
      await AsyncStorage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      setSettings(previous);
      throw new Error(
        error instanceof Error ? error.message : 'Nao foi possivel salvar as preferencias do app.'
      );
    }
  };

  return (
    <AppSettingsContext.Provider value={{ settings, loading, updateSettings }}>
      {children}
    </AppSettingsContext.Provider>
  );
};
