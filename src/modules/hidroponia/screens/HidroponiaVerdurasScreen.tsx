import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../../hooks/useAuth';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../../constants/theme';
import { RootStackParamList } from '../../../navigation/types';
import {
  createHydroVerdura,
  listHydroVerduras,
  setHydroVerduraActive,
  updateHydroVerdura,
} from '../services/hidroponiaVerduraService';
import { HydroVerdura, HydroVerduraFormData } from '../types';
import { toNumber } from '../utils';

type Props = NativeStackScreenProps<RootStackParamList, 'HidroponiaVerduras'>;

const toMaybeNumber = (value: string) => {
  const parsed = toNumber(value);
  return Number.isFinite(parsed) && String(value).trim() !== '' ? parsed : null;
};

const HidroponiaVerdurasScreen = ({ navigation }: Props) => {
  const { user, selectedTenantId } = useAuth();
  const targetId = selectedTenantId || user?.uid;
  const { width } = useWindowDimensions();
  const isCompactLayout = width < 820;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [verduras, setVerduras] = useState<HydroVerdura[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nomeComum, setNomeComum] = useState('');
  const [nomeCientifico, setNomeCientifico] = useState('');
  const [variedadePadrao, setVariedadePadrao] = useState('');
  const [cicloDias, setCicloDias] = useState('');
  const [espacamentoCm, setEspacamentoCm] = useState('');
  const [phMin, setPhMin] = useState('');
  const [phMax, setPhMax] = useState('');
  const [ecMin, setEcMin] = useState('');
  const [ecMax, setEcMax] = useState('');
  const [temperaturaMinC, setTemperaturaMinC] = useState('');
  const [temperaturaMaxC, setTemperaturaMaxC] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [ativo, setAtivo] = useState(true);

  const isEditMode = !!editingId;

  const visibleVerduras = useMemo(
    () => (showInactive ? verduras : verduras.filter((item) => item.ativo !== false)),
    [verduras, showInactive]
  );

  const resetForm = () => {
    setEditingId(null);
    setNomeComum('');
    setNomeCientifico('');
    setVariedadePadrao('');
    setCicloDias('');
    setEspacamentoCm('');
    setPhMin('');
    setPhMax('');
    setEcMin('');
    setEcMax('');
    setTemperaturaMinC('');
    setTemperaturaMaxC('');
    setObservacoes('');
    setAtivo(true);
  };

  const populateForm = (item: HydroVerdura) => {
    setEditingId(item.id);
    setNomeComum(item.nomeComum || '');
    setNomeCientifico(item.nomeCientifico || '');
    setVariedadePadrao(item.variedadePadrao || '');
    setCicloDias(item.cicloDias != null ? String(item.cicloDias) : '');
    setEspacamentoCm(item.espacamentoCm != null ? String(item.espacamentoCm) : '');
    setPhMin(item.phMin != null ? String(item.phMin) : '');
    setPhMax(item.phMax != null ? String(item.phMax) : '');
    setEcMin(item.ecMin != null ? String(item.ecMin) : '');
    setEcMax(item.ecMax != null ? String(item.ecMax) : '');
    setTemperaturaMinC(item.temperaturaMinC != null ? String(item.temperaturaMinC) : '');
    setTemperaturaMaxC(item.temperaturaMaxC != null ? String(item.temperaturaMaxC) : '');
    setObservacoes(item.observacoes || '');
    setAtivo(item.ativo !== false);
  };

  const load = useCallback(async () => {
    if (!targetId) return;
    try {
      const result = await listHydroVerduras(targetId, true);
      setVerduras(result);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar o catálogo de verduras.');
    }
  }, [targetId]);

  useFocusEffect(
    useCallback(() => {
      if (!targetId) return;
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load, targetId])
  );

  useEffect(() => {
    navigation.setOptions({ title: 'Cadastro de Verduras' });
  }, [navigation]);

  const handleRefresh = async () => {
    if (!targetId) return;
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const buildPayload = (): HydroVerduraFormData => ({
    nomeComum,
    nomeCientifico,
    variedadePadrao,
    cicloDias: toMaybeNumber(cicloDias),
    espacamentoCm: toMaybeNumber(espacamentoCm),
    phMin: toMaybeNumber(phMin),
    phMax: toMaybeNumber(phMax),
    ecMin: toMaybeNumber(ecMin),
    ecMax: toMaybeNumber(ecMax),
    temperaturaMinC: toMaybeNumber(temperaturaMinC),
    temperaturaMaxC: toMaybeNumber(temperaturaMaxC),
    observacoes,
    ativo,
  });

  const handleSave = async () => {
    if (!targetId) return;
    if (!nomeComum.trim()) {
      Alert.alert('Atenção', 'Informe o nome da verdura.');
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload();
      if (editingId) {
        await updateHydroVerdura(editingId, payload, targetId);
      } else {
        await createHydroVerdura(payload, targetId);
      }
      await load();
      resetForm();
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Não foi possível salvar a verdura.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (item: HydroVerdura) => {
    if (!targetId) return;
    const nextActive = item.ativo === false;
    try {
      await setHydroVerduraActive(item.id, nextActive, targetId);
      await load();
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Não foi possível atualizar o status.');
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" color={COLORS.primary} style={styles.centered} />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={visibleVerduras}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View>
            <View style={styles.heroCard}>
              <Text style={styles.heroTitle}>Catálogo de Verduras</Text>
              <Text style={styles.heroText}>
                Cadastre uma vez e selecione nas bancadas para padronizar cultura, variedade e faixas técnicas.
              </Text>
              <View style={[styles.heroActions, isCompactLayout && styles.heroActionsCompact]}>
                <TouchableOpacity
                  style={[styles.heroBtn, styles.heroBtnPrimary, isCompactLayout && styles.heroBtnCompact]}
                  onPress={resetForm}
                >
                  <MaterialCommunityIcons name="plus" size={18} color={COLORS.textLight} />
                  <Text style={styles.heroBtnPrimaryText}>Nova Verdura</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.heroBtn, styles.heroBtnSecondary, isCompactLayout && styles.heroBtnCompact]}
                  onPress={() => setShowInactive((prev) => !prev)}
                >
                  <Text style={styles.heroBtnSecondaryText}>
                    {showInactive ? 'Ocultar inativas' : 'Mostrar inativas'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formCard}>
              <View style={styles.formInner}>
                <Text style={styles.formTitle}>{isEditMode ? 'Editar Verdura' : 'Cadastrar Verdura'}</Text>

                <Text style={styles.label}>Nome comum *</Text>
                <TextInput
                  style={styles.input}
                  value={nomeComum}
                  onChangeText={setNomeComum}
                  placeholder="Ex: Alface"
                  placeholderTextColor={COLORS.textPlaceholder}
                />

                <View style={[styles.row, isCompactLayout && styles.rowCompact]}>
                  <View style={styles.col}>
                    <Text style={styles.label}>Nome científico</Text>
                    <TextInput
                      style={styles.input}
                      value={nomeCientifico}
                      onChangeText={setNomeCientifico}
                      placeholder="Ex: Lactuca sativa"
                      placeholderTextColor={COLORS.textPlaceholder}
                    />
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.label}>Variedade padrão</Text>
                    <TextInput
                      style={styles.input}
                      value={variedadePadrao}
                      onChangeText={setVariedadePadrao}
                      placeholder="Ex: Americana"
                      placeholderTextColor={COLORS.textPlaceholder}
                    />
                  </View>
                </View>

                <View style={[styles.row, isCompactLayout && styles.rowCompact]}>
                  <View style={styles.col}>
                    <Text style={styles.label}>Ciclo (dias)</Text>
                    <TextInput
                      style={styles.input}
                      value={cicloDias}
                      onChangeText={setCicloDias}
                      keyboardType="numeric"
                      placeholder="Ex: 45"
                      placeholderTextColor={COLORS.textPlaceholder}
                    />
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.label}>Espaçamento (cm)</Text>
                    <TextInput
                      style={styles.input}
                      value={espacamentoCm}
                      onChangeText={setEspacamentoCm}
                      keyboardType="numeric"
                      placeholder="Ex: 25"
                      placeholderTextColor={COLORS.textPlaceholder}
                    />
                  </View>
                </View>

                <View style={[styles.row, isCompactLayout && styles.rowCompact]}>
                  <View style={styles.col}>
                    <Text style={styles.label}>pH mínimo</Text>
                    <TextInput
                      style={styles.input}
                      value={phMin}
                      onChangeText={setPhMin}
                      keyboardType="decimal-pad"
                      placeholder="Ex: 5.5"
                      placeholderTextColor={COLORS.textPlaceholder}
                    />
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.label}>pH máximo</Text>
                    <TextInput
                      style={styles.input}
                      value={phMax}
                      onChangeText={setPhMax}
                      keyboardType="decimal-pad"
                      placeholder="Ex: 6.5"
                      placeholderTextColor={COLORS.textPlaceholder}
                    />
                  </View>
                </View>

                <View style={[styles.row, isCompactLayout && styles.rowCompact]}>
                  <View style={styles.col}>
                    <Text style={styles.label}>EC mínimo</Text>
                    <TextInput
                      style={styles.input}
                      value={ecMin}
                      onChangeText={setEcMin}
                      keyboardType="decimal-pad"
                      placeholder="Ex: 1.2"
                      placeholderTextColor={COLORS.textPlaceholder}
                    />
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.label}>EC máximo</Text>
                    <TextInput
                      style={styles.input}
                      value={ecMax}
                      onChangeText={setEcMax}
                      keyboardType="decimal-pad"
                      placeholder="Ex: 1.8"
                      placeholderTextColor={COLORS.textPlaceholder}
                    />
                  </View>
                </View>

                <View style={[styles.row, isCompactLayout && styles.rowCompact]}>
                  <View style={styles.col}>
                    <Text style={styles.label}>Temp. mínima (°C)</Text>
                    <TextInput
                      style={styles.input}
                      value={temperaturaMinC}
                      onChangeText={setTemperaturaMinC}
                      keyboardType="decimal-pad"
                      placeholder="Ex: 16"
                      placeholderTextColor={COLORS.textPlaceholder}
                    />
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.label}>Temp. máxima (°C)</Text>
                    <TextInput
                      style={styles.input}
                      value={temperaturaMaxC}
                      onChangeText={setTemperaturaMaxC}
                      keyboardType="decimal-pad"
                      placeholder="Ex: 24"
                      placeholderTextColor={COLORS.textPlaceholder}
                    />
                  </View>
                </View>

                <Text style={styles.label}>Observações técnicas</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={observacoes}
                  onChangeText={setObservacoes}
                  multiline
                  placeholder="Ex: sensível a calor acima de 28°C..."
                  placeholderTextColor={COLORS.textPlaceholder}
                />

                <View style={styles.toggleRow}>
                  <TouchableOpacity
                    style={[styles.toggleBtn, ativo && styles.toggleBtnActive]}
                    onPress={() => setAtivo(true)}
                  >
                    <Text style={[styles.toggleText, ativo && styles.toggleTextActive]}>Ativa</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.toggleBtn, !ativo && styles.toggleBtnActive]}
                    onPress={() => setAtivo(false)}
                  >
                    <Text style={[styles.toggleText, !ativo && styles.toggleTextActive]}>Inativa</Text>
                  </TouchableOpacity>
                </View>

                <View style={[styles.formActions, isCompactLayout && styles.formActionsCompact]}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionSave]}
                    onPress={handleSave}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator color={COLORS.textLight} />
                    ) : (
                      <Text style={styles.actionSaveText}>{isEditMode ? 'Salvar Alterações' : 'Cadastrar Verdura'}</Text>
                    )}
                  </TouchableOpacity>
                  {isEditMode ? (
                    <TouchableOpacity style={[styles.actionBtn, styles.actionCancel]} onPress={resetForm}>
                      <Text style={styles.actionCancelText}>Cancelar edição</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            </View>

            <Text style={styles.listTitle}>Verduras cadastradas</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Nenhuma verdura cadastrada.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.itemCard, item.ativo === false && styles.itemCardInactive]}>
            <View style={styles.itemHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>
                  {item.nomeComum}
                  {item.variedadePadrao ? ` • ${item.variedadePadrao}` : ''}
                </Text>
                <Text style={styles.itemSub}>
                  {item.nomeCientifico || 'Sem nome científico'} • {item.ativo === false ? 'Inativa' : 'Ativa'}
                </Text>
              </View>
              <View style={styles.itemActions}>
                <TouchableOpacity style={styles.iconBtn} onPress={() => populateForm(item)}>
                  <MaterialCommunityIcons name="pencil" size={18} color={COLORS.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconBtn} onPress={() => handleToggleActive(item)}>
                  <MaterialCommunityIcons
                    name={item.ativo === false ? 'toggle-switch-off-outline' : 'toggle-switch-outline'}
                    size={20}
                    color={item.ativo === false ? COLORS.textMuted : COLORS.success}
                  />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.tagsRow}>
              {item.cicloDias != null ? <Text style={styles.tag}>Ciclo {item.cicloDias}d</Text> : null}
              {item.phMin != null || item.phMax != null ? (
                <Text style={styles.tag}>pH {item.phMin ?? '-'} a {item.phMax ?? '-'}</Text>
              ) : null}
              {item.ecMin != null || item.ecMax != null ? (
                <Text style={styles.tag}>EC {item.ecMin ?? '-'} a {item.ecMax ?? '-'}</Text>
              ) : null}
            </View>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  heroCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  heroTitle: { color: COLORS.textPrimary, fontSize: TYPOGRAPHY.h3, fontWeight: '900' },
  heroText: { color: COLORS.textSecondary, fontWeight: '700', marginTop: 6, lineHeight: 18 },
  heroActions: { flexDirection: 'row', gap: 8, marginTop: SPACING.md },
  heroActionsCompact: { flexDirection: 'column' },
  heroBtn: { borderRadius: RADIUS.md, height: 40, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroBtnCompact: { width: '100%', justifyContent: 'center' },
  heroBtnPrimary: { backgroundColor: COLORS.primary },
  heroBtnSecondary: { backgroundColor: COLORS.surfaceMuted, borderWidth: 1, borderColor: COLORS.border },
  heroBtnPrimaryText: { color: COLORS.textLight, fontWeight: '800' },
  heroBtnSecondaryText: { color: COLORS.textSecondary, fontWeight: '700' },
  formCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  formInner: { width: '100%' },
  formTitle: { color: COLORS.secondary, fontSize: TYPOGRAPHY.h3, fontWeight: '900', marginBottom: SPACING.sm },
  label: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '800', marginBottom: 6 },
  input: {
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  textArea: { minHeight: 88, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 10 },
  rowCompact: { flexDirection: 'column', gap: 0 },
  col: { flex: 1 },
  toggleRow: { flexDirection: 'row', gap: 8, marginBottom: SPACING.md },
  toggleBtn: {
    flex: 1,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceMuted,
    paddingVertical: 8,
    alignItems: 'center',
  },
  toggleBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  toggleText: { color: COLORS.textSecondary, fontWeight: '700' },
  toggleTextActive: { color: COLORS.textLight },
  formActions: { flexDirection: 'row', gap: 8 },
  formActionsCompact: { flexDirection: 'column' },
  actionBtn: { flex: 1, borderRadius: RADIUS.md, height: 48, justifyContent: 'center', alignItems: 'center' },
  actionSave: { backgroundColor: COLORS.primary },
  actionCancel: { backgroundColor: COLORS.surfaceMuted, borderWidth: 1, borderColor: COLORS.border },
  actionSaveText: { color: COLORS.textLight, fontWeight: '900' },
  actionCancelText: { color: COLORS.textSecondary, fontWeight: '800' },
  listTitle: { color: COLORS.textSecondary, fontWeight: '900', fontSize: 14, marginBottom: SPACING.sm },
  emptyBox: {
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  emptyText: { color: COLORS.textSecondary, fontWeight: '700' },
  itemCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  itemCardInactive: { opacity: 0.68 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemTitle: { color: COLORS.textPrimary, fontWeight: '900', fontSize: 14 },
  itemSub: { color: COLORS.textSecondary, fontWeight: '700', marginTop: 3, fontSize: 12 },
  itemActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  tag: {
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.cBFDBFE,
    color: COLORS.primary,
    fontWeight: '800',
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});

export default HidroponiaVerdurasScreen;
