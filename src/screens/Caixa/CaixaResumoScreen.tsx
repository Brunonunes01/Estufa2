import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View, Alert, ActivityIndicator } from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemeMode } from '../../hooks/useThemeMode';
import { useAuth } from '../../hooks/useAuth';
import { RootStackParamList } from '../../navigation/types';
import { CaixaPeriod, getCaixaResumo, getCaixaExtrato } from '../../services/caixaService';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/theme';
import { exportToExcel } from '../../services/excelService';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

const periods: { id: CaixaPeriod; label: string }[] = [
  { id: 'today', label: 'Hoje' },
  { id: '7d', label: '7 dias' },
  { id: 'month', label: 'Mes' },
  { id: 'all', label: 'Tudo' },
];

const CaixaResumoScreen = () => {
  const theme = useThemeMode();
  const insets = useSafeAreaInsets();
  const { user, selectedTenantId, canViewCash } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();
  const [period, setPeriod] = useState<CaixaPeriod>('month');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [data, setData] = useState<any>(null);

  const canView = canViewCash;
  const targetId = selectedTenantId || user?.uid;

  const handleExportExcel = async () => {
    if (!targetId) return;
    setExporting(true);
    try {
      const { items } = await getCaixaExtrato(targetId, {
        range: { period },
        pageSize: 1000,
      });

      if (items.length === 0) {
        Alert.alert('Aviso', 'Não há dados para exportar.');
        return;
      }

      await exportToExcel({
        fileName: `Caixa_Resumo_${period}_${new Date().toISOString().slice(0, 10)}`,
        sheetName: 'Caixa',
        columns: [
          { header: 'Data', key: 'data', width: 15 },
          { header: 'Cliente', key: 'cliente', width: 25 },
          { header: 'Descrição', key: 'descricao', width: 35 },
          { header: 'Responsável', key: 'pessoa', width: 20 },
          { header: 'Tipo', key: 'tipo', width: 12 },
          { header: 'Valor', key: 'valor', width: 15 },
          { header: 'Meio Pagamento', key: 'metodo', width: 20 },
          { header: 'Observações', key: 'obs', width: 30 },
        ],
        data: items.map((m) => ({
          data: new Date(m.data).toLocaleDateString('pt-BR'),
          cliente: m.clienteNome || (m.tipo === 'entrada' ? 'Cliente avulso' : '-'),
          descricao: m.descricao,
          pessoa: m.caixaPessoaNome,
          tipo: m.tipo === 'entrada' ? 'Entrada' : 'Saída',
          valor: m.valor,
          metodo: String(m.metodoPagamento || '-').toUpperCase(),
          obs: m.observacoes || '-',
        })),
      });
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', 'Falha ao gerar Excel.');
    } finally {
      setExporting(false);
    }
  };

  const load = useCallback(async () => {
    if (!targetId || !canView) return;
    setLoading(true);
    try {
      const result = await getCaixaResumo(targetId, { period });
      setData(result);
    } catch (err) {
      console.error('Erro ao carregar resumo do caixa:', err);
    } finally {
      setLoading(false);
    }
  }, [targetId, period, canView]);

  React.useEffect(() => {
    if (isFocused) void load();
  }, [isFocused, load]);

  const cards = useMemo(
    () => [
      {
        label: 'Entradas',
        helper: 'Recebimentos pagos',
        value: data?.entradas || 0,
        icon: 'trending-up',
        color: COLORS.success,
      },
      {
        label: 'Saidas',
        helper: 'Pagamentos realizados',
        value: data?.saidas || 0,
        icon: 'trending-down',
        color: COLORS.danger,
      },
      {
        label: 'Saldo geral',
        helper: 'Resultado consolidado',
        value: data?.saldo || 0,
        icon: 'wallet-outline',
        color: COLORS.primary,
      },
    ],
    [data]
  );

  if (!canView) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.surfaceBackground }]}>
        <MaterialCommunityIcons name="lock-outline" size={48} color={theme.textSecondary} />
        <Text style={[styles.lockTitle, { color: theme.textPrimary }]}>Acesso restrito</Text>
        <Text style={[styles.lockText, { color: theme.textSecondary }]}>
          O módulo Caixa completo está disponível apenas para proprietário e gerente.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.pageBackground }}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={COLORS.modFinanceiro} />}
      showsVerticalScrollIndicator={false}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.financeLinksRow}>
        <TouchableOpacity
          style={[styles.financeLink, { borderColor: theme.border, backgroundColor: theme.surfaceBackground }]}
          onPress={() => navigation.navigate('MainTabs', { screen: 'FinanceiroTab' })}
        >
          <MaterialCommunityIcons name="cash-multiple" size={16} color={theme.textSecondary} />
          <Text style={[styles.financeLinkText, { color: theme.textSecondary }]}>Vendas</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.financeLink, { borderColor: theme.border, backgroundColor: theme.surfaceBackground }]}
          onPress={() => navigation.navigate('ContasReceber')}
        >
          <MaterialCommunityIcons name="cash-clock" size={16} color={theme.textSecondary} />
          <Text style={[styles.financeLinkText, { color: theme.textSecondary }]}>Contas</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.financeLink, { borderColor: theme.border, backgroundColor: theme.surfaceBackground }]}
          onPress={() => navigation.navigate('DespesasList')}
        >
          <MaterialCommunityIcons name="cash-minus" size={16} color={theme.textSecondary} />
          <Text style={[styles.financeLinkText, { color: theme.textSecondary }]}>Despesas</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.financeLink, styles.financeLinkActive, { borderColor: COLORS.modFinanceiro }]}>
          <MaterialCommunityIcons name="wallet-outline" size={16} color={COLORS.modFinanceiro} />
          <Text style={[styles.financeLinkText, { color: COLORS.modFinanceiro }]}>Caixa</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={[styles.heroCard, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}>
        <View style={styles.heroHeader}>
          <View style={[styles.heroIconBox, { backgroundColor: `${COLORS.modFinanceiro}18` }]}>
            <MaterialCommunityIcons name="cash-multiple" size={24} color={COLORS.modFinanceiro} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>Caixa</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Visão consolidada de entradas, saídas e saldo por responsável.
            </Text>
          </View>
          <TouchableOpacity 
            onPress={handleExportExcel} 
            style={[styles.exportBtn, { backgroundColor: '#1D6F42' }]} 
            disabled={exporting}
            activeOpacity={0.7}
          >
            {exporting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <MaterialCommunityIcons name="file-excel" size={24} color="#fff" />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.overviewTopRow}>
          <View>
            <Text style={[styles.overviewLabel, { color: theme.textSecondary }]}>Saldo atual</Text>
            <Text style={[styles.overviewValue, { color: theme.textPrimary }]}>{formatCurrency(data?.saldo || 0)}</Text>
            <Text style={[styles.overviewCaption, { color: theme.textSecondary }]}>
              Periodo {periods.find((item) => item.id === period)?.label || period}
            </Text>
          </View>
          <View
            style={[
              styles.overviewBadge,
              {
                backgroundColor: (data?.saldo || 0) >= 0 ? theme.successBackground : theme.dangerBackground,
                borderColor: (data?.saldo || 0) >= 0 ? COLORS.success : COLORS.danger,
              },
            ]}
          >
            <Text style={[styles.overviewBadgeText, { color: (data?.saldo || 0) >= 0 ? COLORS.success : COLORS.danger }]}>
              {(data?.saldo || 0) >= 0 ? 'Saudável' : 'Atenção'}
            </Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.periodRow}>
          {periods.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => setPeriod(item.id)}
              style={[
                styles.periodTab,
                {
                  borderColor: period === item.id ? COLORS.modFinanceiro : theme.border,
                  backgroundColor: period === item.id ? `${COLORS.modFinanceiro}18` : theme.surfaceBackground,
                },
              ]}
            >
              <Text style={[styles.periodTabText, { color: period === item.id ? COLORS.modFinanceiro : theme.textPrimary }]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.cardsGrid}>
        {cards.map((card) => (
          <View key={card.label} style={[styles.kpiCard, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}>
            <View style={styles.kpiTopRow}>
              <View style={[styles.kpiIconBox, { backgroundColor: `${card.color}15` }]}>
                <MaterialCommunityIcons name={card.icon as any} size={20} color={card.color} />
              </View>
              <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>{card.label}</Text>
            </View>
            <Text style={[styles.kpiValue, { color: theme.textPrimary }]}>{formatCurrency(card.value)}</Text>
            <Text style={[styles.kpiHelper, { color: theme.textSecondary }]}>{card.helper}</Text>
          </View>
        ))}
      </View>

      {data?.naoClassificado > 0 ? (
        <View style={[styles.alertCard, { backgroundColor: `${COLORS.warning}15`, borderColor: COLORS.warning }]}>
          <MaterialCommunityIcons name="alert-circle-outline" size={18} color={COLORS.warning} />
          <Text style={[styles.alertText, { color: theme.textPrimary }]}>
            Existem {formatCurrency(data.naoClassificado)} sem responsável classificado.
          </Text>
        </View>
      ) : null}

      <View style={[styles.sectionCard, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Saldos por responsável</Text>
          <Text style={[styles.sectionCaption, { color: theme.textSecondary }]}>Toque para abrir o extrato filtrado</Text>
        </View>

        {(data?.porPessoa || []).length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Nenhum movimento registrado no periodo.</Text>
        ) : (
          (data?.porPessoa || []).map((row: any) => (
            <TouchableOpacity
              key={row.caixaPessoaId}
              onPress={() => navigation.navigate('CaixaExtrato', { caixaPessoaId: row.caixaPessoaId })}
              style={[styles.personRow, { borderBottomColor: theme.divider }]}
            >
              <View style={styles.personLeft}>
                <View style={[styles.avatar, { backgroundColor: theme.surfaceMuted }]}>
                  <Text style={[styles.avatarText, { color: theme.textSecondary }]}>
                    {String(row.caixaPessoaNome || '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.personName, { color: theme.textPrimary }]}>{row.caixaPessoaNome}</Text>
                  <Text style={[styles.personMeta, { color: theme.textSecondary }]}>
                    Entradas {formatCurrency(row.entradas)} • Saidas {formatCurrency(row.saidas)}
                  </Text>
                </View>
              </View>
              <View style={styles.personRight}>
                <Text style={[styles.personBalanceValue, { color: row.saldo >= 0 ? COLORS.success : COLORS.danger }]}>
                  {formatCurrency(row.saldo)}
                </Text>
                <MaterialCommunityIcons name="chevron-right" size={18} color={theme.textSecondary} />
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      <View style={[styles.sectionCard, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Movimentos recentes</Text>
          <Text style={[styles.sectionCaption, { color: theme.textSecondary }]}>Últimos 5 registros</Text>
        </View>

        {(data?.movimentos || []).length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Nenhum movimento recente.</Text>
        ) : (
          (data?.movimentos || []).slice(0, 5).map((mov: any) => {
            const isEntrada = mov.tipo === 'entrada';
            return (
              <View key={mov.id} style={[styles.movementRow, { borderBottomColor: theme.divider }]}>
                <View style={[styles.movementIconBox, { backgroundColor: isEntrada ? `${COLORS.success}18` : `${COLORS.danger}18` }]}>
                  <MaterialCommunityIcons name={isEntrada ? 'plus' : 'minus'} size={18} color={isEntrada ? COLORS.success : COLORS.danger} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.movementDesc, { color: theme.textPrimary }]} numberOfLines={1}>
                    {mov.descricao}
                  </Text>
                  <Text style={[styles.movementMeta, { color: theme.textSecondary }]} numberOfLines={2}>
                    {mov.tipo === 'entrada' ? 'Recebido por' : 'Pago para'}: {mov.caixaPessoaNome}
                    {mov.observacoes ? ` • ${mov.observacoes}` : ''}
                  </Text>
                </View>
                <Text style={[styles.movementValue, { color: isEntrada ? COLORS.success : COLORS.danger }]}>
                  {formatCurrency(mov.valor)}
                </Text>
              </View>
            );
          })
        )}
      </View>

      <TouchableOpacity onPress={() => navigation.navigate('CaixaExtrato')} style={[styles.fullExtratoBtn, { backgroundColor: COLORS.modFinanceiro }]}>
        <MaterialCommunityIcons name="format-list-bulleted" size={20} color="#fff" />
        <Text style={styles.fullExtratoText}>Abrir extrato completo</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  lockTitle: { fontSize: 16, fontWeight: '800', marginTop: 10 },
  lockText: { marginTop: 6, textAlign: 'center', paddingHorizontal: 40, fontSize: 13, lineHeight: 18 },
  scrollContent: { padding: SPACING.lg, gap: 14 },

  financeLinksRow: {
    gap: 8,
    paddingBottom: SPACING.xs,
  },
  financeLink: {
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    minWidth: 96,
  },
  financeLinkActive: {
    backgroundColor: `${COLORS.modFinanceiro}1A`,
  },
  financeLinkText: {
    fontSize: 12,
    fontWeight: '800',
  },

  heroCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 16,
    ...SHADOWS.card,
  },
  heroHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: TYPOGRAPHY.h2, fontWeight: '900' },
  subtitle: { fontSize: 14, marginTop: 2, fontWeight: '600', lineHeight: 20 },
  exportBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overviewTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 16,
  },
  overviewLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  overviewValue: { fontSize: 28, fontWeight: '900', marginTop: 4 },
  overviewCaption: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  overviewBadge: {
    alignSelf: 'flex-start',
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  overviewBadgeText: { fontSize: 11, fontWeight: '800' },
  periodRow: { gap: 8, marginTop: 16, paddingRight: SPACING.lg },
  periodTab: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    alignItems: 'center',
    minWidth: 76,
  },
  periodTabText: { fontSize: 13, fontWeight: '800' },

  cardsGrid: { gap: 10 },
  kpiCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 16,
    ...SHADOWS.card,
  },
  kpiTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  kpiIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiLabel: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  kpiValue: { fontSize: 24, fontWeight: '900' },
  kpiHelper: { fontSize: 12, fontWeight: '600', marginTop: 4 },

  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    gap: 8,
  },
  alertText: { fontSize: 12, fontWeight: '700', flex: 1 },
  sectionCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 16,
    ...SHADOWS.card,
  },
  sectionHeader: { marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '900' },
  sectionCaption: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  personLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontWeight: '900' },
  personName: { fontSize: 14, fontWeight: '800' },
  personMeta: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  personRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  personBalanceValue: { fontSize: 14, fontWeight: '900' },
  movementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  movementIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  movementDesc: { fontSize: 13, fontWeight: '800' },
  movementMeta: { fontSize: 11, fontWeight: '600', marginTop: 2, lineHeight: 16 },
  movementValue: { fontSize: 13, fontWeight: '900' },
  emptyText: { textAlign: 'center', fontSize: 13, fontStyle: 'italic', paddingVertical: 20 },
  fullExtratoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: RADIUS.lg,
    gap: 10,
    ...SHADOWS.card,
  },
  fullExtratoText: { color: '#fff', fontSize: 16, fontWeight: '900' },
});

export default CaixaResumoScreen;
