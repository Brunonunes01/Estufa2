import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuth } from '../../hooks/useAuth';
import { useEstufaPerformance } from '../../hooks/useEstufaPerformance';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/theme';
import { RootStackParamList } from '../../navigation/types';

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const EstufaPerformanceScreen = () => {
  const { user, selectedTenantId } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const targetId = selectedTenantId || user?.uid;

  const { data, isLoading, isFetching, refetch } = useEstufaPerformance(targetId);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isFetching} onRefresh={refetch} colors={[COLORS.primary]} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Performance por Estufa</Text>
        <Text style={styles.subtitle}>ROI e lucratividade acumulada de cada ambiente</Text>
      </View>

      {data?.map((item) => (
        <View key={item.estufaId} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconWrap}>
              <MaterialCommunityIcons name="greenhouse" size={24} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.estufaName}>{item.nome}</Text>
              <Text style={styles.plantiosCount}>{item.plantiosContagem} ciclos registrados</Text>
            </View>
            <View style={[styles.roiBadge, { backgroundColor: item.roi >= 0 ? COLORS.successSoft : COLORS.dangerBg }]}>
              <Text style={[styles.roiText, { color: item.roi >= 0 ? COLORS.success : COLORS.danger }]}>
                {item.roi.toFixed(1)}% ROI
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Receita Total</Text>
              <Text style={[styles.metricValue, { color: COLORS.success }]}>
                {formatCurrency(item.receitaTotal)}
              </Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Custo Total</Text>
              <Text style={[styles.metricValue, { color: COLORS.danger }]}>
                {formatCurrency(item.custoTotal)}
              </Text>
            </View>
          </View>

          <View style={[styles.profitRow, { backgroundColor: item.lucroAcumulado >= 0 ? COLORS.primary + '0A' : COLORS.danger + '0A' }]}>
            <Text style={styles.profitLabel}>Lucro Líquido Acumulado</Text>
            <Text style={[styles.profitValue, { color: item.lucroAcumulado >= 0 ? COLORS.primary : COLORS.danger }]}>
              {formatCurrency(item.lucroAcumulado)}
            </Text>
          </View>
        </View>
      ))}

      {data?.length === 0 && (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="chart-bar" size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>Nenhuma estufa com dados financeiros encontrada.</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { marginBottom: SPACING.xl },
  title: { fontSize: TYPOGRAPHY.h2, fontWeight: '800', color: COLORS.textPrimary },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  estufaName: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  plantiosCount: { fontSize: 12, color: COLORS.textSecondary },
  roiBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.pill },
  roiText: { fontSize: 12, fontWeight: '800' },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.lg },
  metricsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.lg },
  metricItem: { flex: 1 },
  metricLabel: { fontSize: 11, color: COLORS.textMuted, textTransform: 'uppercase', marginBottom: 4 },
  metricValue: { fontSize: 16, fontWeight: '700' },
  profitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
  },
  profitLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  profitValue: { fontSize: 15, fontWeight: '800' },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 16, color: COLORS.textMuted, textAlign: 'center' },
});

export default EstufaPerformanceScreen;
