import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../hooks/useAuth';
import { listEstufas } from '../../../services/estufaService';
import { Estufa } from '../../../types/domain';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../../constants/theme';
import { RootStackParamList } from '../../../navigation/types';
import { HYDRO_ACTION_OPTIONS } from '../constants';
import { createHydroLeitura } from '../services/hidroponiaLeituraService';
import { HydroLeituraAcao } from '../types';
import { toNumber } from '../utils';
import { useAppSettings } from '../../../hooks/useAppSettings';
import { sanitizeDecimalInput, sanitizeIntegerInput } from '../../../utils/numericFields';

type Props = NativeStackScreenProps<RootStackParamList, 'HidroponiaLeituraForm'>;

const nullableNumber = (value: string) => {
  if (!value.trim()) return null;
  return toNumber(value);
};

const HidroponiaLeituraFormScreen = ({ navigation, route }: Props) => {
  const { user, selectedTenantId } = useAuth();
  const { settings } = useAppSettings();
  const insets = useSafeAreaInsets();
  const targetId = selectedTenantId || user?.uid;
  const [estufas, setEstufas] = useState<Estufa[]>([]);
  const [estufaId, setEstufaId] = useState(route.params?.estufaId || '');
  const [acao, setAcao] = useState<HydroLeituraAcao>('medicao');
  const [motorId, setMotorId] = useState('');
  const [aplicarEmTodosSetoresDoMotor, setAplicarEmTodosSetoresDoMotor] = useState(false);
  const [setoresAplicadosIds, setSetoresAplicadosIds] = useState<string[]>([]);
  const [pH, setPH] = useState('');
  const [ce, setCe] = useState('');
  const [temperaturaSolucao, setTemperaturaSolucao] = useState('');
  const [temperaturaAmbiente, setTemperaturaAmbiente] = useState('');
  const [umidadeAmbiente, setUmidadeAmbiente] = useState('');
  const [volumeLitros, setVolumeLitros] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const selectedEstufa = useMemo(
    () => estufas.find((item) => item.id === estufaId) || null,
    [estufas, estufaId]
  );
  const motoresDaEstufa = selectedEstufa?.motores || [];
  const setoresDaEstufa = selectedEstufa?.setores || [];
  const setoresDoMotorSelecionado = useMemo(
    () => setoresDaEstufa.filter((setor) => setor.motorId === motorId),
    [setoresDaEstufa, motorId]
  );

  useEffect(() => {
    const load = async () => {
      if (!targetId) return;
      setLoading(true);
      try {
        const result = await listEstufas(targetId);
        setEstufas(result);
        if (!estufaId && result.length === 1) setEstufaId(result[0].id);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [targetId]);

  useEffect(() => {
    if (!selectedEstufa) {
      setMotorId('');
      setSetoresAplicadosIds([]);
      return;
    }

    if (motorId && !motoresDaEstufa.some((motor) => motor.id === motorId)) {
      setMotorId('');
      setSetoresAplicadosIds([]);
    }
  }, [selectedEstufa, motoresDaEstufa, motorId]);

  useEffect(() => {
    if (!motorId) {
      setSetoresAplicadosIds([]);
      setAplicarEmTodosSetoresDoMotor(false);
      return;
    }

    const allowed = new Set(setoresDoMotorSelecionado.map((setor) => setor.id));
    setSetoresAplicadosIds((current) => current.filter((item) => allowed.has(item)));
  }, [motorId, setoresDoMotorSelecionado]);

  const toggleSetor = (setorId: string) => {
    setSetoresAplicadosIds((current) =>
      current.includes(setorId) ? current.filter((item) => item !== setorId) : [...current, setorId]
    );
  };

  const handleSave = async () => {
    if (!targetId) return;
    if (!estufaId) return Alert.alert('Atenção', 'Selecione uma estufa.');
    const hasReading = !!pH.trim() || !!ce.trim() || !!temperaturaSolucao.trim() || !!temperaturaAmbiente.trim() || !!umidadeAmbiente.trim() || !!volumeLitros.trim();
    if (!hasReading && acao === 'medicao') return Alert.alert('Atenção', 'Informe pelo menos uma leitura.');
    if (acao === 'adicionar_nutriente' && motorId && !aplicarEmTodosSetoresDoMotor && setoresAplicadosIds.length === 0) {
      return Alert.alert('Atenção', 'Selecione ao menos um setor do motor ou marque todos os setores.');
    }

    setSaving(true);
    try {
      await createHydroLeitura(
        {
          estufaId,
          motorId: motorId || null,
          aplicarEmTodosSetoresDoMotor,
          setoresAplicadosIds: motorId && !aplicarEmTodosSetoresDoMotor ? setoresAplicadosIds : [],
          loteId: route.params?.loteId || null,
          reservatorioId: route.params?.reservatorioId || null,
          pH: nullableNumber(pH),
          condutividadeEletrica: nullableNumber(ce),
          temperaturaSolucao: nullableNumber(temperaturaSolucao),
          temperaturaAmbiente: nullableNumber(temperaturaAmbiente),
          umidadeAmbiente: nullableNumber(umidadeAmbiente),
          volumeLitros: nullableNumber(volumeLitros),
          acao,
          responsavel,
          observacoes,
        },
        targetId
      );
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Não foi possível registrar a leitura.');
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
      <Text style={styles.sectionTitle}>Local da leitura</Text>
      <Text style={styles.label}>Estufa</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionWrap}>
        {estufas.map((item) => (
          <TouchableOpacity key={item.id} style={[styles.optionChip, estufaId === item.id && styles.optionChipActive]} onPress={() => setEstufaId(item.id)}>
            <Text style={[styles.optionText, estufaId === item.id && styles.optionTextActive]}>{item.nome}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.sectionTitle}>Ação</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionWrap}>
        {HYDRO_ACTION_OPTIONS.map((item) => (
          <TouchableOpacity key={item.value} style={[styles.optionChip, acao === item.value && styles.optionChipActive]} onPress={() => setAcao(item.value)}>
            <Text style={[styles.optionText, acao === item.value && styles.optionTextActive]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {acao === 'adicionar_nutriente' ? (
        <>
          <Text style={styles.sectionTitle}>Escopo da Fertilização</Text>
          <Text style={styles.label}>Motor (opcional)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionWrap}>
            <TouchableOpacity
              style={[styles.optionChip, motorId === '' && styles.optionChipActive]}
              onPress={() => setMotorId('')}
            >
              <Text style={[styles.optionText, motorId === '' && styles.optionTextActive]}>Sem motor específico</Text>
            </TouchableOpacity>
            {motoresDaEstufa.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.optionChip, motorId === item.id && styles.optionChipActive]}
                onPress={() => setMotorId(item.id)}
              >
                <Text style={[styles.optionText, motorId === item.id && styles.optionTextActive]}>
                  {item.nome}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {motorId ? (
            <>
              <Text style={styles.label}>Setores do motor</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionWrap}>
                <TouchableOpacity
                  style={[styles.optionChip, aplicarEmTodosSetoresDoMotor && styles.optionChipActive]}
                  onPress={() => setAplicarEmTodosSetoresDoMotor(true)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      aplicarEmTodosSetoresDoMotor && styles.optionTextActive,
                    ]}
                  >
                    Todos os setores
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.optionChip, !aplicarEmTodosSetoresDoMotor && styles.optionChipActive]}
                  onPress={() => setAplicarEmTodosSetoresDoMotor(false)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      !aplicarEmTodosSetoresDoMotor && styles.optionTextActive,
                    ]}
                  >
                    Selecionar setores
                  </Text>
                </TouchableOpacity>
              </ScrollView>

              {!aplicarEmTodosSetoresDoMotor ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionWrap}>
                  {setoresDoMotorSelecionado.map((setor) => {
                    const selected = setoresAplicadosIds.includes(setor.id);
                    return (
                      <TouchableOpacity
                        key={setor.id}
                        style={[styles.optionChip, selected && styles.optionChipActive]}
                        onPress={() => toggleSetor(setor.id)}
                      >
                        <Text style={[styles.optionText, selected && styles.optionTextActive]}>
                          {setor.nome}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              ) : null}
            </>
          ) : null}
        </>
      ) : null}

      <Text style={styles.sectionTitle}>Medições</Text>
      <Text style={styles.label}>pH</Text>
      <TextInput style={styles.input} value={pH} onChangeText={(value) => setPH(sanitizeDecimalInput(value))} keyboardType="numeric" placeholder="Ex: 6,0" placeholderTextColor={COLORS.textPlaceholder} />

      <Text style={styles.label}>Condutividade elétrica (CE)</Text>
      <TextInput style={styles.input} value={ce} onChangeText={(value) => setCe(sanitizeDecimalInput(value))} keyboardType="numeric" placeholder="Ex: 1,8" placeholderTextColor={COLORS.textPlaceholder} />

      <Text style={styles.label}>Temperatura da solução (°C)</Text>
      <TextInput style={styles.input} value={temperaturaSolucao} onChangeText={(value) => setTemperaturaSolucao(sanitizeDecimalInput(value))} keyboardType="numeric" placeholder="Ex: 22" placeholderTextColor={COLORS.textPlaceholder} />

      <Text style={styles.label}>Temperatura ambiente (°C)</Text>
      <TextInput style={styles.input} value={temperaturaAmbiente} onChangeText={(value) => setTemperaturaAmbiente(sanitizeDecimalInput(value))} keyboardType="numeric" placeholder="Ex: 28" placeholderTextColor={COLORS.textPlaceholder} />

      <Text style={styles.label}>Umidade ambiente (%)</Text>
      <TextInput style={styles.input} value={umidadeAmbiente} onChangeText={(value) => setUmidadeAmbiente(sanitizeDecimalInput(value))} keyboardType="numeric" placeholder="Ex: 70" placeholderTextColor={COLORS.textPlaceholder} />

      <Text style={styles.label}>Volume do reservatório (L)</Text>
      <TextInput style={styles.input} value={volumeLitros} onChangeText={(value) => setVolumeLitros(sanitizeIntegerInput(value))} keyboardType="numeric" placeholder="Ex: 500" placeholderTextColor={COLORS.textPlaceholder} />

      <Text style={styles.label}>Responsável</Text>
      <TextInput style={styles.input} value={responsavel} onChangeText={setResponsavel} placeholder="Nome do responsável" placeholderTextColor={COLORS.textPlaceholder} />

      <Text style={styles.label}>Observações</Text>
      <TextInput style={[styles.input, styles.textArea]} value={observacoes} onChangeText={setObservacoes} multiline placeholder="Correções feitas, aspecto das raízes, alertas..." placeholderTextColor={COLORS.textPlaceholder} />

      <TouchableOpacity style={styles.primaryBtn} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color={COLORS.textLight} /> : <Text style={styles.primaryBtnText}>Registrar Leitura</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: SPACING.xl, paddingBottom: SPACING.xxl },
  sectionTitle: { color: COLORS.secondary, fontSize: TYPOGRAPHY.h3, fontWeight: '900', marginBottom: SPACING.md, marginTop: SPACING.sm },
  label: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '800', marginBottom: 6 },
  input: { backgroundColor: COLORS.surfaceMuted, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: 14, color: COLORS.textPrimary, marginBottom: SPACING.md },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  optionWrap: { gap: 8, paddingBottom: SPACING.md },
  optionChip: { borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, paddingHorizontal: 12, paddingVertical: 8 },
  optionChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  optionText: { color: COLORS.textSecondary, fontWeight: '800', fontSize: 12 },
  optionTextActive: { color: COLORS.textLight },
  primaryBtn: { height: 52, borderRadius: RADIUS.md, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginTop: SPACING.md, ...SHADOWS.card },
  primaryBtnText: { color: COLORS.textLight, fontWeight: '900', fontSize: TYPOGRAPHY.body },
});

export default HidroponiaLeituraFormScreen;
