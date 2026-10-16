import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useTalhoesListData } from '../../hooks/queries/useTalhoesListData';
import { deleteTalhao, restoreTalhao } from '../../services/talhaoService';
import {
  listAllPlantios,
  updatePlantioStatus,
} from '../../services/plantioService';
import { verifyCurrentUserPassword } from '../../services/securityService';
import { queryKeys } from '../../lib/queryClient';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../constants/theme';
import EmptyState from '../../components/ui/EmptyState';
import PermanentFieldCycleDeleteModal, {
  FieldCycleDeleteTarget,
} from './components/PermanentFieldCycleDeleteModal';

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'ativo':
      return { bg: COLORS.successSoft || '#d1fae5', text: COLORS.success || '#059669', icon: 'check-circle-outline' };
    case 'preparo':
      return { bg: COLORS.warningSoft || '#fef3c7', text: COLORS.warning || '#d97706', icon: 'tractor' };
    case 'pousio':
      return { bg: COLORS.infoSoft || '#dbeafe', text: COLORS.info || '#2563eb', icon: 'weather-sunset' };
    case 'inativo':
      return { bg: COLORS.surfaceMuted, text: COLORS.textSecondary, icon: 'archive-outline' };
    default:
      return { bg: COLORS.primaryLight, text: COLORS.primary, icon: 'map-marker-outline' };
  }
};

const TalhoesListScreen = ({ navigation }: any) => {
  const { canWrite, isOwner, user, selectedTenantId } = useAuth();
  const targetId = selectedTenantId || user?.uid;
  const queryClient = useQueryClient();
  const { data, isLoading } = useTalhoesListData(targetId);
  const [showArchived, setShowArchived] = useState(false);
  const allTalhoes = data || [];
  const talhoes = allTalhoes.filter((item) =>
    showArchived ? item.status === 'inativo' : item.status !== 'inativo'
  );
  const archivedCount = allTalhoes.filter(
    (item) => item.status === 'inativo'
  ).length;
  const plantiosQuery = useQuery({
    queryKey: queryKeys.plantiosList(targetId || 'none'),
    queryFn: () => listAllPlantios(targetId as string),
    enabled: !!targetId,
  });
  const plantiosByTalhao = useMemo(() => {
    const grouped: Record<string, typeof plantiosQuery.data> = {};
    (plantiosQuery.data || []).forEach((plantio) => {
      if (!plantio.talhaoId) return;
      grouped[plantio.talhaoId] = [
        ...(grouped[plantio.talhaoId] || []),
        plantio,
      ];
    });
    return grouped;
  }, [plantiosQuery.data]);
  const [deleteTarget, setDeleteTarget] =
    useState<FieldCycleDeleteTarget | null>(null);
  const [talhaoDeleteTarget, setTalhaoDeleteTarget] = useState<{
    id: string;
    nome: string;
  } | null>(null);
  const [talhaoDeletePassword, setTalhaoDeletePassword] = useState('');
  const deleteMutation = useMutation({
    mutationFn: async ({
      talhaoId,
      password,
    }: {
      talhaoId: string;
      password: string;
    }) => {
      const validPassword = await verifyCurrentUserPassword(password.trim());
      if (!validPassword) {
        throw new Error('A senha do proprietário está incorreta.');
      }
      return deleteTalhao(talhaoId, targetId as string);
    },
    onSuccess: async (result, variables) => {
      queryClient.setQueryData<any[]>(
        queryKeys.talhoesList(targetId || 'none'),
        (current = []) =>
          current.filter((item) => item.id !== variables.talhaoId)
      );
      queryClient.setQueryData<any[]>(
        queryKeys.plantiosList(targetId || 'none'),
        (current = []) =>
          current.filter((item) => item.talhaoId !== variables.talhaoId)
      );
      setTalhaoDeleteTarget(null);
      setTalhaoDeletePassword('');
      void queryClient.invalidateQueries();

      const deletedOperationalRecords =
        result.deletedVendas +
        result.deletedColheitas +
        result.deletedAplicacoes +
        result.deletedManejos +
        result.deletedTarefas +
        result.deletedDespesas;
      Alert.alert(
        'Talhão excluído',
        result.hadHistory || result.deletedPlantios > 0
          ? `O talhão, ${result.deletedPlantios} ciclo(s) e ${deletedOperationalRecords} registro(s) vinculados foram excluídos permanentemente.${
              result.restoredInsumos > 0
                ? ` O estoque de ${result.restoredInsumos} insumo(s) foi recomposto.`
                : ''
            }`
          : 'O talhão vazio foi excluído definitivamente.'
      );
    },
    onError: (error: unknown) => {
      Alert.alert(
        'Não foi possível excluir',
        error instanceof Error
          ? error.message
          : 'Tente novamente em alguns instantes.'
      );
    },
  });

  const restoreTalhaoMutation = useMutation({
    mutationFn: async (talhaoId: string) =>
      restoreTalhao(talhaoId, targetId as string),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.talhoesList(targetId || 'none'),
      });
      setShowArchived(false);
      Alert.alert(
        'Talhão restaurado',
        'O talhão voltou para a operação de Campo.'
      );
    },
    onError: (error: unknown) => {
      Alert.alert(
        'Não foi possível restaurar',
        error instanceof Error ? error.message : 'Tente novamente.'
      );
    },
  });

  const reactivateCycleMutation = useMutation({
    mutationFn: async (plantioId: string) =>
      updatePlantioStatus(plantioId, 'em_desenvolvimento', targetId as string),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.plantiosList(targetId || 'none'),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.dashboard(targetId || 'none'),
        }),
      ]);
      Alert.alert(
        'Ciclo reativado',
        'O ciclo voltou a aparecer como ativo no Campo.'
      );
    },
    onError: (error: unknown) => {
      Alert.alert(
        'Não foi possível reativar',
        error instanceof Error ? error.message : 'Tente novamente.'
      );
    },
  });

  const openCreateModal = () => {
    if (!canWrite) return;
    navigation.navigate('TalhaoForm');
  };

  const openEditModal = (item: any) => {
    if (!canWrite) return;
    navigation.navigate('TalhaoForm', { talhaoId: item.id });
  };

  const confirmDelete = (talhaoId: string, talhaoNome: string) => {
    if (!isOwner) {
      Alert.alert(
        'Sem permissão',
        'Somente o proprietário pode excluir talhões permanentemente.'
      );
      return;
    }
    setTalhaoDeletePassword('');
    setTalhaoDeleteTarget({ id: talhaoId, nome: talhaoNome });
  };

  const submitTalhaoDelete = () => {
    if (!talhaoDeleteTarget) return;
    if (!talhaoDeletePassword.trim()) {
      Alert.alert('Atenção', 'Digite a senha do proprietário.');
      return;
    }
    deleteMutation.mutate({
      talhaoId: talhaoDeleteTarget.id,
      password: talhaoDeletePassword,
    });
  };

  const subtitle = useMemo(
    () =>
      showArchived
        ? `${talhoes.length} talhão(ões) arquivado(s)`
        : `${talhoes.length} talhão(ões) ativo(s)`,
    [showArchived, talhoes.length]
  );
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Talhoes</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <View style={styles.headerActions}>
          {archivedCount > 0 ? (
            <TouchableOpacity
              style={styles.archiveBtn}
              onPress={() => setShowArchived((current) => !current)}
            >
              <Text style={styles.archiveBtnText}>
                {showArchived ? 'Ver ativos' : `Arquivados (${archivedCount})`}
              </Text>
            </TouchableOpacity>
          ) : null}
          {canWrite && !showArchived ? (
            <TouchableOpacity style={styles.addBtn} onPress={openCreateModal}>
              <Text style={styles.addBtnText}>Novo talhão</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {!isLoading && talhoes.length === 0 ? (
        <EmptyState
          title="Nenhum talhão cadastrado"
          description="A área de campo é onde seus plantios acontecem. Crie seu primeiro talhão para poder iniciar ciclos produtivos e organizar suas colheitas."
          icon="map-marker-outline"
          actionLabel={canWrite ? 'Criar primeiro talhão' : undefined}
          onAction={canWrite ? openCreateModal : undefined}
        />
      ) : (
        <FlatList
          data={talhoes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const ciclos = plantiosByTalhao[item.id] || [];
            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{item.nome}</Text>
                    {item.codigo ? <Text style={styles.cardCode}>{item.codigo}</Text> : null}
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusStyle(item.status || '').bg }]}>
                    <MaterialCommunityIcons name={getStatusStyle(item.status || '').icon as any} size={12} color={getStatusStyle(item.status || '').text} />
                    <Text style={[styles.statusBadgeText, { color: getStatusStyle(item.status || '').text }]}>
                      {String(item.status || 'ativo').toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.infoGrid}>
                  <View style={styles.infoBox}>
                    <MaterialCommunityIcons name="sprout-outline" size={16} color={COLORS.textSecondary} />
                    <View>
                      <Text style={styles.infoLabel}>Cultura</Text>
                      <Text style={styles.infoValue} numberOfLines={1}>{item.culturaPrincipal || '-'}</Text>
                    </View>
                  </View>
                  <View style={styles.infoBox}>
                    <MaterialCommunityIcons name="ruler-square" size={16} color={COLORS.textSecondary} />
                    <View>
                      <Text style={styles.infoLabel}>Área (ha)</Text>
                      <Text style={styles.infoValue}>{item.areaHectares ?? '-'}</Text>
                    </View>
                  </View>
                  <View style={styles.infoBox}>
                    <MaterialCommunityIcons name="map-outline" size={16} color={COLORS.textSecondary} />
                    <View>
                      <Text style={styles.infoLabel}>Mapa (ha)</Text>
                      <Text style={styles.infoValue}>{item.areaCalculadaHectares ?? '-'}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.cyclesBox}>
                  <Text style={styles.cyclesTitle}>
                    Ciclos vinculados ({ciclos.length})
                  </Text>
                  {plantiosQuery.isLoading ? (
                    <Text style={styles.cyclesEmpty}>Carregando ciclos...</Text>
                  ) : ciclos.length === 0 ? (
                    <Text style={styles.cyclesEmpty}>
                      Nenhum ciclo cadastrado neste talhão.
                    </Text>
                  ) : (
                    ciclos.map((ciclo) => (
                      <View key={ciclo.id} style={styles.cycleRow}>
                        <TouchableOpacity
                          style={styles.cycleContent}
                          onPress={() =>
                            navigation.navigate('PlantioDetail', {
                              plantioId: ciclo.id,
                            })
                          }
                        >
                          <View style={styles.cycleIconBox}>
                            <MaterialCommunityIcons name="leaf" size={18} color={COLORS.primary} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.cycleName}>
                              {ciclo.cultura}
                              {ciclo.variedade ? ` • ${ciclo.variedade}` : ''}
                            </Text>
                            <Text style={styles.cycleMeta}>
                              Lote: {ciclo.codigoLote || 'não informado'}
                            </Text>
                            <Text style={styles.cycleStatus}>
                              {String(ciclo.status || 'sem status').replaceAll(
                                '_',
                                ' '
                              )}
                            </Text>
                          </View>
                        </TouchableOpacity>
                        <View style={styles.cycleActions}>
                          {canWrite ? (
                            <TouchableOpacity
                              style={styles.cycleActionBtn}
                              onPress={() =>
                                navigation.navigate('PlantioForm', {
                                  plantioId: ciclo.id,
                                  talhaoId: item.id,
                                })
                              }
                            >
                              <Text style={styles.cycleActionText}>Editar</Text>
                            </TouchableOpacity>
                          ) : null}
                          {isOwner ? (
                            <TouchableOpacity
                              style={[
                                styles.cycleActionBtn,
                                styles.cycleActionDanger,
                              ]}
                              onPress={() =>
                                setDeleteTarget({
                                  id: ciclo.id,
                                  cultura: ciclo.cultura,
                                })
                              }
                            >
                              <Text style={styles.cycleActionDangerText}>
                                Excluir
                              </Text>
                            </TouchableOpacity>
                          ) : null}
                          {canWrite &&
                          (ciclo.status === 'cancelado' ||
                            ciclo.status === 'abortado') ? (
                            <TouchableOpacity
                              style={styles.cycleActionBtn}
                              onPress={() =>
                                reactivateCycleMutation.mutate(ciclo.id)
                              }
                              disabled={reactivateCycleMutation.isPending}
                            >
                              <Text style={styles.cycleActionText}>
                                Reativar
                              </Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>
                      </View>
                    ))
                  )}
                </View>
                <View style={styles.cardActions}>
                  {canWrite && item.status === 'inativo' ? (
                    <TouchableOpacity
                      style={styles.cardBtn}
                      onPress={() => restoreTalhaoMutation.mutate(item.id)}
                      disabled={restoreTalhaoMutation.isPending}
                    >
                      <Text style={styles.cardBtnText}>
                        {restoreTalhaoMutation.isPending
                          ? 'Restaurando...'
                          : 'Restaurar Talhão'}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                  {canWrite && item.status !== 'inativo' ? (
                    <TouchableOpacity
                      style={styles.cardBtn}
                      onPress={() =>
                        navigation.navigate('PlantioForm', {
                          talhaoId: item.id,
                        })
                      }
                    >
                      <Text style={styles.cardBtnText}>Iniciar ciclo</Text>
                    </TouchableOpacity>
                  ) : null}
                  {canWrite && item.status !== 'inativo' ? (
                    <TouchableOpacity
                      style={styles.cardBtn}
                      onPress={() => openEditModal(item)}
                    >
                      <Text style={styles.cardBtnText}>Editar</Text>
                    </TouchableOpacity>
                  ) : null}
                  {isOwner ? (
                    <TouchableOpacity
                      style={[styles.cardBtn, styles.cardBtnDanger]}
                      onPress={() => confirmDelete(item.id, item.nome)}
                      disabled={deleteMutation.isPending}
                    >
                      <Text
                        style={[styles.cardBtnText, styles.cardBtnDangerText]}
                      >
                        {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            );
          }}
        />
      )}

      <Modal
        visible={!!talhaoDeleteTarget}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (deleteMutation.isPending) return;
          setTalhaoDeleteTarget(null);
          setTalhaoDeletePassword('');
        }}
      >
        <View style={styles.backdrop}>
          <View style={styles.modalCard}>
            <Text style={[styles.modalTitle, styles.dangerTitle]}>
              Excluir talhão permanentemente
            </Text>
            <Text style={styles.deleteTargetName}>
              {talhaoDeleteTarget?.nome}
            </Text>
            <Text style={styles.deleteWarning}>
              Esta ação é irreversível. O talhão, todos os seus ciclos e todo o
              histórico vinculado serão apagados. Digite a senha do proprietário
              para confirmar.
            </Text>
            <TextInput
              style={styles.input}
              value={talhaoDeletePassword}
              onChangeText={setTalhaoDeletePassword}
              placeholder="Senha do proprietário"
              placeholderTextColor={COLORS.textPlaceholder}
              secureTextEntry
              autoFocus
              editable={!deleteMutation.isPending}
              onSubmitEditing={submitTalhaoDelete}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setTalhaoDeleteTarget(null);
                  setTalhaoDeletePassword('');
                }}
                disabled={deleteMutation.isPending}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dangerBtn}
                onPress={submitTalhaoDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <ActivityIndicator color={COLORS.textLight} />
                ) : (
                  <Text style={styles.dangerBtnText}>Excluir</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <PermanentFieldCycleDeleteModal
        target={deleteTarget}
        tenantId={targetId}
        onClose={() => setDeleteTarget(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  title: { fontSize: 22, fontWeight: '900', color: COLORS.textDark },
  subtitle: { marginTop: 4, color: COLORS.textSecondary, fontWeight: '600' },
  addBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  addBtnText: { color: COLORS.textLight, fontWeight: '800' },
  archiveBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  archiveBtnText: {
    color: COLORS.textSecondary,
    fontWeight: '700',
    fontSize: 12,
  },
  listContent: { paddingVertical: SPACING.md, gap: SPACING.lg },
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  cardTitle: { fontSize: 18, fontWeight: '900', color: COLORS.textDark },
  cardCode: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '700', marginTop: 2 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    gap: 4,
  },
  statusBadgeText: { fontSize: 10, fontWeight: '900' },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    backgroundColor: COLORS.surfaceMuted,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: '45%',
    gap: 8,
  },
  infoLabel: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '700' },
  infoValue: { fontSize: 13, color: COLORS.textDark, fontWeight: '800' },
  cardActions: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginTop: SPACING.md },
  cardBtn: {
    flex: 1,
    minWidth: '48%',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 10,
    paddingVertical: 9,
    alignItems: 'center',
  },
  cardBtnText: { color: COLORS.textSecondary, fontWeight: '800', fontSize: 12 },
  cardBtnDanger: { borderColor: COLORS.dangerSoft, backgroundColor: 'transparent' },
  cardBtnDangerText: { color: COLORS.danger },
  cyclesBox: {
    marginTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.md,
    gap: SPACING.sm,
  },
  cyclesTitle: { color: COLORS.textDark, fontWeight: '900', fontSize: 14, marginBottom: 4 },
  cyclesEmpty: { color: COLORS.textSecondary, fontSize: 13, fontStyle: 'italic' },
  cycleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.sm,
  },
  cycleContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  cycleIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cycleName: { color: COLORS.textDark, fontWeight: '800', fontSize: 14 },
  cycleMeta: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2, fontWeight: '600' },
  cycleStatus: {
    color: COLORS.primary,
    fontWeight: '900',
    fontSize: 10,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  cycleActions: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cycleActionBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: COLORS.surfaceMuted,
  },
  cycleActionText: { color: COLORS.primary, fontWeight: '800', fontSize: 11 },
  cycleActionDanger: { borderColor: COLORS.dangerSoft, backgroundColor: COLORS.surface },
  cycleActionDangerText: {
    color: COLORS.danger,
    fontWeight: '800',
    fontSize: 11,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: SPACING.md,
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: SPACING.sm,
  },
  dangerTitle: { color: COLORS.danger },
  deleteTargetName: {
    color: COLORS.textDark,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: SPACING.xs,
  },
  deleteWarning: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: SPACING.md,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: SPACING.sm,
    color: COLORS.textDark,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  cancelBtnText: { color: COLORS.textSecondary, fontWeight: '700' },
  dangerBtn: {
    minWidth: 92,
    minHeight: 42,
    backgroundColor: COLORS.danger,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerBtnText: { color: COLORS.textLight, fontWeight: '900' },
});

export default TalhoesListScreen;
