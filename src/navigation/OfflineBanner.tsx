import React, { useEffect, useRef, useState } from 'react';
import { Platform, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { COLORS } from '../constants/theme';

export const OfflineBanner = () => {
  const netInfo = useNetInfo();
  const [showReconnected, setShowReconnected] = useState(false);
  const prevConnection = useRef<boolean | null>(null);

  useEffect(() => {
    if (typeof netInfo.isConnected !== 'boolean') return undefined;

    if (prevConnection.current === false && netInfo.isConnected === true) {
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 2800);
      prevConnection.current = netInfo.isConnected;
      return () => clearTimeout(timer);
    }

    prevConnection.current = netInfo.isConnected;
    return undefined;
  }, [netInfo.isConnected]);

  if (netInfo.type !== 'unknown' && netInfo.isConnected === false) {
    return (
      <SafeAreaView style={{ backgroundColor: COLORS.warning }}>
        <View style={styles.bannerContainer}>
          <MaterialCommunityIcons name="wifi-off" size={18} color={COLORS.textLight} style={styles.icon} />
          <Text style={styles.bannerText}>
            Sem conexão. Trabalhando offline. Os dados serão sincronizados quando a internet voltar.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (showReconnected) {
    return (
      <SafeAreaView style={{ backgroundColor: COLORS.success }}>
        <View style={[styles.bannerContainer, styles.onlineBannerContainer]}>
          <MaterialCommunityIcons name="wifi-check" size={18} color={COLORS.textLight} style={styles.icon} />
          <Text style={styles.bannerText}>Conexão restabelecida. Sincronizando dados...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  bannerContainer: {
    backgroundColor: COLORS.warning,
    paddingVertical: 10,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ? StatusBar.currentHeight + 5 : 10) : 10,
  },
  onlineBannerContainer: {
    backgroundColor: COLORS.success,
  },
  icon: {
    marginRight: 8,
  },
  bannerText: {
    color: COLORS.textLight,
    fontWeight: 'bold',
    fontSize: 13,
    textAlign: 'center',
  },
});
