import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../hooks/useAuth';
import { listEstufas } from '../../../services/estufaService';
import { Estufa, HydroSetor } from '../../../types/domain';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../../constants/theme';
import { RootStackParamList } from '../../../navigation/types';
import { createHydroLote, getHydroLoteById, updateHydroLote } from '../services/hidroponiaLoteService';
import { listHydroVerduras } from '../services/hidroponiaVerduraService';
import { HydroVerdura } from '../types';
import { createHydroLotCode, toNumber } from '../utils';
import { useAppSettings } from '../../../hooks/useAppSettings';

type Props = NativeStackScreenProps<RootStackParamList, 'HidroponiaLoteForm'>;

const HidroponiaLoteFormScreen = ({ navigation, route }: Props) => {
  const { user, selectedTenantId } = useAuth();
  const { settings } = useAppSettings();
  const insets = useSafeAreaInsets();
  const targetId = selectedTenantId || user?.uid;
  const loteId = route.params?.loteId;
  const routeEstufaId = route.params?.estufaId;
  const routeSetorId = route.params?.setorId;
  const isEditMode = !!loteId;

  const [estufas, setEstufas] = useState<Estufa[]>([]);
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [verduras, setVerduras] = useState<HydroVerdura[]>([]);
  const [estufaId, setEstufaId] = useState(routeEstufaId || '');
  const [setorId, setSetorId] = useState(routeSetorId || '');
  const [codigoLote, setCodigoLote] = useState('');
  const [quantidadeInicial, setQuantidadeInicial] = useState('');
  const [origemMaterialNome, setOrigemMaterialNome] = useState('');
  const [origemMaterialDocumento, setOrigemMaterialDocumento] = useState('');
  const [nomeOperacional, setNomeOperacional] = useState('');
  const [verduraId, setVerduraId] = useState('');
  const [culturaBase, setCulturaBase] = useState('');
  const [variedadeBase, setVariedadeBase] = useState('');

  const hydroEstufas = useMemo(
    () =>
      estufas.filter(
        (item) =>
          (item.productionModes || []).includes('hydroponics') ||
          item.tipo === 'hidroponia' ||
          !!item.hydroponicSystemType
      ),
    [estufas]
  );
  const hasNoHydroEstufas = hydroEstufas.length === 0;
  const selectedEstufa = useMemo(
    () => hydroEstufas.find((item) => item.id === estufaId) || null,
    [hydroEstufas, estufaId]
  );
  const motorById = useMemo(
    () => new Map((selectedEstufa?.motores || []).map((motor) => [motor.id, motor.nome])),
    [selectedEstufa]
  );
  const setoresDaEstufa = useMemo(() => selectedEstufa?.setores || [], [selectedEstufa]);
  const selectedSetor = useMemo(
    () => setoresDaEstufa.find((item) => item.id === setorId) || null,
    [setoresDaEstufa, setorId]
  );
  const hasNoSetores = setoresDaEstufa.length === 0;
  const canSave =
    !saving &&
    !hasNoHydroEstufas &&
    !!setorId &&
    !hasNoSetores &&
    !!origemMaterialNome.trim() &&
    (!!verduraId || !!culturaBase.trim()) &&
    toNumber(quantidadeInicial) > 0;

  useEffect(() => {
    navigation.setOptions({ title: isEditMode ? 'Editar Produção' : 'Iniciar Produção' });
  }, [navigation, isEditMode]);

  useEffect(() => {
    const load = async () => {
      if (!targetId) return;
      setLoading(true);
      try {
        const [estufasRes, verdurasRes] = await Promise.all([
          listEstufas(targetId),
          listHydroVerduras(targetId),
        ]);
        setEstufas(estufasRes);
        setVerduras(verdurasRes);
        const hydroOnly = estufasRes.filter(
          (item) =>
            (item.productionModes || []).includes('hydroponics') ||
            item.tipo === 'hidroponia' ||
            !!item.hydroponicSystemType
        );
        if (!estufaId && hydroOnly.length === 1) setEstufaId(hydroOnly[0].id);
        if (hydroOnly.length === 0) setEstufaId('');
        if (routeSetorId) setSetorId(routeSetorId);

        if (loteId) {
          const lote = await getHydroLoteById(loteId, targetId);
          if (lote) {
            setEstufaId(lote.estufaId);
            setSetorId(lote.setorId || '');
            setCodigoLote(lote.codigoLote || '');
            setQuantidadeInicial(String(Number(lote.quantidadeInicial || 0)));
            setOrigemMaterialNome(lote.origemMaterialNome || '');
            setOrigemMaterialDocumento(lote.origemMaterialDocumento || '');
            setNomeOperacional(lote.nomeOperacional || '');
            setVerduraId(lote.verduraId || '');
            setCulturaBase(lote.culturaBase || '');
            setVariedadeBase(lote.variedadeBase || '');
          }
        }
      } catch (error) {
        Alert.alert('Erro', 'Não foi possível carregar os dados.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [targetId, loteId, routeSetorId]);

  useEffect(() => {
    if (!isEditMode && nomeOperacional.trim() && !codigoLote.trim()) {
      setCodigoLote(createHydroLotCode(nomeOperacional, new Date()));
    }
  }, [nomeOperacional, codigoLote, isEditMode]);

  useEffect(() => {
    if (hasNoHydroEstufas) return;
    if (estufaId && hydroEstufas.some((item) => item.id === estufaId)) return;
    if (hydroEstufas[0]?.id) setEstufaId(hydroEstufas[0].id);
  }, [estufaId, hydroEstufas, hasNoHydroEstufas]);

  useEffect(() => {
    if (!selectedEstufa) {
      setSetorId('');
      return;
    }
    if (setorId && (selectedEstufa.setores || []).some((item) => item.id === setorId)) return;
    const firstSetorId = selectedEstufa.setores?.[0]?.id || '';
    setSetorId(firstSetorId);
  }, [selectedEstufa, setorId]);

  const handleSave = async () => {
    if (!targetId) return;
    if (hasNoHydroEstufas) {
      Alert.alert('Estufa obrigatória', 'Cadastre uma estufa antes de iniciar a produção hidropônica.');
      return;
    }
    if (!estufaId) return Alert.alert('Atenção', 'Selecione uma estufa.');
    if (!hydroEstufas.some((item) => item.id === estufaId)) {
      Alert.alert('Atenção', 'Selecione uma estufa válida para continuar.');
      return;
    }
    if (hasNoSetores) {
      Alert.alert('Setor obrigatório', 'Cadastre ao menos um setor nessa estufa para iniciar a produção.');
      return;
    }
    if (!setorId) {
      Alert.alert('Atenção', 'Selecione um setor para vincular esta produção.');
      return;
    }
    const qtdInicial = toNumber(quantidadeInicial);
    if (!Number.isFinite(qtdInicial) || qtdInicial < 0) {
      Alert.alert('Atenção', 'Informe uma quantidade inicial válida (0 ou maior).');
      return;
    }
    if (qtdInicial <= 0) {
      Alert.alert('Atenção', 'A quantidade inicial deve ser maior que zero.');
      return;
    }
    if (!origemMaterialNome.trim()) {
      Alert.alert('Atenção', 'Informe a origem do material para rastreabilidade.');
      return;
    }
    if (!verduraId && !culturaBase.trim()) {
      Alert.alert('Atenção', 'Selecione uma verdura cadastrada ou informe a cultura manualmente.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        codigoLote,
        setorId,
        quantidadeInicial: qtdInicial,
        origemMaterialNome: origemMaterialNome.trim(),
        origemMaterialDocumento: origemMaterialDocumento.trim() || null,
        nomeOperacional,
        verduraId: verduraId || null,
        culturaBase: culturaBase.trim() || null,
        variedadeBase: variedadeBase.trim() || null,
      };

      if (loteId) {
        await updateHydroLote(loteId, payload, targetId);
        navigation.goBack();
      } else {
        const newId = await createHydroLote(payload, targetId);
        // Após criar o lote fixo, levamos para o detalhe onde ele poderá ocupar uma bancada
        navigation.replace('HidroponiaLoteDetail', { loteId: newId });
      }
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Não foi possível salvar a produção.');
    } finally {
      setSaving(false);
    }
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
    >
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Como Funciona a Produção Hidropônica?</Text>
        <Text style={styles.infoText}>
          A produção é o registro do seu ciclo curto. Ao iniciar, ela fica vinculada ao setor escolhido.
          {"\n\n"}
          A verdura cadastrada será sugerida automaticamente na movimentação para evitar digitação manual.
        </Text>
      </View>

      <Text style={styles.label}>Verdura cadastrada</Text>
      {verduras.length === 0 ? (
        <View style={styles.warningBox}>
          <Text style={styles.warningTitle}>Sem verduras cadastradas</Text>
          <Text style={styles.warningText}>Cadastre verduras para padronizar cultura e parâmetros.</Text>
          <TouchableOpacity style={styles.warningBtn} onPress={() => navigation.navigate('HidroponiaVerduras')}>
            <Text style={styles.warningBtnText}>Cadastrar Verduras</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.optionWrap}>
          {verduras.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.optionChip, verduraId === item.id && styles.optionChipActive]}
              onPress={() => {
                setVerduraId(item.id);
                setCulturaBase(item.nomeComum || '');
                if (!variedadeBase.trim()) {
                  setVariedadeBase(item.variedadePadrao || '');
                }
              }}
            >
              <Text style={[styles.optionText, verduraId === item.id && styles.optionTextActive]}>
                {item.nomeComum}
                {item.variedadePadrao ? ` • ${item.variedadePadrao}` : ''}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.optionChip, !verduraId && styles.optionChipActive]}
            onPress={() => setVerduraId('')}
          >
            <Text style={[styles.optionText, !verduraId && styles.optionTextActive]}>Outro (manual)</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.label}>Cultura</Text>
      <TextInput
        style={[styles.input, !!verduraId && styles.readOnlyInput]}
        value={culturaBase}
        onChangeText={setCulturaBase}
        editable={!verduraId}
        placeholder="Ex: Alface"
        placeholderTextColor={COLORS.textPlaceholder}
      />

      <Text style={styles.label}>Variedade base</Text>
      <TextInput
        style={styles.input}
        value={variedadeBase}
        onChangeText={setVariedadeBase}
        placeholder="Ex: Americana"
        placeholderTextColor={COLORS.textPlaceholder}
      />

      <Text style={styles.label}>Estufa</Text>
      {hasNoHydroEstufas ? (
        <View style={styles.warningBox}>
          <Text style={styles.warningTitle}>Nenhuma estufa disponível</Text>
          <Text style={styles.warningText}>Cadastre uma estufa para poder iniciar a produção hidropônica.</Text>
          <TouchableOpacity style={styles.warningBtn} onPress={() => navigation.navigate('EstufaForm')}>
            <Text style={styles.warningBtnText}>Cadastrar Estufa</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.optionWrap}>
          {hydroEstufas.map((item) => (
            <TouchableOpacity key={item.id} style={[styles.optionChip, estufaId === item.id && styles.optionChipActive]} onPress={() => setEstufaId(item.id)}>
              <Text style={[styles.optionText, estufaId === item.id && styles.optionTextActive]}>{item.nome}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Text style={styles.label}>Setor da produção</Text>
      {hasNoHydroEstufas ? null : hasNoSetores ? (
        <View style={styles.warningBox}>
          <Text style={styles.warningTitle}>Sem setores nessa estufa</Text>
          <Text style={styles.warningText}>
            Crie setores no layout da estufa para poder vincular as produções corretamente.
          </Text>
          {estufaId ? (
            <TouchableOpacity
              style={styles.warningBtn}
              onPress={() => navigation.navigate('HidroponiaEstufaLayout', { estufaId })}
            >
              <Text style={styles.warningBtnText}>Configurar Setores</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : (
        <View style={styles.optionWrap}>
          {setoresDaEstufa.map((item: HydroSetor) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.optionChip, setorId === item.id && styles.optionChipActive]}
              onPress={() => setSetorId(item.id)}
            >
              <Text style={[styles.optionText, setorId === item.id && styles.optionTextActive]}>
                {item.nome} • Motor: {motorById.get(item.motorId) || 'Não vinculado'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {selectedSetor ? (
        <Text style={styles.helpText}>
          Motor em uso no setor: {motorById.get(selectedSetor.motorId) || 'Não vinculado'}.
        </Text>
      ) : null}

      <Text style={styles.label}>Nome da produção / Identificador operacional</Text>
      <TextInput style={styles.input} value={nomeOperacional} onChangeText={setNomeOperacional} placeholder="Ex: Ciclo Maio - Alface" placeholderTextColor={COLORS.textPlaceholder} />

      <Text style={styles.label}>Quantidade inicial da produção (mudas/sementes)</Text>
      <TextInput
        style={[styles.input, isEditMode && styles.readOnlyInput]}
        value={quantidadeInicial}
        onChangeText={setQuantidadeInicial}
        keyboardType="numeric"
        editable={!isEditMode}
        placeholder="Ex: 4000"
        placeholderTextColor={COLORS.textPlaceholder}
      />
      <Text style={styles.helpText}>
        {isEditMode
          ? 'A quantidade inicial é travada após criação para preservar o histórico do ciclo curto.'
          : 'Este saldo inicial poderá ser distribuído em várias bancadas (ex: 3000 em uma, 1000 em outra).'}
      </Text>

      <Text style={styles.label}>Origem do material (obrigatório)</Text>
      <TextInput
        style={styles.input}
        value={origemMaterialNome}
        onChangeText={setOrigemMaterialNome}
        placeholder="Ex: Sementes Boa Colheita Ltda"
        placeholderTextColor={COLORS.textPlaceholder}
      />

      <Text style={styles.label}>Documento da origem (NF/Lote fornecedor)</Text>
      <TextInput
        style={styles.input}
        value={origemMaterialDocumento}
        onChangeText={setOrigemMaterialDocumento}
        placeholder="Ex: NF 12345 / Lote SF-2026-04"
        placeholderTextColor={COLORS.textPlaceholder}
      />

      <Text style={styles.label}>Código da produção (Fixo)</Text>
      <TextInput
        style={[styles.input, isEditMode && styles.readOnlyInput]}
        value={codigoLote}
        onChangeText={setCodigoLote}
        editable={!isEditMode}
        placeholder="Gerado automaticamente"
        placeholderTextColor={COLORS.textPlaceholder}
      />
      <Text style={styles.helpText}>
        Este código identifica a produção em todo o sistema e não poderá ser alterado depois.
      </Text>

      <TouchableOpacity style={[styles.primaryBtn, !canSave && styles.primaryBtnDisabled]} onPress={handleSave} disabled={!canSave}>
        {saving ? <ActivityIndicator color={COLORS.textLight} /> : <Text style={styles.primaryBtnText}>{isEditMode ? 'Salvar Alterações' : 'Iniciar Produção'}</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: SPACING.xl, paddingBottom: SPACING.xxl },
  infoCard: { backgroundColor: COLORS.infoSoft, borderRadius: RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.xl, borderWidth: 1, borderColor: COLORS.cBFDBFE },
  infoTitle: { color: COLORS.info, fontSize: TYPOGRAPHY.h3, fontWeight: '900', marginBottom: 6 },
  infoText: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 19, fontWeight: '700' },
  label: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '800', marginBottom: 6 },
  input: { backgroundColor: COLORS.surfaceMuted, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: 14, color: COLORS.textPrimary, marginBottom: SPACING.md },
  readOnlyInput: { backgroundColor: COLORS.surface, color: COLORS.textMuted },
  optionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: SPACING.lg },
  optionChip: { borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, paddingHorizontal: 14, paddingVertical: 10 },
  optionChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  optionText: { color: COLORS.textSecondary, fontWeight: '800', fontSize: 13 },
  optionTextActive: { color: COLORS.textLight },
  warningBox: { borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.cBFDBFE, backgroundColor: COLORS.infoSoft, padding: SPACING.md, marginBottom: SPACING.lg },
  warningTitle: { color: COLORS.info, fontWeight: '900', fontSize: 14 },
  warningText: { color: COLORS.textSecondary, fontWeight: '700', marginTop: 4, fontSize: 12 },
  warningBtn: { marginTop: SPACING.sm, alignSelf: 'flex-start', borderRadius: RADIUS.pill, backgroundColor: COLORS.info, paddingHorizontal: 12, paddingVertical: 8 },
  warningBtnText: { color: COLORS.textLight, fontWeight: '900', fontSize: 12 },
  helpText: { color: COLORS.textMuted, fontSize: 11, lineHeight: 16, marginTop: -8, marginBottom: SPACING.md },
  primaryBtn: { height: 52, borderRadius: RADIUS.md, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginTop: SPACING.xl, ...SHADOWS.card },
  primaryBtnDisabled: { opacity: 0.55 },
  primaryBtnText: { color: COLORS.textLight, fontWeight: '900', fontSize: TYPOGRAPHY.body },
});

export default HidroponiaLoteFormScreen;
