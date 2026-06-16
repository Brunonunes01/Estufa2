import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS } from '../../../constants/theme';

interface DashboardTenantSwitcherProps {
  tenants: any[];
  selectedTenantId: string | null | undefined;
  onChangeTenant: (id: string) => void;
  theme: any;
}

const DashboardTenantSwitcher = ({
  tenants,
  selectedTenantId,
  onChangeTenant,
  theme,
}: DashboardTenantSwitcherProps) => {
  if (tenants.length <= 1) return null;

  const activeTenant = tenants.find((tenant) => tenant.uid === selectedTenantId) || tenants[0];

  return (
    <View style={[styles.container, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.textSecondary }]}>Conta Ativa</Text>
        <Text style={[styles.hint, { color: theme.textSecondary }]}>Sua escolha fica salva</Text>
      </View>
      <View style={[styles.activeCard, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
        <View style={styles.activeTopRow}>
          <View style={[styles.activeIconBox, { backgroundColor: theme.surfaceBackground }]}>
            <MaterialCommunityIcons name="greenhouse" size={18} color={COLORS.info} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.activeName, { color: theme.textPrimary }]}>{activeTenant?.name}</Text>
            <Text style={[styles.activeMeta, { color: theme.textSecondary }]}>
              {activeTenant?.type === 'shared'
                ? `Acesso compartilhado${activeTenant?.ownerName ? ` por ${activeTenant.ownerName}` : ''}`
                : 'Sua conta principal'}
            </Text>
          </View>
          <View style={[styles.activeBadge, { backgroundColor: theme.infoSoft }]}>
            <Text style={styles.activeBadgeText}>Ativa</Text>
          </View>
        </View>
      </View>
      <View style={styles.list}>
        {tenants.map((tenant) => {
          const isActive = tenant.uid === selectedTenantId;
          const scopeLabel = tenant.type === 'shared' ? 'Compartilhada' : 'Principal';
          
          return (
            <TouchableOpacity
              key={tenant.uid}
              style={[
                styles.chip,
                {
                  borderColor: isActive ? COLORS.info : theme.border,
                  backgroundColor: isActive ? theme.infoSoft : theme.surfaceMuted,
                },
              ]}
              onPress={() => onChangeTenant(tenant.uid)}
              activeOpacity={0.7}
            >
              <View style={styles.chipContent}>
                <View
                  style={[
                    styles.scopeBadge,
                    {
                      backgroundColor: isActive ? COLORS.info : theme.surfaceBackground,
                      borderColor: isActive ? COLORS.info : theme.border,
                    },
                  ]}
                >
                  <Text style={[styles.scopeText, { color: isActive ? '#FFFFFF' : theme.textSecondary }]}>
                    {scopeLabel}
                  </Text>
                </View>
                <View style={styles.textWrap}>
                  <Text style={[styles.name, { color: isActive ? COLORS.info : theme.textPrimary }]}>
                    {tenant.name}
                  </Text>
                  <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                    {tenant.type === 'shared'
                      ? tenant.ownerName || 'Conta compartilhada'
                      : 'Conta principal'}
                  </Text>
                </View>
              </View>
              {isActive && <MaterialCommunityIcons name="check-circle" size={16} color={COLORS.info} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 16,
    ...SHADOWS.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hint: {
    fontSize: 11,
    fontWeight: '700',
  },
  list: {
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 8,
  },
  chipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  scopeBadge: {
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  scopeText: {
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  name: {
    fontSize: 13,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  textWrap: {
    flex: 1,
  },
  activeCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  activeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  activeIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeName: {
    fontSize: 15,
    fontWeight: '900',
  },
  activeMeta: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  activeBadge: {
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  activeBadgeText: {
    color: COLORS.info,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
});

export default React.memo(DashboardTenantSwitcher);
