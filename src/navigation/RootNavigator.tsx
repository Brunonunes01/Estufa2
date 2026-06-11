import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, Dimensions, Platform, StatusBar, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useAuth } from '../hooks/useAuth';
import { useAppSettings } from '../hooks/useAppSettings';
import { useThemeMode } from '../hooks/useThemeMode';
import { COLORS, RADIUS } from '../constants/theme';
import { startOfflineSyncListener, syncPendingDataNow } from '../services/offline/syncService';
import { OfflineBanner } from './OfflineBanner';
import { AuthNavigator } from './AuthNavigator';
import { AppStackNavigator } from './AppStackNavigator';

export const RootNavigator = () => {
  const { user, loading } = useAuth();
  const { settings } = useAppSettings();
  const mode = useThemeMode();

  const isWeb = Platform.OS === 'web';
  const screenWidth = Dimensions.get('window').width;
  const isWideScreen = isWeb && screenWidth > 500;

  useEffect(() => {
    const stop = startOfflineSyncListener();
    return () => stop();
  }, []);

  useEffect(() => {
    if (user) {
      void syncPendingDataNow();
    }
  }, [user]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <MaterialCommunityIcons name="greenhouse" size={80} color={COLORS.primary} style={{ marginBottom: 20, opacity: 0.9 }} />
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>CARREGANDO SGE...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.outerContainer, { backgroundColor: isWideScreen ? COLORS.backgroundAlt : mode.pageBackground }]}>
      <View
        style={[
          styles.innerContainer,
          {
            width: isWideScreen ? 500 : '100%',
            elevation: isWideScreen ? 10 : 0,
            borderRadius: isWideScreen ? RADIUS.xl : 0,
            borderWidth: isWideScreen ? 1 : 0,
            backgroundColor: mode.pageBackground,
            overflow: isWideScreen ? 'hidden' : 'visible',
          },
        ]}
      >
        <OfflineBanner />
        <NavigationContainer>
          {user ? (
            <AppStackNavigator activeMode={settings.activeProductionMode} uiV2Enabled={settings.uiV2Enabled} />
          ) : (
            <AuthNavigator />
          )}
        </NavigationContainer>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
    shadowColor: COLORS.textDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 20,
    color: COLORS.textSecondary,
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 1.5,
  },
});
