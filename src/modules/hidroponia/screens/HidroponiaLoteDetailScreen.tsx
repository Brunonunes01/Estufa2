import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../../hooks/useAuth';
import SectionHeading from '../../../components/ui/SectionHeading';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../../constants/theme';
import { RootStackParamList } from '../../../navigation/types';
import { listTraceabilityEventsByHydroLote } from '../../../services/traceabilityService';
import { RastreabilidadeEvento } from '../../../types/domain';
import { getHydroLoteById } from '../services/hidroponiaLoteService';
import { listHydroOcupacoesByLote, encerrarHydroOcupacao } from '../services/hidroponiaOcupacaoService';
import { listHydroMovimentacoesByLote } from '../services/hidroponiaMovimentacaoService';
import { HydroLote, HydroMovimentacao, HydroOcupacao } from '../types';
import { getHydroStageLabel } from '../constants';

type Props = NativeStackScreenProps<RootStackParamList, 'HidroponiaLoteDetail'>;

const HidroponiaLoteDetailScreen = ({ navigation, route }: Props) => {
  const { user, selectedTenantId } = useAuth();
  const targetId = selectedTenantId || user?.uid;
  const loteId = route.params.loteId;
  const [lote, setLote] = useState<HydroLote | null>(null);
  const [ocupacoes, setOcupacoes] = useState<HydroOcupacao[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<HydroMovimentacao[]>([]);
  const [rastreabilidade, setRastreabilidade] = useState<RastreabilidadeEvento[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!targetId) return;
    setLoading(true);
    try {
      const loteRes = await getHydroLoteById(loteId, targetId);
      setLote(loteRes);
      const [ocupRes, movsRes, traceRes] = await Promise.all([
        listHydroOcupacoesByLote(targetId, loteId),
        listHydroMovimentacoesByLote(targetId, loteId),
        listTraceabilityEventsByHydroLote(targetId, loteId, 60),
      ]);
      setOcupacoes(ocupRes);
      setMovimentacoes(movsRes);
      setRastreabilidade(traceRes);
    } finally {
      setLoading(false);
    }
  }, [targetId, loteId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleLiberarBancada = (ocupId: string, bancadaNome: string) => {
    Alert.alert(
      'Liberar Bancada',
      `Deseja encerrar a ocupação da bancada ${bancadaNome}? Isso indica que o produto foi colhido ou removido.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Confirmar', 
          onPress: async () => {
            try {
              await encerrarHydroOcupacao(ocupId, targetId!);
              load();
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível liberar a bancada.');
            }
          }
        }
      ]
    );
  };

  if (loading && !lote) {
    return <ActivityIndicator size="large" color={COLORS.primary} style={styles.centered} />;
  }

  if (!lote) {
    return <View style={styles.centered}><Text style={styles.errorText}>Produção não encontrada.</Text></View>;
  }

  const totalPlantas = ocupacoes.reduce((acc, o) => acc + (o.quantidadeAlocada || 0), 0);
  const formatEventDate = (value: unknown) => {
    const source = value as { toDate?: () => Date; seconds?: number };
    if (typeof source?.toDate === 'function') {
      return source.toDate().toLocaleString('pt-BR');
    }
    if (typeof source?.seconds === 'number') {
      return new Date(source.seconds * 1000).toLocaleString('pt-BR');
    }
    return 'Data não informada';
  };
  const getActionLabel = (action: string) => {
    const map: Record<string, string> = {
      criado: 'Criação',
      atualizado: 'Atualização',
      status_alterado: 'Status',
      movido: 'Movimentação',
      leitura_registrada: 'Leitura',
      nutriente_adicionado: 'Nutriente',
      colhido: 'Colheita/Venda',
      cancelado: 'Cancelamento',
    };
    return map[action] || action;
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} colors={[COLORS.primary]} />}
    >
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{lote.nomeOperacional || 'Produção Hidropônica'}</Text>
            <Text style={styles.subtitle}>{lote.codigoLote}</Text>
          </View>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() =>
              navigation.navigate('HidroponiaLoteForm', {
                loteId: lote.id,
                estufaId: lote.estufaId,
                setorId: lote.setorId,
              })
            }
          >
            <MaterialCommunityIcons name="pencil" size={20} color={COLORS.textLight} />
          </TouchableOpacity>
        </View>

        <View style={styles.quickStats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Bancadas</Text>
            <Text style={styles.statValue}>{ocupacoes.length}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Total Plantas</Text>
            <Text style={styles.statValue}>{totalPlantas}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Status</Text>
            <Text style={styles.statValue}>{lote.status.toUpperCase()}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Saldo Livre</Text>
            <Text style={styles.statValue}>{Number(lote.saldoDisponivel || 0)}</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>
          Setor: {lote.setorId || '-'} • Inicial: {Number(lote.quantidadeInicial || 0)} un
        </Text>
        <Text style={styles.subtitle}>
          Origem: {lote.origemMaterialNome || 'Não informada'} {lote.origemMaterialDocumento ? `• Doc: ${lote.origemMaterialDocumento}` : ''}
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: COLORS.primary }]} 
            onPress={() => navigation.navigate('HidroponiaMovimentarLote', { loteId: lote.id })}
          >
            <MaterialCommunityIcons name="plus-box-multiple" size={24} color={COLORS.textLight} />
            <Text style={styles.actionBtnText}>Iniciar Produção</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: COLORS.success }]}
            onPress={() => navigation.navigate('HidroponiaVendaForm', { loteId: lote.id, estufaId: lote.estufaId })}
          >
            <MaterialCommunityIcons name="basket-plus-outline" size={24} color={COLORS.textLight} />
            <Text style={styles.actionBtnText}>Registrar Venda</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: COLORS.secondary }]} 
            onPress={() => navigation.navigate('HidroponiaEstufaLayout', { estufaId: lote.estufaId })}
          >
            <MaterialCommunityIcons name="table-edit" size={24} color={COLORS.textLight} />
            <Text style={styles.actionBtnText}>Configurar Bancadas</Text>
          </TouchableOpacity>
        </View>

        <SectionHeading title="Bancadas em Produção" subtitle="Ocupações ativas desta produção" />
        {ocupacoes.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Esta produção não ocupa nenhuma bancada no momento.</Text>
            <TouchableOpacity onPress={() => navigation.navigate('HidroponiaMovimentarLote', { loteId: lote.id })}>
              <Text style={styles.emptyLink}>Clique aqui para ocupar uma bancada</Text>
            </TouchableOpacity>
          </View>
        ) : (
          ocupacoes.map((ocup) => (
            <View key={ocup.id} style={styles.ocupCard}>
              <View style={styles.ocupHeader}>
                <View style={styles.ocupInfo}>
                  <Text style={styles.ocupTitle}>{ocup.cultura}</Text>
                  <Text style={styles.ocupSubtitle}>{ocup.variedade || 'Variedade não inf.'}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity onPress={() => navigation.navigate('HidroponiaMovimentarLote', { loteId: lote.id, fromOcupacaoId: ocup.id })}>
                    <MaterialCommunityIcons name="swap-horizontal" size={24} color={COLORS.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleLiberarBancada(ocup.id, ocup.estruturaId)}>
                    <MaterialCommunityIcons name="check-circle-outline" size={24} color={COLORS.success} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.ocupFooter}>
                <View style={styles.ocupMeta}>
                  <MaterialCommunityIcons name="grid" size={14} color={COLORS.textMuted} />
                  <Text style={styles.ocupMetaText}>{ocup.estruturaId}</Text>
                </View>
                <View style={styles.ocupMeta}>
                  <MaterialCommunityIcons name="leaf" size={14} color={COLORS.textMuted} />
                  <Text style={styles.ocupMetaText}>{ocup.quantidadeAlocada} un</Text>
                </View>
                <View style={[styles.phaseTag, { backgroundColor: COLORS.infoSoft }]}>
                  <Text style={styles.phaseTagText}>{getHydroStageLabel(ocup.fase)}</Text>
                </View>
              </View>
            </View>
          ))
        )}

        <SectionHeading title="Histórico" subtitle="Últimas movimentações" />
        {movimentacoes.length === 0 ? (
          <View style={styles.emptyBox}><Text style={styles.emptyText}>Sem histórico.</Text></View>
        ) : (
          movimentacoes.slice(0, 5).map((mov) => (
            <View key={mov.id} style={styles.movItem}>
              <View style={styles.movDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.movTitle}>{getHydroStageLabel(mov.fase)} • {mov.quantidade} un</Text>
                <Text style={styles.movSub}>{mov.cultura} na bancada {mov.toEstruturaId}</Text>
                <Text style={styles.movDate}>{mov.movedAt.toDate().toLocaleDateString('pt-BR')}</Text>
              </View>
            </View>
          ))
        )}

        <SectionHeading title="Rastreabilidade" subtitle="Eventos de auditoria da produção" />
        {rastreabilidade.length === 0 ? (
          <View style={styles.emptyBox}><Text style={styles.emptyText}>Sem eventos de rastreabilidade.</Text></View>
        ) : (
          rastreabilidade.slice(0, 12).map((event) => (
            <View key={event.id} style={styles.traceItem}>
              <View style={styles.traceHeader}>
                <Text style={styles.traceAction}>{getActionLabel(event.acao)}</Text>
                <Text style={styles.traceDate}>{formatEventDate(event.eventAt)}</Text>
              </View>
              <Text style={styles.traceDescription}>{event.descricao}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: COLORS.secondary, padding: SPACING.xl, borderBottomLeftRadius: RADIUS.xl, borderBottomRightRadius: RADIUS.xl },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.lg },
  title: { color: COLORS.textLight, fontWeight: '900', fontSize: TYPOGRAPHY.h2 },
  subtitle: { color: COLORS.whiteAlpha80, fontWeight: '700', marginTop: 4 },
  editBtn: { backgroundColor: COLORS.rgba25525525502, padding: 8, borderRadius: RADIUS.sm },
  quickStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.md },
  statItem: { alignItems: 'flex-start' },
  statLabel: { color: COLORS.whiteAlpha60, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  statValue: { color: COLORS.textLight, fontSize: 18, fontWeight: '900', marginTop: 2 },
  content: { padding: SPACING.xl },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: SPACING.xl },
  actionBtn: { width: '48%', borderRadius: RADIUS.lg, padding: SPACING.lg, alignItems: 'center', justifyContent: 'center', gap: 8, ...SHADOWS.card },
  actionBtnText: { color: COLORS.textLight, fontWeight: '900', fontSize: 13, textAlign: 'center' },
  ocupCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.card },
  ocupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.md },
  ocupInfo: { flex: 1 },
  ocupTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '900' },
  ocupSubtitle: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '700', marginTop: 2 },
  ocupFooter: { flexDirection: 'row', alignItems: 'center', gap: 15, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.md },
  ocupMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ocupMetaText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
  phaseTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.pill },
  phaseTagText: { color: COLORS.info, fontSize: 10, fontWeight: '900' },
  emptyBox: { padding: SPACING.xl, alignItems: 'center', backgroundColor: COLORS.surfaceMuted, borderRadius: RADIUS.lg, borderStyle: 'dashed', borderWidth: 1, borderColor: COLORS.border },
  emptyText: { color: COLORS.textSecondary, fontWeight: '700', textAlign: 'center' },
  emptyLink: { color: COLORS.primary, fontWeight: '900', marginTop: 10 },
  movItem: { flexDirection: 'row', gap: 12, marginBottom: SPACING.md },
  movDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary, marginTop: 6 },
  movTitle: { color: COLORS.textPrimary, fontWeight: '900', fontSize: 14 },
  movSub: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700', marginTop: 2 },
  movDate: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  traceItem: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  traceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  traceAction: { color: COLORS.primary, fontWeight: '900', fontSize: 12, textTransform: 'uppercase' },
  traceDate: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700' },
  traceDescription: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '700', marginTop: 6 },
  errorText: { color: COLORS.danger, fontWeight: '800' },
});

export default HidroponiaLoteDetailScreen;
