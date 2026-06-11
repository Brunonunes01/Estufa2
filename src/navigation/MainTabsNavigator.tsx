import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import DashboardScreen from '../screens/Dashboard/DashboardScreen';
import CampoHubScreen from '../screens/Campo/CampoHubScreen';
import EstufasListScreen from '../screens/Estufas/EstufasListScreen';
import InsumosListScreen from '../screens/Insumos/InsumosListScreen';
import VendasListScreen from '../screens/Vendas/VendasListScreen';
import PerfilScreen from '../screens/Perfil/PerfilScreen';
import HidroponiaLotesScreen from '../modules/hidroponia/screens/HidroponiaLotesScreen';
import { useAuth } from '../hooks/useAuth';
import { useThemeMode } from '../hooks/useThemeMode';
import { COLORS, RADIUS } from '../constants/theme';
import { MainTabParamList, RootStackParamList } from './types';
import { buildQuickActions, getMainTabIconMap, getOperationTabTitle, ProductionMode } from './rootNavigatorConfig';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainTabsNavigator = ({
  activeMode,
  uiV2Enabled,
}: {
  activeMode: ProductionMode;
  uiV2Enabled: boolean;
}) => {
  const theme = useThemeMode();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { canWrite } = useAuth();
  const [quickActionsVisible, setQuickActionsVisible] = useState(false);

  const operationEntryScreen =
    activeMode === 'hidroponia' ? HidroponiaLotesScreen : activeMode === 'campo' ? CampoHubScreen : EstufasListScreen;
  const quickActions = buildQuickActions(activeMode, (screen, params) =>
    (navigation as any).navigate(screen, params)
  );

  const handleQuickActionPress = (onPress: () => void) => {
    setQuickActionsVisible(false);
    onPress();
  };

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        id="main-tabs"
        screenOptions={({ route }) => {
          const iconMap = getMainTabIconMap(activeMode);

          return {
            headerShown: false,
            tabBarHideOnKeyboard: true,
            tabBarActiveTintColor: COLORS.primary,
            tabBarInactiveTintColor: theme.textSecondary,
            tabBarLabelStyle: { fontSize: 11, fontWeight: '700', marginBottom: 4 },
            tabBarStyle: {
              height: 66 + insets.bottom,
              paddingTop: 6,
              paddingBottom: Math.max(6, insets.bottom - 2),
              borderTopWidth: 1,
              borderTopColor: theme.border,
              backgroundColor: theme.surfaceBackground,
            },
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name={iconMap[route.name] as any} size={size ?? 22} color={color} />
            ),
          };
        }}
      >
        <Tab.Screen name="InicioTab" component={DashboardScreen} options={{ title: 'Início' }} />
        <Tab.Screen
          name="OperacaoTab"
          component={operationEntryScreen}
          options={{ title: getOperationTabTitle(activeMode) }}
        />
        <Tab.Screen name="EstoqueTab" component={InsumosListScreen} options={{ title: 'Estoque' }} />
        <Tab.Screen name="FinanceiroTab" component={VendasListScreen} options={{ title: 'Financeiro' }} />
        <Tab.Screen name="PerfilTab" component={PerfilScreen} options={{ title: 'Perfil' }} />
      </Tab.Navigator>

      {uiV2Enabled && canWrite ? (
        <>
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => setQuickActionsVisible(true)}
            style={[styles.quickFab, { bottom: Math.max(insets.bottom, 8) + 72 }]}
          >
            <MaterialCommunityIcons name="flash-outline" size={25} color={COLORS.textLight} />
          </TouchableOpacity>

          <Modal visible={quickActionsVisible} transparent animationType="slide" onRequestClose={() => setQuickActionsVisible(false)}>
            <Pressable style={styles.quickSheetBackdrop} onPress={() => setQuickActionsVisible(false)} />
            <View style={[styles.quickSheet, { paddingBottom: Math.max(insets.bottom, 10) }]}>
              <View style={styles.quickSheetHeader}>
                <Text style={styles.quickSheetTitle}>Ações rápidas</Text>
                <TouchableOpacity onPress={() => setQuickActionsVisible(false)}>
                  <MaterialCommunityIcons name="close" size={22} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
              {quickActions.map((action) => (
                <TouchableOpacity key={action.key} style={styles.quickActionRow} onPress={() => handleQuickActionPress(action.onPress)}>
                  <View style={styles.quickActionIcon}>
                    <MaterialCommunityIcons name={action.icon as any} size={18} color={COLORS.primary} />
                  </View>
                  <Text style={styles.quickActionText}>{action.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Modal>
        </>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  quickFab: {
    position: 'absolute',
    right: 18,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.textDark,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.26,
    shadowRadius: 14,
    elevation: 8,
  },
  quickSheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlaySoft,
  },
  quickSheet: {
    marginTop: 'auto',
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  quickSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
  },
  quickSheetTitle: {
    color: COLORS.textPrimary,
    fontWeight: '900',
    fontSize: 16,
  },
  quickActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceMuted,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 9,
  },
  quickActionIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionText: {
    color: COLORS.textPrimary,
    fontWeight: '800',
    fontSize: 14,
  },
});
