import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Share,
  Modal,
  TextInput,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNetInfo } from '@react-native-community/netinfo';

import { useAuth } from '../../hooks/useAuth';
import { deleteEstufa } from '../../services/estufaService';
import { Estufa, Plantio } from '../../types/domain';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/theme';
import SectionHeading from '../../components/ui/SectionHeading';
import MetricCard from '../../components/ui/MetricCard';
import { evaluateEstufaHealth } from '../../utils/estufaHealth';
import { useAppSettings } from '../../hooks/useAppSettings';
import { verifyCurrentUserPassword } from '../../services/securityService';
import { useEstufaDetailData } from '../../hooks/queries/useEstufaDetailData';
import { useFeedback } from '../../hooks/useFeedback';
import { queryKeys } from '../../lib/queryClient';

const EstufaDetailScreen = ({ route, navigation }: any) => {
  const { user, selectedTenantId, canDeleteEstufa } = useAuth();
  const { settings } = useAppSettings();
  const { showError, showSuccess, showWarning } = useFeedback();
  const netInfo = useNetInfo();
  const queryClient = useQueryClient();
  const estufaId = route?.params?.estufaId;
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const targetId = selectedTenantId || user?.uid;

  const { data, isLoading, isFetching, isError, refetch } = useEstufaDetailData(estufaId, targetId);
  const estufa: Estufa | null = data?.estufa || null;
  const plantios: Plantio[] = data?.plantios || [];
  const loading = isLoading || isFetching;

  const deleteEstufaMutation = useMutation({
    mutationFn: (id: string) => deleteEstufa(id, targetId as string),
    onSuccess: async () => {
      await Promise.all([
        targetId ? queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(targetId) }) : Promise.resolve(),
        targetId ? queryClient.invalidateQueries({ queryKey: queryKeys.estufasList(targetId) }) : Promise.resolve(),
      ]);

      setPasswordModalVisible(false);
      setConfirmDeleteVisible(false);

      if (netInfo.isConnected === false) {
        showWarning('Sem internet: exclusão salva localmente. Sincronizando...');
      } else {
        showSuccess('Estufa excluída com sucesso.');
      }

      navigation.navigate('EstufasList');
    },
    onError: () => {
      showError('Falha ao excluir a estufa.');
    },
  });

  const isOwner = estufa?.userId === user?.uid;

  useEffect(() => {
    if (isError) {
      showError('Não foi possível carregar a estufa.');
    }
  }, [isError, showError]);

  const handleShareLocation = async () => {
    if (!estufa?.latitude || !estufa?.longitude) return;
    const url = `http://maps.google.com/maps?q=${estufa.latitude},${estufa.longitude}`;
    const msg = `Localização da estufa ${estufa.nome}: ${url}`;
    try {
      await Share.share({ message: msg });
    } catch (error) {
      console.error('Erro ao compartilhar', error);
    }
  };

  const plantioAtivo = useMemo(() => plantios.find((plantio) => plantio.status !== 'finalizado'), [plantios]);
  const totalFinalizados = useMemo(() => plantios.filter((plantio) => plantio.status === 'finalizado').length, [plantios]);
  const health = useMemo(() => (estufa ? evaluateEstufaHealth(estufa, plantios) : null), [estufa, plantios]);

  const openDeleteFlow = () => {
    if (!canDeleteEstufa) {
      showWarning('Apenas administradores da conta principal podem excluir estufas.');
      return;
    }
    setConfirmDeleteVisible(true);
  };

  const proceedToPasswordValidation = () => {
    setConfirmDeleteVisible(false);
    setAdminPassword('');
    setPasswordError('');
    setPasswordModalVisible(true);
  };

  const handleDeleteEstufa = async () => {
    if (!estufa?.id || deleteEstufaMutation.isPending) return;

    if (!adminPassword.trim()) {
      setPasswordError('Informe a senha de administrador.');
      return;
    }

    setPasswordError('');

    try {
      const valid = await verifyCurrentUserPassword(adminPassword.trim());
      if (!valid) {
        setPasswordError('Senha incorreta. Tente novamente.');
        return;
      }
      deleteEstufaMutation.mutate(estufa.id);
    } catch (error: any) {
      if (error?.code === 'auth/wrong-password' || error?.code === 'auth/invalid-credential') {
        setPasswordError('Senha incorreta. Tente novamente.');
      } else {
        showError('Falha ao validar senha de administrador.');
      }
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" style={styles.centered} color={COLORS.primary} />;
  }

  if (!estufaId || !estufa) {
    return (
      <View style={[styles.centered, { padding: 20 }]}> 
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color={COLORS.danger} style={{ marginBottom: 10 }} />
        <Text style={styles.errorText}>Não foi possível carregar a estufa.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('EstufasList')}>
          <Text style={styles.backBtnText}>Voltar para Estufas</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const quickActions = [
    {
      key: 'hub-cycle',
      title: plantioAtivo ? 'Painel do Ciclo' : 'Novo Ciclo',
      icon: 'sprout',
      color: COLORS.success,
      onPress: () =>
        plantioAtivo
          ? navigation.navigate('PlantioDetail', { plantioId: plantioAtivo.id })
          : navigation.navigate('PlantioForm', { estufaId: estufa.id }),
    },
    {
      key: 'hub-sale',
      title: 'Registrar Venda',
      icon: 'basket-plus',
      color: COLORS.primary,
      onPress: () =>
        plantioAtivo
          ? navigation.navigate('ColheitaForm', { plantioId: plantioAtivo.id, estufaId: estufa.id })
          : navigation.navigate('PlantioForm', { estufaId: estufa.id }),
    },
    {
      key: 'hub-apply',
      title: 'Aplicar Insumo',
      icon: 'flask-outline',
      color: COLORS.info,
      onPress: () =>
        plantioAtivo
          ? navigation.navigate('AplicacaoForm', { plantioId: plantioAtivo.id, estufaId: estufa.id })
          : navigation.navigate('PlantioForm', { estufaId: estufa.id }),
    },
    {
      key: 'hub-journal',
      title: 'Diário de Manejo',
      icon: 'notebook-outline',
      color: COLORS.orange,
      onPress: () =>
        plantioAtivo
          ? navigation.navigate('ManejosHistory', { plantioId: plantioAtivo.id, estufaId: estufa.id })
          : navigation.navigate('PlantioForm', { estufaId: estufa.id }),
    },
    {
      key: 'hub-reports',
      title: 'Relatórios',
      icon: 'chart-box-outline',
      color: COLORS.info,
      onPress: () => navigation.navigate('VendasList'),
    },
    {
      key: 'hub-finance',
      title: 'Financeiro',
      icon: 'hand-coin-outline',
      color: COLORS.warning,
      onPress: () => navigation.navigate('ContasReceber'),
    },
  ];

  return (
    <ScrollView
      style={[styles.container, settings.darkMode && styles.containerDark]}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} colors={[COLORS.primary]} />}
    >
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.estufaTitle}>{estufa.nome}</Text>
            <Text style={styles.estufaSub}>Hub da estufa para operação diária</Text>
            <View style={styles.statusPill}>
              <View style={[styles.dot, { backgroundColor: estufa.status === 'ativa' ? COLORS.success : COLORS.danger }]} />
              <Text style={styles.statusText}>{health ? `Status: ${health.label}` : 'Em operação'}</Text>
            </View>
          </View>
          {isOwner ? (
            <TouchableOpacity onPress={() => navigation.navigate('EstufaForm', { estufaId: estufa.id })} style={styles.editBtn}>
              <MaterialCommunityIcons name="pencil" size={20} color={COLORS.textLight} />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.metricsContainer}>
          <MetricCard label="Área útil" value={`${estufa.areaM2} m²`} style={{ flex: 1 }} />
          <MetricCard label="Ciclos" value={String(plantios.length)} style={{ flex: 1 }} />
          <MetricCard label="Finalizados" value={String(totalFinalizados)} style={{ flex: 1 }} />
        </View>

        {estufa.latitude && estufa.longitude ? (
          <TouchableOpacity style={styles.shareBtn} onPress={handleShareLocation}>
            <MaterialCommunityIcons name="map-marker-radius" size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
            <Text style={styles.shareBtnText}>Compartilhar localização da estufa</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.content}>
        {health && health.level !== 'ok' ? (
          <View style={[styles.healthAlert, health.level === 'critical' ? styles.healthAlertCritical : styles.healthAlertWarning]}>
            <MaterialCommunityIcons
              name={health.level === 'critical' ? 'alert-circle' : 'alert-outline'}
              size={18}
              color={health.level === 'critical' ? COLORS.danger : COLORS.warning}
            />
            <Text style={styles.healthAlertText}>{health.reasons[0] || 'Atenção necessária nesta estufa.'}</Text>
          </View>
        ) : null}

        <SectionHeading
          title="Atalhos do Hub"
          subtitle="Acesse as operações principais desta estufa sem navegação longa"
        />

        <View style={styles.quickGrid}>
          {quickActions.map((action) => (
            <TouchableOpacity key={action.key} style={styles.quickCard} onPress={action.onPress}>
              <View style={[styles.quickIcon, { backgroundColor: action.color + '1A' }]}>
                <MaterialCommunityIcons name={action.icon as any} size={20} color={action.color} />
              </View>
              <Text style={styles.quickTitle}>{action.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <SectionHeading title="Ciclo Atual" subtitle="Status operacional desta estufa" />

        {plantioAtivo ? (
          <View style={styles.activeCycleCard}>
            <View style={styles.activeCycleTop}>
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>ATIVO</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('PlantioDetail', { plantioId: plantioAtivo.id })}>
                <Text style={styles.linkText}>Abrir painel</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.activeCycleTitle}>{plantioAtivo.cultura}</Text>
            <Text style={styles.activeCycleSub}>Lote: {plantioAtivo.codigoLote || 'Não informado'}</Text>
            <Text style={styles.activeCycleSub}>
              Plantado em: {plantioAtivo.dataPlantio.toDate().toLocaleDateString('pt-BR')}
            </Text>
          </View>
        ) : (
          <View style={styles.emptyCycle}>
            <MaterialCommunityIcons name="sprout-outline" size={30} color={COLORS.textMuted} />
            <Text style={styles.emptyCycleTitle}>Nenhum ciclo ativo nesta estufa</Text>
            <TouchableOpacity style={styles.emptyCycleBtn} onPress={() => navigation.navigate('PlantioForm', { estufaId: estufa.id })}>
              <Text style={styles.emptyCycleBtnText}>Iniciar Novo Ciclo</Text>
            </TouchableOpacity>
          </View>
        )}

        <SectionHeading
          title="Histórico de Ciclos"
          subtitle="Ciclos recentes desta estufa"
          right={
            <TouchableOpacity onPress={() => navigation.navigate('PlantioForm', { estufaId: estufa.id })}>
              <Text style={styles.linkText}>+ Novo</Text>
            </TouchableOpacity>
          }
        />

        {plantios.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Nenhum plantio registrado ainda.</Text>
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
                  color={plantio.status === 'finalizado' ? COLORS.c9CA3AF : COLORS.primary}
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

        {canDeleteEstufa ? (
          <View style={styles.deleteZone}>
            <Text style={styles.deleteZoneTitle}>Zona de perigo</Text>
            <Text style={styles.deleteZoneText}>
              Exclua esta estufa somente quando tiver certeza. Essa ação é irreversível.
            </Text>
            <TouchableOpacity style={styles.deleteBtn} onPress={openDeleteFlow} disabled={deleteEstufaMutation.isPending}>
              <MaterialCommunityIcons name="trash-can-outline" size={18} color={COLORS.textLight} />
              <Text style={styles.deleteBtnText}>Excluir Estufa</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      <View style={{ height: 24 }} />

      <Modal
        visible={confirmDeleteVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmDeleteVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Excluir Estufa</Text>
            <Text style={styles.modalText}>Tem certeza que deseja excluir esta estufa?</Text>
            <Text style={styles.modalTextMuted}>Essa ação não pode ser desfeita.</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => setConfirmDeleteVisible(false)}
                disabled={deleteEstufaMutation.isPending}
              >
                <Text style={styles.modalBtnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnDelete} onPress={proceedToPasswordValidation} disabled={deleteEstufaMutation.isPending}>
                <Text style={styles.modalBtnDeleteText}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={passwordModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPasswordModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Senha de administrador</Text>
            <Text style={styles.modalText}>Digite a senha para confirmar a exclusão da estufa.</Text>
            <TextInput
              style={styles.modalInput}
              value={adminPassword}
              onChangeText={(value) => {
                setAdminPassword(value);
                if (passwordError) setPasswordError('');
              }}
              placeholder="Senha de administrador"
              placeholderTextColor={COLORS.textPlaceholder}
              secureTextEntry
              editable={!deleteEstufaMutation.isPending}
            />
            {passwordError ? <Text style={styles.modalErrorText}>{passwordError}</Text> : null}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => setPasswordModalVisible(false)}
                disabled={deleteEstufaMutation.isPending}
              >
                <Text style={styles.modalBtnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnDelete} onPress={handleDeleteEstufa} disabled={deleteEstufaMutation.isPending}>
                {deleteEstufaMutation.isPending ? <ActivityIndicator color={COLORS.textLight} /> : <Text style={styles.modalBtnDeleteText}>Excluir</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  containerDark: { backgroundColor: COLORS.c1E293B },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    backgroundColor: COLORS.secondary,
    padding: SPACING.xl,
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.md },
  estufaTitle: { fontSize: TYPOGRAPHY.h2, fontWeight: '800', color: COLORS.textLight },
  estufaSub: { color: COLORS.whiteAlpha80, marginTop: 4, marginBottom: 6, fontSize: 13 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.rgba255255255018,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    alignSelf: 'flex-start',
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { color: COLORS.textLight, fontSize: 12, fontWeight: '700' },
  editBtn: { backgroundColor: COLORS.rgba25525525502, padding: 8, borderRadius: RADIUS.sm },

  metricsContainer: { flexDirection: 'row', gap: 10 },

  shareBtn: {
    flexDirection: 'row',
    backgroundColor: COLORS.primaryLight,
    padding: 12,
    borderRadius: RADIUS.sm,
    marginTop: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },

  content: { padding: SPACING.xl },
  healthAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: SPACING.md,
    gap: 8,
  },
  healthAlertWarning: { borderColor: COLORS.cFED7AA, backgroundColor: COLORS.warningSoft },
  healthAlertCritical: { borderColor: COLORS.cFECACA, backgroundColor: COLORS.dangerBg },
  healthAlertText: { color: COLORS.textPrimary, fontSize: 12, fontWeight: '600', flex: 1 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: SPACING.xl },
  quickCard: {
    width: '48.5%',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    marginBottom: 10,
    ...SHADOWS.card,
  },
  quickIcon: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickTitle: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '700' },

  activeCycleCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    ...SHADOWS.card,
    marginBottom: SPACING.xl,
  },
  activeCycleTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  activeBadge: { backgroundColor: COLORS.successSoft, borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 5 },
  activeBadgeText: { color: COLORS.success, fontSize: 10, fontWeight: '800' },
  activeCycleTitle: { fontSize: TYPOGRAPHY.title, fontWeight: '800', color: COLORS.textPrimary },
  activeCycleSub: { marginTop: 4, color: COLORS.textSecondary, fontSize: 12 },

  emptyCycle: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  emptyCycleTitle: { marginTop: 8, color: COLORS.textPrimary, fontWeight: '700' },
  emptyCycleBtn: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  emptyCycleBtnText: { color: COLORS.textLight, fontWeight: '700' },

  linkText: { color: COLORS.info, fontWeight: '700', fontSize: 13 },

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
  deleteZone: {
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.cFECACA,
    backgroundColor: COLORS.dangerBg,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  deleteZoneTitle: { color: COLORS.danger, fontSize: 13, fontWeight: '800', marginBottom: 4 },
  deleteZoneText: { color: COLORS.textSecondary, fontSize: 12, marginBottom: SPACING.md },
  deleteBtn: {
    height: 44,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.danger,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  deleteBtnText: { color: COLORS.textLight, fontWeight: '800', fontSize: 14 },

  modalOverlay: { flex: 1, backgroundColor: COLORS.rgba00006, justifyContent: 'center', padding: 24 },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    ...SHADOWS.card,
  },
  modalTitle: { fontSize: TYPOGRAPHY.h3, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 8 },
  modalText: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 6 },
  modalTextMuted: { color: COLORS.textSecondary, fontSize: 12, marginBottom: SPACING.md },
  modalInput: {
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 12,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surfaceMuted,
    marginBottom: 8,
  },
  modalErrorText: { color: COLORS.danger, fontSize: 12, fontWeight: '700', marginBottom: SPACING.sm },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalBtnCancel: {
    flex: 1,
    height: 44,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBtnCancelText: { color: COLORS.textSecondary, fontWeight: '700' },
  modalBtnDelete: {
    flex: 1,
    height: 44,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.danger,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBtnDeleteText: { color: COLORS.textLight, fontWeight: '800' },

  backBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 15,
  },
  backBtnText: { color: COLORS.textLight, fontWeight: '700' },
  errorText: { textAlign: 'center', fontSize: 16, fontWeight: '700', color: COLORS.danger, marginBottom: 8 },
});

export default EstufaDetailScreen;
