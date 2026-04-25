import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useAuth } from '../../hooks/useAuth';
import { getPlantioById } from '../../services/plantioService';
import { listVendasByPlantio } from '../../services/vendaService';
import { listAplicacoesByPlantio } from '../../services/aplicacaoService';
import { listManejosByPlantio } from '../../services/manejoService';
import { listTraceabilityEventsByPlantio } from '../../services/traceabilityService';
import { Aplicacao, Plantio, RastreabilidadeEvento, RegistroManejo, Venda } from '../../types/domain';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../constants/theme';

const PlantioHistoryScreen = ({ route }: any) => {
  const { user, selectedTenantId } = useAuth();
  const isFocused = useIsFocused();
  const plantioId = route?.params?.plantioId;

  const [loading, setLoading] = useState(true);
  const [plantio, setPlantio] = useState<Plantio | null>(null);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [aplicacoes, setAplicacoes] = useState<Aplicacao[]>([]);
  const [manejos, setManejos] = useState<RegistroManejo[]>([]);
  const [rastreabilidade, setRastreabilidade] = useState<RastreabilidadeEvento[]>([]);

  const targetId = selectedTenantId || user?.uid;

  const loadData = async () => {
    if (!targetId || !plantioId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [plantioData, vendasData, aplicacoesData, manejosData, rastreabilidadeData] = await Promise.all([
        getPlantioById(plantioId, targetId),
        listVendasByPlantio(targetId, plantioId),
        listAplicacoesByPlantio(targetId, plantioId),
        listManejosByPlantio(targetId, plantioId),
        listTraceabilityEventsByPlantio(targetId, plantioId, 50),
      ]);
      setPlantio(plantioData);
      setVendas(vendasData);
      setAplicacoes(aplicacoesData);
      setManejos(manejosData);
      setRastreabilidade(rastreabilidadeData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) loadData();
  }, [isFocused, plantioId, targetId]);

  const getVendaTotal = (venda: Venda) => {
    const item = venda.itens?.[0];
    const fallbackTotal = Number(item?.quantidade || 0) * Number(item?.valorUnitario || 0);
    return Number(venda.valorTotal || fallbackTotal || 0);
  };

  const getVendaQuantidade = (venda: Venda) => Number((venda as any).quantidade || venda.itens?.[0]?.quantidade || 0);
  const getVendaUnidade = (venda: Venda) => String((venda as any).unidade || (venda.itens?.[0] as any)?.unidade || 'un');

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-';
    const d = timestamp.toDate
      ? timestamp.toDate()
      : typeof timestamp.seconds === 'number'
      ? new Date(timestamp.seconds * 1000)
      : new Date(timestamp);
    return d.toLocaleDateString('pt-BR');
  };

  const receitaTotal = useMemo(
    () => vendas.reduce((acc, item) => acc + getVendaTotal(item), 0),
    [vendas]
  );

  const formatEventLabel = (evento: RastreabilidadeEvento) => {
    const entidade = evento.entidade.charAt(0).toUpperCase() + evento.entidade.slice(1);
    const acao = evento.acao.replace(/_/g, ' ');
    return `${entidade} • ${acao}`;
  };

  const metadataLabelMap: Record<string, string> = {
    loteColheita: 'Lote',
    quantidade: 'Quantidade',
    unidade: 'Unidade',
    precoUnitario: 'Preço un.',
    valorTotal: 'Valor total',
    statusPagamento: 'Pagamento',
    metodoPagamento: 'Método',
    clienteId: 'Cliente',
    tipoAplicacao: 'Tipo aplicação',
    tipoManejo: 'Tipo manejo',
    previousStatus: 'Status anterior',
    newStatus: 'Novo status',
    previousDestino: 'Destino anterior',
    destino: 'Destino',
    cicloDesbloqueadoPorAdmin: 'Desbloqueio ciclo',
  };

  const formatMetadataValue = (value: unknown): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
    if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '-';
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return `${value.length} item(ns)`;
    if (typeof value === 'object') return 'objeto';
    return String(value);
  };

  const getMetadataLines = (evento: RastreabilidadeEvento): string[] => {
    if (!evento.metadata || typeof evento.metadata !== 'object' || Array.isArray(evento.metadata)) return [];

    const entries = Object.entries(evento.metadata as Record<string, unknown>)
      .filter(([, value]) => value !== null && value !== undefined)
      .slice(0, 5);

    return entries.map(([key, value]) => `${metadataLabelMap[key] || key}: ${formatMetadataValue(value)}`);
  };

  if (loading) {
    return <ActivityIndicator size="large" style={{ flex: 1 }} color={COLORS.primary} />;
  }

  if (!plantioId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Ciclo não informado.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} colors={[COLORS.primary]} />}
      contentContainerStyle={styles.content}
    >
      <View style={styles.headerCard}>
        <Text style={styles.headerTitle}>Histórico do Ciclo</Text>
        <Text style={styles.headerSub}>
          {plantio?.cultura || 'Cultura não definida'} {plantio?.codigoLote ? `• ${plantio.codigoLote}` : ''}
        </Text>
      </View>

      <View style={styles.kpisRow}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Vendas</Text>
          <Text style={styles.kpiValue}>{vendas.length}</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Aplicações</Text>
          <Text style={styles.kpiValue}>{aplicacoes.length}</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Manejos</Text>
          <Text style={styles.kpiValue}>{manejos.length}</Text>
        </View>
      </View>

      <View style={styles.kpiWide}>
        <Text style={styles.kpiLabel}>Eventos de rastreabilidade</Text>
        <Text style={styles.kpiWideValue}>{rastreabilidade.length}</Text>
      </View>

      <View style={styles.kpiWide}>
        <Text style={styles.kpiLabel}>Receita acumulada</Text>
        <Text style={styles.kpiWideValue}>R$ {receitaTotal.toFixed(2)}</Text>
      </View>

      <Text style={styles.sectionTitle}>Vendas do ciclo</Text>
      {vendas.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>Nenhuma venda registrada neste ciclo.</Text>
        </View>
      ) : (
        vendas.map((item) => (
          <View key={item.id} style={styles.itemCard}>
            <MaterialCommunityIcons name="cash" size={20} color={COLORS.primary} />
            <View style={styles.itemBody}>
              <Text style={styles.itemTitle}>
                {getVendaQuantidade(item)} {getVendaUnidade(item)}
              </Text>
              <Text style={styles.itemSub}>{formatDate(item.dataVenda)}</Text>
            </View>
            <Text style={styles.itemValue}>R$ {getVendaTotal(item).toFixed(2)}</Text>
          </View>
        ))
      )}

      <Text style={styles.sectionTitle}>Aplicações</Text>
      {aplicacoes.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>Nenhuma aplicação registrada.</Text>
        </View>
      ) : (
        aplicacoes.map((item) => (
          <View key={item.id} style={styles.itemCard}>
            <MaterialCommunityIcons name="flask-outline" size={20} color={COLORS.info} />
            <View style={styles.itemBody}>
              <Text style={styles.itemTitle}>{item.tipoAplicacao || 'Aplicação'}</Text>
              <Text style={styles.itemSub}>{item.dataAplicacao.toDate().toLocaleDateString('pt-BR')}</Text>
            </View>
          </View>
        ))
      )}

      <Text style={styles.sectionTitle}>Diário de manejo</Text>
      {manejos.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>Nenhum manejo registrado.</Text>
        </View>
      ) : (
        manejos.map((item) => (
          <View key={item.id} style={styles.itemCard}>
            <MaterialCommunityIcons name="notebook-outline" size={20} color={COLORS.orange} />
            <View style={styles.itemBody}>
              <Text style={styles.itemTitle}>{item.tipoManejo}</Text>
              <Text style={styles.itemSub}>{item.dataRegistro.toDate().toLocaleDateString('pt-BR')}</Text>
            </View>
          </View>
        ))
      )}

      <Text style={styles.sectionTitle}>Rastreabilidade do ciclo</Text>
      {rastreabilidade.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>Nenhum evento de rastreabilidade registrado.</Text>
        </View>
      ) : (
        rastreabilidade.map((item) => (
          <View key={item.id} style={styles.itemCard}>
            <MaterialCommunityIcons name="timeline-clock-outline" size={20} color={COLORS.warning} />
            <View style={styles.itemBody}>
              <Text style={styles.itemTitle}>{formatEventLabel(item)}</Text>
              <Text style={styles.itemSub}>
                {item.eventAt?.toDate ? item.eventAt.toDate().toLocaleString('pt-BR') : 'Data indisponível'}
              </Text>
              <Text style={styles.traceDescription}>{item.descricao}</Text>
              <Text style={styles.traceMeta}>ID: {item.entidadeId}</Text>
              {item.actorName || item.actorUid ? (
                <Text style={styles.traceMeta}>Responsável: {item.actorName || item.actorUid}</Text>
              ) : null}
              {getMetadataLines(item).map((line) => (
                <Text key={`${item.id}-${line}`} style={styles.traceMeta}>
                  {line}
                </Text>
              ))}
              {item.motivo ? <Text style={styles.traceReason}>Motivo: {item.motivo}</Text> : null}
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.xl, paddingBottom: SPACING.xxl },
  headerCard: { backgroundColor: COLORS.secondary, borderRadius: RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.md },
  headerTitle: { color: COLORS.textLight, fontSize: TYPOGRAPHY.h3, fontWeight: '800' },
  headerSub: { color: COLORS.cCBD5E1, marginTop: 4, fontWeight: '600' },
  kpisRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  kpiCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 12, borderWidth: 1, borderColor: COLORS.border },
  kpiLabel: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
  kpiValue: { color: COLORS.textPrimary, fontSize: 22, fontWeight: '800', marginTop: 2 },
  kpiWide: { backgroundColor: COLORS.surfaceMuted, borderRadius: RADIUS.md, padding: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 },
  kpiWideValue: { color: COLORS.success, fontSize: 22, fontWeight: '800', marginTop: 2 },
  sectionTitle: { color: COLORS.textDark, fontSize: TYPOGRAPHY.title, fontWeight: '800', marginBottom: 8, marginTop: 10 },
  emptyBox: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: 14, marginBottom: 8 },
  emptyText: { color: COLORS.textGray },
  itemCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemBody: { marginLeft: 10, flex: 1 },
  itemTitle: { color: COLORS.textPrimary, fontWeight: '700' },
  itemSub: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  traceDescription: { color: COLORS.textSecondary, fontSize: 12, marginTop: 4 },
  traceMeta: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  traceReason: { color: COLORS.textPrimary, fontSize: 12, marginTop: 2, fontWeight: '600' },
  itemValue: { color: COLORS.primary, fontWeight: '800' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
});

export default PlantioHistoryScreen;
