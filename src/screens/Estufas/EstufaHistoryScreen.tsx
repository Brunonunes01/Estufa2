import React from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useAuth } from '../../hooks/useAuth';
import { useEstufaDetailData } from '../../hooks/queries/useEstufaDetailData';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/theme';
import { Plantio } from '../../types/domain';

const EstufaHistoryScreen = ({ route, navigation }: any) => {
  const { user, selectedTenantId } = useAuth();
  const estufaId = route?.params?.estufaId;
  const targetId = selectedTenantId || user?.uid;

  const { data, isLoading, isFetching, refetch } = useEstufaDetailData(estufaId, targetId);
  const estufa = data?.estufa || null;
  const plantios: Plantio[] = data?.plantios || [];
  const loading = isLoading || isFetching;

  if (loading) {
    return <ActivityIndicator size="large" style={styles.centered} color={COLORS.primary} />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} colors={[COLORS.primary]} />}
    >
      <View style={styles.headerCard}>
        <Text style={styles.headerTitle}>Histórico da Estufa</Text>
        <Text style={styles.headerSub}>{estufa?.nome || 'Estufa'}</Text>
      </View>

      <TouchableOpacity style={styles.newCycleBtn} onPress={() => navigation.navigate('PlantioForm', { estufaId })}>
        <MaterialCommunityIcons name="plus" size={18} color={COLORS.textLight} />
        <Text style={styles.newCycleText}>Novo Ciclo</Text>
      </TouchableOpacity>

      {plantios.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Nenhum ciclo registrado nesta estufa.</Text>
        </View>
      ) : (
        plantios.map((plantio) => (
          <TouchableOpacity
            key={plantio.id}
            style={styles.plantioItem}
            onPress={() => navigation.navigate('PlantioDetail', { plantioId: plantio.id })}
          >
            <View style={styles.plantioIcon}>
              <MaterialCommunityIcons
                name="sprout"
                size={22}
                color={plantio.status === 'finalizado' || plantio.status === 'cancelado' ? COLORS.c9CA3AF : COLORS.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.plantioName}>{plantio.cultura}</Text>
              <Text style={styles.plantioDetail}>
                {plantio.quantidadePlantada} {plantio.unidadeQuantidade} • {plantio.dataPlantio.toDate().toLocaleDateString('pt-BR')}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.xl },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerCard: {
    backgroundColor: COLORS.secondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  headerTitle: { color: COLORS.textLight, fontSize: TYPOGRAPHY.h3, fontWeight: '800' },
  headerSub: { color: COLORS.cCBD5E1, marginTop: 4, fontSize: 13, fontWeight: '600' },
  newCycleBtn: {
    height: 44,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primary,
    marginBottom: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  newCycleText: { color: COLORS.textLight, fontWeight: '800', fontSize: 13 },
  plantioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: RADIUS.md,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  plantioIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  plantioName: { fontSize: TYPOGRAPHY.body, fontWeight: '800', color: COLORS.textPrimary },
  plantioDetail: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  emptyState: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyText: { color: COLORS.textSecondary },
});

export default EstufaHistoryScreen;
