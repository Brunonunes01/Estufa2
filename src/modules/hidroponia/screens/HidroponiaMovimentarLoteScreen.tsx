import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../../hooks/useAuth';
import { getEstufaById } from '../../../services/estufaService';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../../constants/theme';
import { RootStackParamList } from '../../../navigation/types';
import { Estufa, HydroEstrutura, HydroSetor } from '../../../types/domain';
import { HYDRO_STAGE_OPTIONS, getHydroStageLabel } from '../constants';
import { createHydroMovimentacao } from '../services/hidroponiaMovimentacaoService';
import { getHydroLoteById } from '../services/hidroponiaLoteService';
import { listHydroOcupacoesByEstufa } from '../services/hidroponiaOcupacaoService';
import { listHydroVerduras } from '../services/hidroponiaVerduraService';
import { HydroLote, HydroLoteStage, HydroOcupacao, HydroVerdura } from '../types';
import { toNumber } from '../utils';

type Props = NativeStackScreenProps<RootStackParamList, 'HidroponiaMovimentarLote'>;

const HidroponiaMovimentarLoteScreen = ({ navigation, route }: Props) => {
  const { user, selectedTenantId } = useAuth();
  const targetId = selectedTenantId || user?.uid;
  const { loteId, fromOcupacaoId, toSetorId: routeToSetorId, toEstruturaId: routeToEstruturaId } = route.params;
  const [lote, setLote] = useState<HydroLote | null>(null);
  const [fromOcupacao, setFromOcupacao] = useState<HydroOcupacao | null>(null);
  const [estufa, setEstufa] = useState<Estufa | null>(null);
  const [allOcupacoes, setAllOcupacoes] = useState<HydroOcupacao[]>([]);
  const [verduras, setVerduras] = useState<HydroVerdura[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toStage, setToStage] = useState<HydroLoteStage>('bercario');
  const [toSetorId, setToSetorId] = useState(routeToSetorId || '');
  const [toEstruturaId, setToEstruturaId] = useState(routeToEstruturaId || '');
  const [verduraId, setVerduraId] = useState('');
  const [quantidadeMovida, setQuantidadeMovida] = useState('');
  const [perdaNoMovimento, setPerdaNoMovimento] = useState('');
  const [culturaBancada, setCulturaBancada] = useState('');
  const [variedadeBancada, setVariedadeBancada] = useState('');
  const [motivoPerda, setMotivoPerda] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [observacoes, setObservacoes] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!targetId) return;
      setLoading(true);
      try {
        const result = await getHydroLoteById(loteId, targetId);
        setLote(result);
        if (result) {
          const [estufaResult, ocupsRes, verdurasRes] = await Promise.all([
            getEstufaById(result.estufaId, targetId),
            listHydroOcupacoesByEstufa(targetId, result.estufaId),
            listHydroVerduras(targetId),
          ]);
          setEstufa(estufaResult);
          setAllOcupacoes(ocupsRes);
          setVerduras(verdurasRes);

          if (fromOcupacaoId) {
            const found = ocupsRes.find((o) => o.id === fromOcupacaoId);
            if (found) {
              setFromOcupacao(found);
              setVerduraId(found.verduraId || '');
              setQuantidadeMovida(String(found.quantidadeAlocada || ''));
              setCulturaBancada(found.cultura || '');
              setVariedadeBancada(found.variedade || '');

              if (found.fase === 'bercario') setToStage('crescimento_final');
              else if (found.fase === 'crescimento_final') setToStage('pronto_colheita');
              else setToStage(found.fase);
            }
          }

          if (routeToSetorId) {
            setToSetorId(routeToSetorId);
            if (routeToEstruturaId) setToEstruturaId(routeToEstruturaId);
          } else {
            const preferredSetor =
              estufaResult?.setores?.find((item) => item.id === result.setorId) ||
              estufaResult?.setores?.[0];
            if (preferredSetor) {
              setToSetorId(preferredSetor.id);
              if (preferredSetor.estruturas?.[0]) setToEstruturaId(preferredSetor.estruturas[0].id);
            }
          }
          if (!fromOcupacaoId) {
            setVerduraId(result.verduraId || '');
            setCulturaBancada(result.culturaBase || '');
            setVariedadeBancada(result.variedadeBase || '');
          }
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [targetId, loteId, fromOcupacaoId, routeToSetorId, routeToEstruturaId]);

  const setores = estufa?.setores || [];
  const selectedSetor = useMemo(
    () => setores.find((setor) => setor.id === toSetorId) || setores[0] || null,
    [setores, toSetorId]
  );

  const occupiedByStructure = useMemo(() => {
    const map = new Map<string, number>();
    allOcupacoes.forEach((o) => {
      if (o.status === 'ativa') {
        map.set(o.estruturaId, (map.get(o.estruturaId) || 0) + (o.quantidadeAlocada || 0));
      }
    });
    return map;
  }, [allOcupacoes]);

  const selectSetor = (setor: HydroSetor) => {
    setToSetorId(setor.id);
    const firstEstrutura = setor.estruturas?.[0];
    setToEstruturaId(firstEstrutura?.id || '');
  };

  const selectEstrutura = (estrutura: HydroEstrutura) => {
    setToEstruturaId(estrutura.id);
    if (estrutura.tipo === 'bercario') setToStage('bercario');
    if (['perfil', 'canal', 'bancada'].includes(estrutura.tipo)) setToStage('crescimento_final');
  };

  const handleSave = async () => {
    if (!targetId || !lote) return;
    const qtd = toNumber(quantidadeMovida);
    const perda = toNumber(perdaNoMovimento);
    const isExitStage = toStage === 'colhido' || toStage === 'cancelado';

    if (qtd <= 0) return Alert.alert('Atenção', 'Informe a quantidade movimentada.');
    if (perda > qtd) return Alert.alert('Atenção', 'A perda não pode ser maior que a quantidade movimentada.');
    if (!isExitStage && !culturaBancada.trim()) {
      return Alert.alert(
        'Atenção',
        'Selecione uma verdura cadastrada ou informe a cultura manualmente.'
      );
    }

    if (fromOcupacao) {
      if (fromOcupacao.fase === 'pronto_colheita' && !isExitStage) {
        return Alert.alert(
          'Atenção',
          'Produção em bancada final não pode ser movida. Faça a colheita nesta bancada.'
        );
      }
      if (qtd > (fromOcupacao.quantidadeAlocada || 0)) {
        return Alert.alert(
          'Atenção',
          `A quantidade não pode ser maior que o saldo da bancada de origem (${fromOcupacao.quantidadeAlocada} un).`
        );
      }
      if (toEstruturaId === fromOcupacao.estruturaId) {
        return Alert.alert('Atenção', 'Selecione uma bancada de destino diferente da origem.');
      }
    } else if (qtd > Number(lote.saldoDisponivel || 0)) {
      return Alert.alert(
        'Atenção',
        `Quantidade acima do saldo livre da produção (${Number(lote.saldoDisponivel || 0)} un).`
      );
    }

    if (setores.length > 0 && ['bercario', 'crescimento_final'].includes(toStage) && !toEstruturaId) {
      return Alert.alert('Atenção', 'Escolha a bancada/canal de destino.');
    }

    // Validação de Capacidade Real (Multi-variedade)
    if (toEstruturaId) {
      const targetEstrutura = selectedSetor?.estruturas?.find((e) => e.id === toEstruturaId);
      if (targetEstrutura) {
        const alreadyOccupied = occupiedByStructure.get(toEstruturaId) || 0;
        const capacity = targetEstrutura.capacidadePlantas || 0;
        const available = capacity - alreadyOccupied;

        if (qtd > available) {
          return Alert.alert(
            'Capacidade Excedida',
            `A bancada destino tem apenas ${available} espaços livres.`
          );
        }
      }
    }

    if (!responsavel.trim()) {
      return Alert.alert('Atenção', 'Informe o responsável pela movimentação.');
    }

    setSaving(true);
    try {
      await createHydroMovimentacao(
        lote.id,
        {
          toStage,
          toSetorId: toSetorId || null,
          toEstruturaId: toEstruturaId || null,
          fromOcupacaoId: fromOcupacaoId || null,
          verduraId: verduraId || null,
          cultura: culturaBancada,
          variedade: variedadeBancada,
          quantidadeMovida: qtd,
          perdaNoMovimento: perda,
          motivoPerda,
          responsavel,
          observacoes,
        },
        targetId
      );
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Não foi possível movimentar a produção.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    navigation.setOptions({ title: fromOcupacaoId ? 'Transferir Produção' : 'Iniciar Produção' });
  }, [navigation, fromOcupacaoId]);

  if (loading) {
    return <ActivityIndicator size="large" color={COLORS.primary} style={styles.centered} />;
  }

  if (!lote) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Produção não encontrada.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>{lote.nomeOperacional || 'Produção Hidropônica'}</Text>
        <Text style={styles.summaryText}>Código Fixo: {lote.codigoLote}</Text>
        {fromOcupacao ? (
          <View style={styles.originCard}>
            <MaterialCommunityIcons
              name="arrow-right-bold-circle-outline"
              size={20}
              color={COLORS.primary}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.originText}>
                Movendo de: <Text style={{ fontWeight: '900' }}>{fromOcupacao.estruturaId}</Text>
              </Text>
              <Text style={styles.originSub}>
                {fromOcupacao.cultura} • {fromOcupacao.quantidadeAlocada} un disponíveis
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.originCard}>
            <MaterialCommunityIcons name="seed-outline" size={20} color={COLORS.info} />
            <View style={{ flex: 1 }}>
              <Text style={styles.originText}>Origem: Saldo livre da produção</Text>
              <Text style={styles.originSub}>
                Disponível para alocar: {Number(lote.saldoDisponivel || 0)} un
              </Text>
            </View>
          </View>
        )}
      </View>

      <Text style={styles.sectionTitle}>1. Localização</Text>

      {setores.length > 0 ? (
        <>
          <Text style={styles.label}>Setor de destino</Text>
          <View style={styles.optionWrap}>
            {setores.map((setor) => (
              <TouchableOpacity
                key={setor.id}
                style={[styles.optionChip, toSetorId === setor.id && styles.optionChipActive]}
                onPress={() => selectSetor(setor)}
              >
                <Text
                  style={[styles.optionText, toSetorId === setor.id && styles.optionTextActive]}
                >
                  {setor.nome}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Bancada / Canal / Perfil</Text>
          <View style={styles.structureGrid}>
            {(selectedSetor?.estruturas || []).map((estrutura) => {
              const capacity = Number(
                estrutura.capacidadePlantas || estrutura.quantidadeFuros || 0
              );
              const occupied = occupiedByStructure.get(estrutura.id) || 0;
              const available = Math.max(0, capacity - occupied);

              return (
                <TouchableOpacity
                  key={estrutura.id}
                  style={[
                    styles.structureCard,
                    toEstruturaId === estrutura.id && styles.structureCardActive,
                  ]}
                  onPress={() => selectEstrutura(estrutura)}
                >
                  <Text
                    style={[
                      styles.structureCode,
                      toEstruturaId === estrutura.id && styles.structureTextActive,
                    ]}
                  >
                    {estrutura.codigo || estrutura.nome}
                  </Text>
                  <Text
                    style={[
                      styles.structureMeta,
                      toEstruturaId === estrutura.id && styles.structureTextActive,
                    ]}
                  >
                    Livre: {available}/{capacity} un
                  </Text>
                  {occupied > 0 && (
                    <View style={styles.miniIndicator}>
                      <View
                        style={[
                          styles.indicatorDot,
                          { backgroundColor: available > 0 ? COLORS.warning : COLORS.danger },
                        ]}
                      />
                      <Text
                        style={[
                          styles.indicatorText,
                          toEstruturaId === estrutura.id && styles.structureTextActive,
                        ]}
                      >
                        {occupied} ocupadas
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
          {selectedSetor && (selectedSetor.estruturas || []).length === 0 ? (
            <TouchableOpacity
              style={styles.layoutShortcut}
              onPress={() =>
                navigation.navigate('HidroponiaEstufaLayout', { estufaId: lote.estufaId })
              }
            >
              <Text style={styles.layoutShortcutText}>Adicionar bancadas neste setor</Text>
            </TouchableOpacity>
          ) : null}
        </>
      ) : (
        <TouchableOpacity
          style={styles.layoutShortcut}
          onPress={() => navigation.navigate('HidroponiaEstufaLayout', { estufaId: lote.estufaId })}
        >
          <Text style={styles.layoutShortcutText}>Configurar bancadas da estufa</Text>
        </TouchableOpacity>
      )}
      <Text style={styles.sectionTitle}>2. Detalhes da Produção</Text>

      {!fromOcupacao ? (
        <>
          <Text style={styles.label}>Verdura cadastrada</Text>
          {verduras.length === 0 ? (
            <TouchableOpacity style={styles.layoutShortcut} onPress={() => navigation.navigate('HidroponiaVerduras')}>
              <Text style={styles.layoutShortcutText}>Cadastrar verduras</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.optionWrap}>
              {verduras.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.optionChip, verduraId === item.id && styles.optionChipActive]}
                  onPress={() => {
                    setVerduraId(item.id);
                    setCulturaBancada(item.nomeComum || '');
                    if (!variedadeBancada.trim()) {
                      setVariedadeBancada(item.variedadePadrao || '');
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
        </>
      ) : null}
      
      <Text style={styles.label}>Fase / Tipo de Bancada</Text>
      <View style={styles.optionWrap}>
        {HYDRO_STAGE_OPTIONS.filter((item) => !['semeadura', 'colhido', 'cancelado'].includes(item.value)).map((item) => (
          <TouchableOpacity key={item.value} style={[styles.optionChip, toStage === item.value && styles.optionChipActive]} onPress={() => setToStage(item.value)}>
            <Text style={[styles.optionText, toStage === item.value && styles.optionTextActive]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Quantidade de mudas / plantas</Text>
      <TextInput style={styles.input} value={quantidadeMovida} onChangeText={setQuantidadeMovida} keyboardType="numeric" placeholder="Ex: 500" placeholderTextColor={COLORS.textPlaceholder} />

      <Text style={styles.label}>Cultura (O que está plantando?)</Text>
      <TextInput 
        style={[styles.input, (!!fromOcupacao || (!!verduraId && !fromOcupacao)) && styles.readOnlyInput]} 
        value={culturaBancada} 
        onChangeText={setCulturaBancada} 
        editable={!fromOcupacao && !verduraId}
        placeholder="Ex: Alface Americana" 
        placeholderTextColor={COLORS.textPlaceholder} 
      />

      <Text style={styles.label}>Variedade</Text>
      <TextInput 
        style={[styles.input, !!fromOcupacao && styles.readOnlyInput]} 
        value={variedadeBancada} 
        onChangeText={setVariedadeBancada} 
        editable={!fromOcupacao}
        placeholder="Ex: Lucy Brown" 
        placeholderTextColor={COLORS.textPlaceholder} 
      />

      <Text style={styles.sectionTitle}>3. Responsável e Notas</Text>

      <Text style={styles.label}>Perda no registro (se houver)</Text>
      <TextInput style={styles.input} value={perdaNoMovimento} onChangeText={setPerdaNoMovimento} keyboardType="numeric" placeholder="Ex: 12" placeholderTextColor={COLORS.textPlaceholder} />

      <Text style={styles.label}>Responsável</Text>
      <TextInput style={styles.input} value={responsavel} onChangeText={setResponsavel} placeholder="Quem realizou o manejo?" placeholderTextColor={COLORS.textPlaceholder} />

      <Text style={styles.label}>Observações</Text>
      <TextInput style={[styles.input, styles.textArea]} value={observacoes} onChangeText={setObservacoes} multiline placeholder="Notas adicionais sobre esta ocupação" placeholderTextColor={COLORS.textPlaceholder} />

      <TouchableOpacity style={styles.primaryBtn} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color={COLORS.textLight} /> : <Text style={styles.primaryBtnText}>Confirmar Ocupação</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: SPACING.xl, paddingBottom: SPACING.xxl },
  summaryCard: { borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, padding: SPACING.lg, marginBottom: SPACING.lg, ...SHADOWS.card },
  summaryTitle: { color: COLORS.textPrimary, fontSize: TYPOGRAPHY.h3, fontWeight: '900' },
  summaryText: { color: COLORS.textSecondary, marginTop: 5, fontWeight: '700' },
  originCard: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: COLORS.primarySoft, borderRadius: RADIUS.md, padding: 12, marginTop: 12, borderWidth: 1, borderColor: COLORS.primary },
  originText: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },
  originSub: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700', marginTop: 2 },
  sectionTitle: { color: COLORS.secondary, fontSize: TYPOGRAPHY.h3, fontWeight: '900', marginTop: SPACING.lg, marginBottom: SPACING.md },
  label: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '800', marginBottom: 6 },
  input: { backgroundColor: COLORS.surfaceMuted, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: 14, color: COLORS.textPrimary, marginBottom: SPACING.md },
  readOnlyInput: { backgroundColor: COLORS.surface, color: COLORS.textMuted },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  optionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: SPACING.lg },
  optionChip: { borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, paddingHorizontal: 12, paddingVertical: 8 },
  optionChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  optionText: { color: COLORS.textSecondary, fontWeight: '800', fontSize: 12 },
  optionTextActive: { color: COLORS.textLight },
  structureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: SPACING.lg },
  structureCard: { width: '48%', borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, padding: SPACING.md },
  structureCardActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  structureCode: { color: COLORS.textPrimary, fontWeight: '900' },
  structureMeta: { color: COLORS.textSecondary, fontWeight: '700', marginTop: 4, fontSize: 12 },
  structureTextActive: { color: COLORS.textLight },
  miniIndicator: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  indicatorDot: { width: 8, height: 8, borderRadius: 4 },
  indicatorText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '700' },
  layoutShortcut: { borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.cBFDBFE, backgroundColor: COLORS.infoSoft, padding: SPACING.md, marginBottom: SPACING.lg },
  layoutShortcutText: { color: COLORS.info, fontWeight: '900', textAlign: 'center' },
  primaryBtn: { height: 52, borderRadius: RADIUS.md, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginTop: SPACING.md, ...SHADOWS.card },
  primaryBtnText: { color: COLORS.textLight, fontWeight: '900', fontSize: TYPOGRAPHY.body },
  errorText: { color: COLORS.danger, fontWeight: '800' },
});

export default HidroponiaMovimentarLoteScreen;
