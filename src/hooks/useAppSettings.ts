import { useContext } from 'react';
import { AppSettingsContext } from '../contexts/AppSettingsContext';

export const useAppSettings = () => {
  const context = useContext(AppSettingsContext);

  if (!context) {
    throw new Error('useAppSettings deve ser usado dentro de AppSettingsProvider');
  }

  return context;
};
