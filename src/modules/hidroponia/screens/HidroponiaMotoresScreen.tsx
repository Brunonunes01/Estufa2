import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../../hooks/useAuth';
import { useAppSettings } from '../../../hooks/useAppSettings';
import { getEstufaById, listEstufas } from '../../../services/estufaService';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../../constants/theme';
import { Estufa, HydroMotor, HydroSetor } from '../../../types/domain';
import { RootStackParamList } from '../../../navigation/types';
import {
  addHydroMotor,
  addHydroSetor,
  deleteHydroMotor,
  updateHydroMotor,
} from '../services/hidroponiaLayoutService';

type Props = NativeStackScreenProps<RootStackParamList, 'HidroponiaMotores'>;

const STATUS_OPTIONS: Array<{ value: HydroMotor['status']; label: string }> = [
  { value: 'ativo', label: 'Ativo' },
  { value: 'inativo', label: 'Inativo' },
  { value: 'manutencao', label: 'Manutenção' },
];

const HidroponiaMotoresScreen = ({ navigation, route }: Props) => {
  const { user, selectedTenantId } = useAuth();
  const { settings } = useAppSettings();
  const insets = useSafeAreaInsets();
  const targetId = selectedTenantId || user?.uid;
  const routeEstufaId = route.params?.estufaId;

  const [estufas, setEstufas] = useState<Estufa[]>([]);
  const [selectedEstufaId, setSelectedEstufaId] = useState(routeEstufaId || '');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [setorModalVisible, setSetorModalVisible] = useState(false);

  const [editingMotor, setEditingMotor] = useState<HydroMotor | null>(null);
  const [motorNome, setMotorNome] = useState('');
  const [motorCodigo, setMotorCodigo] = useState('');
  const [motorStatus, setMotorStatus] = useState<HydroMotor['status']>('ativo');
  const [motorObservacoes, setMotorObservacoes] = useState('');
  const [selectedSectorIds, setSelectedSectorIds] = useState<string[]>([]);

  const [newSetorName, setNewSetorName] = useState('');

  const hydroEstufas = useMemo(
    () =>
      estufas.filter(
        (item) =>
          (item.productionModes || []).includes('hydroponics') ||
          item.tipo === 'hidroponia' ||
          item.tipo === 'semi-hidroponia' ||
          !!item.hydroponicSystemType
      ),
    [estufas]
  );

  const selectedEstufa = useMemo(
    () => hydroEstufas.find((item) => item.id === selectedEstufaId) || null,
    [hydroEstufas, selectedEstufaId]
  );

  const motores = selectedEstufa?.motores || [];
  const setores = selectedEstufa?.setores || [];

  const motorById = useMemo(
    () => new Map(motores.map((motor) => [motor.id, motor])),
    [motores]
  );

  const setorCountByMotor = useMemo(() => {
    const map = new Map<string, number>();
    setores.forEach((setor) => {
      const motorId = String(setor.motorId || '').trim();
      if (!motorId) return;
      map.set(motorId, (map.get(motorId) || 0) + 1);
    });
    return map;
  }, [setores]);

  const load = useCallback(async () => {
    if (!targetId) return;
    setLoading(true);
    try {
      const estufasRes = await listEstufas(targetId);
      setEstufas(estufasRes);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar os motores.');
    } finally {
      setLoading(false);
    }
  }, [targetId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  React.useEffect(() => {
    if (routeEstufaId && hydroEstufas.some((item) => item.id === routeEstufaId)) {
      setSelectedEstufaId(routeEstufaId);
      return;
    }
    if (!selectedEstufaId && hydroEstufas[0]?.id) {
      setSelectedEstufaId(hydroEstufas[0].id);
    }
  }, [hydroEstufas, routeEstufaId, selectedEstufaId]);

  React.useEffect(() => {
    navigation.setOptions({ title: 'Motores' });
  }, [navigation]);

  const openCreateMotor = () => {
    if (!selectedEstufa) {
      Alert.alert('Selecione uma estufa', 'Escolha uma estufa hidropônica para cadastrar motores.');
      return;
    }
    setEditingMotor(null);
    setMotorNome('');
    setMotorCodigo('');
    setMotorStatus('ativo');
    setMotorObservacoes('');
    setSelectedSectorIds([]);
    setModalVisible(true);
  };

  const openEditMotor = (motor: HydroMotor) => {
    setEditingMotor(motor);
    setMotorNome(motor.nome);
    setMotorCodigo(motor.codigo || '');
    setMotorStatus(motor.status || 'ativo');
    setMotorObservacoes(motor.observacoes || '');
    
    // Identifica setores que já usam este motor
    const currentSectors = setores
      .filter((s) => s.motorId === motor.id)
      .map((s) => s.id);
    setSelectedSectorIds(currentSectors);
    
    setModalVisible(true);
  };

  const openCreateSetor = () => {
    if (!editingMotor) {
      Alert.alert('Aviso', 'Salve o motor primeiro para poder criar um setor vinculado a ele.');
      return;
    }
    setNewSetorName('');
    setSetorModalVisible(true);
  };

  const toggleSectorSelection = (sectorId: string) => {
    setSelectedSectorIds((prev) =>
      prev.includes(sectorId) ? prev.filter((id) => id !== sectorId) : [...prev, sectorId]
    );
  };

  const handleSaveSetor = async () => {
    if (!targetId || !selectedEstufa || !editingMotor) return;
    if (!newSetorName.trim()) {
      Alert.alert('Campo obrigatório', 'Informe o nome do setor.');
      return;
    }

    setSaving(true);
    try {
      await addHydroSetor(
        selectedEstufa.id,
        {
          nome: newSetorName.trim(),
          motorId: editingMotor.id,
        },
        targetId
      );
      setSetorModalVisible(false);
      
      // Atualiza a lista de setores selecionados para incluir o novo
      // Mas precisamos recarregar a estufa primeiro para pegar o ID do novo setor
      const estufaRefreshed = await getEstufaById(selectedEstufa.id, targetId);
      if (estufaRefreshed) {
        setEstufas(prev => prev.map(e => e.id === estufaRefreshed.id ? estufaRefreshed : e));
        const lastSetor = estufaRefreshed.setores?.[estufaRefreshed.setores.length - 1];
        if (lastSetor) {
          setSelectedSectorIds(prev => [...prev, lastSetor.id]);
        }
      }
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Falha ao criar setor.');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!targetId) return;
    if (!selectedEstufa) {
      Alert.alert('Selecione uma estufa', 'Escolha uma estufa hidropônica para cadastrar motores.');
      return;
    }
    if (!motorNome.trim()) {
      Alert.alert('Campo obrigatório', 'Informe o nome do motor.');
      return;
    }

    setSaving(true);
    try {
      if (editingMotor) {
        await updateHydroMotor(
          selectedEstufa.id,
          editingMotor.id,
          {
            nome: motorNome.trim(),
            codigo: motorCodigo.trim() || undefined,
            status: motorStatus,
            observacoes: motorObservacoes.trim() || undefined,
            setorIds: selectedSectorIds,
          },
          targetId
        );
      } else {
        await addHydroMotor(
          selectedEstufa.id,
          {
            nome: motorNome.trim(),
            codigo: motorCodigo.trim() || undefined,
            status: motorStatus,
            observacoes: motorObservacoes.trim() || undefined,
            setorIds: selectedSectorIds,
          },
          targetId
        );
      }
      setModalVisible(false);
      setEditingMotor(null);
      await load();
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Falha ao salvar motor.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (motor: HydroMotor) => {
    if (!targetId) return;
    if (!selectedEstufa) return;
    Alert.alert('Excluir motor', `Deseja excluir "${motor.nome}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteHydroMotor(selectedEstufa.id, motor.id, targetId);
            await load();
          } catch (error: any) {
            Alert.alert('Erro', error?.message || 'Falha ao excluir motor.');
          }
        },
      },
    ]);
  };

  if (loading) {
    return <ActivityIndicator size="large" color={COLORS.primary} style={styles.centered} />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: (settings.uiV2Enabled ? 138 : SPACING.xxl) + insets.bottom },
      ]}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} colors={[COLORS.primary]} />}
    >
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Motores da hidroponia</Text>
        <Text style={styles.heroText}>
          Aqui você cadastra, lista e edita motores. O vínculo com setor continua sendo feito no layout.
        </Text>
      </View>

      <View style={styles.moduleLinksRow}>
        <TouchableOpacity
          style={styles.moduleLink}
          onPress={() => navigation.navigate('HidroponiaLotes', selectedEstufaId ? { estufaId: selectedEstufaId } : undefined)}
        >
          <Text style={styles.moduleLinkText}>Lotes</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.moduleLink, styles.moduleLinkActive]}>
          <Text style={[styles.moduleLinkText, { color: COLORS.info }]}>Motores</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.moduleLink}
          onPress={() => navigation.navigate('MainTabs', { screen: 'FinanceiroTab' })}
        >
          <Text style={styles.moduleLinkText}>Financeiro</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionLabel}>Estufa</Text>
      <View style={styles.choiceRow}>
        {hydroEstufas.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Nenhuma estufa hidropônica encontrada.</Text>
          </View>
        ) : (
          hydroEstufas.map((estufa) => (
            <TouchableOpacity
              key={estufa.id}
              style={[styles.choiceChip, selectedEstufaId === estufa.id && styles.choiceChipActive]}
              onPress={() => setSelectedEstufaId(estufa.id)}
            >
              <Text style={[styles.choiceText, selectedEstufaId === estufa.id && styles.choiceTextActive]}>
                {estufa.nome}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      <View style={styles.headerRow}>
        <View>
          <Text style={styles.sectionTitle}>Listagem de motores</Text>
          <Text style={styles.sectionSubtitle}>
            {selectedEstufa ? `Estufa: ${selectedEstufa.nome}` : 'Selecione uma estufa hidropônica'}
          </Text>
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={openCreateMotor}>
          <MaterialCommunityIcons name="plus" size={18} color={COLORS.textLight} />
          <Text style={styles.primaryBtnText}>Novo motor</Text>
        </TouchableOpacity>
      </View>

      {selectedEstufa ? (
        <View style={styles.listWrap}>
          {motores.length === 0 ? (
            <View style={styles.emptyList}>
              <Text style={styles.emptyTitle}>Nenhum motor cadastrado</Text>
              <Text style={styles.emptyText}>Use "Novo motor" para criar o primeiro registro.</Text>
            </View>
          ) : (
            motores.map((motor) => {
              const setoresVinculados = setorCountByMotor.get(motor.id) || 0;
              return (
                <View key={motor.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{motor.nome}</Text>
                      <Text style={styles.cardMeta}>
                        {motor.codigo || 'Sem código'} • {motor.status} • {setoresVinculados} setores
                      </Text>
                    </View>
                    <View style={styles.statusPill}>
                      <Text style={styles.statusText}>{motor.status}</Text>
                    </View>
                  </View>

                  {motor.observacoes ? <Text style={styles.cardNotes}>{motor.observacoes}</Text> : null}

                  <View style={styles.actionsRow}>
                    <TouchableOpacity style={styles.secondaryBtn} onPress={() => openEditMotor(motor)}>
                      <MaterialCommunityIcons name="pencil-outline" size={18} color={COLORS.primary} />
                      <Text style={styles.secondaryBtnText}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.dangerBtn} onPress={() => handleDelete(motor)}>
                      <MaterialCommunityIcons name="delete-outline" size={18} color={COLORS.danger} />
                      <Text style={styles.dangerBtnText}>Excluir</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>
      ) : null}

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              {editingMotor ? 'Editar motor' : 'Novo motor'}
              {selectedEstufa ? ` - ${selectedEstufa.nome}` : ''}
            </Text>

            <Text style={styles.inputLabel}>Nome</Text>
            <TextInput
              style={styles.input}
              value={motorNome}
              onChangeText={setMotorNome}
              placeholder="Ex.: Motor principal"
              placeholderTextColor={COLORS.textPlaceholder}
            />

            <Text style={styles.inputLabel}>Código</Text>
            <TextInput
              style={styles.input}
              value={motorCodigo}
              onChangeText={setMotorCodigo}
              placeholder="Ex.: MTR-01"
              placeholderTextColor={COLORS.textPlaceholder}
              autoCapitalize="characters"
            />

            <View style={styles.choiceRow}>
              {STATUS_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.choiceChip, motorStatus === option.value && styles.choiceChipActive]}
                  onPress={() => setMotorStatus(option.value)}
                >
                  <Text style={[styles.choiceText, motorStatus === option.value && styles.choiceTextActive]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.inputHeader}>
              <Text style={styles.inputLabel}>Vincular a Setores</Text>
              {editingMotor && (
                <TouchableOpacity style={styles.inlineAddBtn} onPress={openCreateSetor}>
                  <MaterialCommunityIcons name="plus" size={16} color={COLORS.primary} />
                  <Text style={styles.inlineAddBtnText}>Novo setor</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {!editingMotor && (
              <Text style={styles.helperText}>Crie o motor primeiro para habilitar o vínculo com setores.</Text>
            )}

            {setores.length === 0 ? (
              <Text style={[styles.emptyText, { marginBottom: SPACING.sm }]}>
                Nenhum setor cadastrado nesta estufa.
              </Text>
            ) : (
              <View style={styles.choiceRow}>
                {setores.map((setor) => {
                  const isLinkedToThis = selectedSectorIds.includes(setor.id);
                  const otherMotor = setor.motorId && setor.motorId !== editingMotor?.id 
                    ? motorById.get(setor.motorId) 
                    : null;
                  const isDisabled = !!otherMotor && !isLinkedToThis;

                  return (
                    <TouchableOpacity
                      key={setor.id}
                      style={[
                        styles.choiceChip,
                        isLinkedToThis && styles.choiceChipActive,
                        isDisabled && styles.choiceChipDisabled,
                      ]}
                      onPress={() => !isDisabled && toggleSectorSelection(setor.id)}
                      disabled={isDisabled}
                    >
                      <Text
                        style={[
                          styles.choiceText,
                          isLinkedToThis && styles.choiceTextActive,
                          isDisabled && styles.choiceTextDisabled,
                        ]}
                      >
                        {setor.nome} {otherMotor ? `(${otherMotor.nome})` : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <Text style={styles.inputLabel}>Observações</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={motorObservacoes}
              onChangeText={setMotorObservacoes}
              placeholder="Informações opcionais"
              placeholderTextColor={COLORS.textPlaceholder}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)} disabled={saving}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleSave} disabled={saving}>
                <Text style={styles.confirmText}>{saving ? 'Salvando...' : 'Salvar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal para Novo Setor */}
      <Modal visible={setorModalVisible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.modal, { maxWidth: 400 }]}>
            <Text style={styles.modalTitle}>Novo Setor</Text>
            <Text style={styles.helperText}>O setor será vinculado ao motor "{motorNome}".</Text>

            <Text style={styles.inputLabel}>Nome do Setor</Text>
            <TextInput
              style={styles.input}
              value={newSetorName}
              onChangeText={setNewSetorName}
              placeholder="Ex.: Berçário Norte"
              placeholderTextColor={COLORS.textPlaceholder}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setSetorModalVisible(false)} disabled={saving}>
                <Text style={styles.cancelText}>Voltar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleSaveSetor} disabled={saving}>
                <Text style={styles.confirmText}>{saving ? 'Criando...' : 'Criar Setor'}</Text>
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
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  moduleLinksRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: SPACING.sm,
  },
  moduleLink: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.pill,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleLinkActive: {
    borderColor: COLORS.info,
    backgroundColor: COLORS.infoSoft,
  },
  moduleLinkText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '800',
  },
  heroCard: {
    backgroundColor: COLORS.secondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  heroTitle: { color: COLORS.textLight, fontSize: 22, fontWeight: '900' },
  heroText: { color: COLORS.whiteAlpha80, marginTop: 6, fontSize: 13, lineHeight: 18 },
  sectionLabel: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '800', marginBottom: 6 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 10,
    marginBottom: SPACING.sm,
  },
  sectionTitle: { color: COLORS.textPrimary, fontSize: TYPOGRAPHY.h3, fontWeight: '900' },
  sectionSubtitle: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryBtnText: { color: COLORS.textLight, fontSize: 12, fontWeight: '800' },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: SPACING.md },
  choiceChip: {
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  choiceChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  choiceChipDisabled: { backgroundColor: COLORS.surfaceMuted, borderColor: COLORS.border, opacity: 0.6 },
  choiceText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
  choiceTextActive: { color: COLORS.textLight },
  choiceTextDisabled: { color: COLORS.textMuted },
  listWrap: { gap: SPACING.sm },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    ...SHADOWS.card,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '900' },
  cardMeta: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  statusPill: {
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: COLORS.surfaceMuted,
  },
  statusText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '800' },
  cardNotes: { marginTop: 8, color: COLORS.textSecondary, fontSize: 12 },
  actionsRow: { marginTop: 12, flexDirection: 'row', gap: 8 },
  secondaryBtn: {
    flex: 1,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceMuted,
    paddingVertical: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryBtnText: { color: COLORS.primary, fontSize: 12, fontWeight: '800' },
  dangerBtn: {
    flex: 1,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.dangerSoft,
    backgroundColor: COLORS.dangerSoft,
    paddingVertical: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dangerBtnText: { color: COLORS.danger, fontSize: 12, fontWeight: '800' },
  emptyList: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  emptyBox: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceMuted,
    padding: 12,
    alignItems: 'center',
  },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '900' },
  emptyText: { color: COLORS.textSecondary, fontSize: 12, textAlign: 'center', marginTop: 4 },
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modal: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
  },
  modalTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '900', marginBottom: SPACING.md },
  inputHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  inputLabel: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700', marginBottom: 6 },
  inlineAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  inlineAddBtnText: { color: COLORS.primary, fontSize: 12, fontWeight: '800' },
  helperText: { color: COLORS.textSecondary, fontSize: 11, marginBottom: 8, fontStyle: 'italic' },
  input: {
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: SPACING.sm },
  cancelBtn: {
    flex: 1,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
  },
  confirmBtn: {
    flex: 1,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
  },
  cancelText: { color: COLORS.textSecondary, fontWeight: '800' },
  confirmText: { color: COLORS.textLight, fontWeight: '800' },
});

export default HidroponiaMotoresScreen;
