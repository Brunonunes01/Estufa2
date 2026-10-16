export interface AppSettings {
  darkMode: boolean;
  notifyCritical: boolean;
  notifyDailySummary: boolean;
  activeProductionMode: 'ciclo_longo' | 'campo';
  uiV2Enabled: boolean;
  useCycleBoxWeightProfiles: boolean;
}

export const APP_SETTINGS_STORAGE_KEY = '@estufa2:app_settings';
export const ENABLED_PRODUCTION_MODE = 'ciclo_longo' as const;

export const defaultAppSettings: AppSettings = {
  darkMode: false,
  notifyCritical: true,
  notifyDailySummary: true,
  activeProductionMode: ENABLED_PRODUCTION_MODE,
  uiV2Enabled: true,
  useCycleBoxWeightProfiles: false,
};

type LegacySettingsShape = Partial<AppSettings> & {
  productionProfiles?: Record<string, unknown>;
};

const toBoolean = (value: unknown, fallback: boolean) =>
  typeof value === 'boolean' ? value : fallback;

export const normalizeAppSettings = (raw: string | null): AppSettings => {
  if (!raw) {
    return defaultAppSettings;
  }

  const parsed = JSON.parse(raw) as LegacySettingsShape;
  return {
    darkMode: toBoolean(parsed.darkMode, defaultAppSettings.darkMode),
    notifyCritical: toBoolean(
      parsed.notifyCritical,
      defaultAppSettings.notifyCritical
    ),
    notifyDailySummary: toBoolean(
      parsed.notifyDailySummary,
      defaultAppSettings.notifyDailySummary
    ),
    activeProductionMode: ENABLED_PRODUCTION_MODE,
    uiV2Enabled: toBoolean(parsed.uiV2Enabled, defaultAppSettings.uiV2Enabled),
    useCycleBoxWeightProfiles: toBoolean(
      parsed.useCycleBoxWeightProfiles,
      defaultAppSettings.useCycleBoxWeightProfiles
    ),
  };
};

export const mergeAppSettings = (
  current: AppSettings,
  next: Partial<AppSettings>
): AppSettings => ({
  ...current,
  ...next,
  activeProductionMode: ENABLED_PRODUCTION_MODE,
});
