import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, StatusBar, Alert } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useAuth } from '../../hooks/useAuth';
import { listEstufas } from '../../services/estufaService';
import { listAllPlantios } from '../../services/plantioService';
import { Estufa, Plantio } from '../../types/domain';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/theme';
import SectionHeading from '../../components/ui/SectionHeading';
import { evaluateEstufaHealth } from '../../utils/estufaHealth';
import { useAppSettings } from '../../hooks/useAppSettings';

const EstufasListScreen = ({ navigation }: any) => {
  const { user, selectedTenantId } = useAuth();
  const { settings } = useAppSettings();
  const [estufas, setEstufas] = useState<Estufa[]>([]);
  const [plantios, setPlantios] = useState<Plantio[]>([]);
  const [loading, setLoading] = useState(true);
  const isFocused = useIsFocused();

  const carregarDados = async () => {
    const idBusca = selectedTenantId || user?.uid;
    if (!idBusca) return;

    setLoading(true);
    try {
      const [listaEstufas, listaPlantios] = await Promise.all([listEstufas(idBusca), listAllPlantios(idBusca)]);
      setEstufas(listaEstufas);
      setPlantios(listaPlantios);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) carregarDados();
  }, [isFocused, selectedTenantId]);

  const activePlantioByEstufa = useMemo(() => {
    const map: Record<string, Plantio | null> = {};
    estufas.forEach((estufa) => {
      map[estufa.id] =
        plantios.find((plantio) => plantio.estufaId === estufa.id && plantio.status !== 'finalizado') || null;
    });
    return map;
  }, [estufas, plantios]);

  const irParaVenda = (estufaId: string) => {
    const plantioAtivo = activePlantioByEstufa[estufaId];
    if (!plantioAtivo) {
      Alert.alert('Sem ciclo ativo', 'Crie um novo ciclo nesta estufa para registrar venda.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Criar Ciclo', onPress: () => navigation.navigate('PlantioForm', { estufaId }) },
      ]);
      return;
    }

    navigation.navigate('ColheitaForm', { plantioId: plantioAtivo.id, estufaId });
  };

  const renderItem = ({ item }: { item: Estufa }) => {
    const isAtiva = item.status === 'ativa';
    const plantioAtivo = activePlantioByEstufa[item.id];
    const health = evaluateEstufaHealth(item, plantios);

    return (
      <View style={styles.card}>
        <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate('EstufaDetail', { estufaId: item.id })}>
          <View style={styles.cardHeader}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name="greenhouse" size={24} color={isAtiva ? COLORS.primary : COLORS.c9CA3AF} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.cardTitle}>{item.nome}</Text>
              <Text style={styles.cardSubTitle}>Área: {item.areaM2} m²</Text>
              <Text style={styles.cycleInfo} numberOfLines={1}>
                {plantioAtivo ? `Ciclo ativo: ${plantioAtivo.cultura}` : 'Sem ciclo ativo'}
              </Text>
            </View>
            <View style={[styles.badge, isAtiva ? styles.badgeActive : styles.badgeInactive]}>
              <Text style={[styles.badgeText, isAtiva ? styles.textActive : styles.textInactive]}>
                {item.status === 'ativa' ? 'ATIVA' : 'PARADA'}
              </Text>
            </View>
          </View>
          <View style={[styles.healthBadge, styles[`health${health.level === 'critical' ? 'Critical' : health.level === 'warning' ? 'Warning' : 'Ok'}` as const]]}>
            <Text style={styles.healthBadgeText}>{health.label}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('EstufaDetail', { estufaId: item.id })}>
            <MaterialCommunityIcons name="view-dashboard-outline" size={16} color={COLORS.textPrimary} />
            <Text style={styles.actionBtnText}>Hub</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() =>
              plantioAtivo
                ? navigation.navigate('PlantioDetail', { plantioId: plantioAtivo.id })
                : navigation.navigate('PlantioForm', { estufaId: item.id })
            }
          >
            <MaterialCommunityIcons name="sprout" size={16} color={COLORS.textPrimary} />
            <Text style={styles.actionBtnText}>{plantioAtivo ? 'Ciclo' : 'Novo Ciclo'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtnPrimary} onPress={() => irParaVenda(item.id)}>
            <MaterialCommunityIcons name="basket-plus" size={16} color={COLORS.textLight} />
            <Text style={styles.actionBtnPrimaryText}>Vender</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, settings.darkMode && styles.containerDark]}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.secondary} />

      <View style={[styles.topSection, settings.darkMode && styles.topSectionDark]}>
        <SectionHeading
          title="Hubs de Estufa"
          subtitle="Acesse ciclo, venda e gestão sem navegação em cascata"
          style={{ marginBottom: 0 }}
          titleStyle={{ color: COLORS.textLight }}
          subtitleStyle={{ color: COLORS.whiteAlpha80 }}
        />
      </View>

      <FlatList
        data={estufas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={carregarDados} tintColor={COLORS.textLight} />}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="greenhouse" size={60} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>Nenhuma estufa cadastrada</Text>
              <Text style={styles.emptySub}>Cadastre sua primeira estufa para iniciar o monitoramento.</Text>
            </View>
          ) : null
        }
        renderItem={renderItem}
      />

      <TouchableOpacity style={styles.fab} activeOpacity={0.85} onPress={() => navigation.navigate('EstufaForm')}>
        <MaterialCommunityIcons name="plus" size={32} color={COLORS.textLight} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  containerDark: { backgroundColor: COLORS.c1E293B },
  topSection: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
  },
  topSectionDark: { backgroundColor: COLORS.textDark },
  listContent: { padding: SPACING.xl, paddingBottom: 100 },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: { flex: 1 },
  cardTitle: { fontSize: TYPOGRAPHY.title, fontWeight: '800', color: COLORS.textPrimary },
  cardSubTitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  cycleInfo: { fontSize: 12, color: COLORS.textPrimary, marginTop: 4, fontWeight: '600' },
  healthBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.pill, marginBottom: 12 },
  healthOk: { backgroundColor: COLORS.successSoft },
  healthWarning: { backgroundColor: COLORS.warningSoft },
  healthCritical: { backgroundColor: COLORS.dangerBg },
  healthBadgeText: { fontSize: 10, fontWeight: '800', color: COLORS.textPrimary },

  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.pill },
  badgeActive: { backgroundColor: COLORS.successSoft },
  badgeInactive: { backgroundColor: COLORS.surfaceMuted },
  badgeText: { fontSize: 10, fontWeight: '700' },
  textActive: { color: COLORS.success },
  textInactive: { color: COLORS.c6B7280 },

  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingTop: 12,
  },
  actionBtn: {
    flex: 1,
    height: 38,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  actionBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary },
  actionBtnPrimary: {
    flex: 1,
    height: 38,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  actionBtnPrimaryText: { fontSize: 12, fontWeight: '700', color: COLORS.textLight },

  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyTitle: { fontSize: TYPOGRAPHY.h3, fontWeight: '800', color: COLORS.textPrimary, marginTop: 10 },
  emptySub: { fontSize: TYPOGRAPHY.body, color: COLORS.textSecondary, marginTop: 5, textAlign: 'center' },

  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.floating,
  },
});

export default EstufasListScreen;
