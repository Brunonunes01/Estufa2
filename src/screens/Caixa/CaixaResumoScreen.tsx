import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeMode } from '../../hooks/useThemeMode';
import { useAuth } from '../../hooks/useAuth';
import { RootStackParamList } from '../../navigation/types';
import { CaixaPeriod, getCaixaResumo } from '../../services/caixaService';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/theme';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

const periods: { id: CaixaPeriod; label: string }[] = [
  { id: 'today', label: 'Hoje' },
  { id: '7d', label: '7 dias' },
  { id: 'month', label: 'Mês' },
  { id: 'all', label: 'Tudo' },
];

const CaixaResumoScreen = () => {
  const theme = useThemeMode();
  const insets = useSafeAreaInsets();
  const { user, selectedTenantId, isOwner, isAdmin } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();
  const [period, setPeriod] = useState<CaixaPeriod>('month');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const canView = Boolean(isOwner || isAdmin);
  const targetId = selectedTenantId || user?.uid;

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
        value: data?.entradas || 0, 
        icon: 'trending-up', 
        color: COLORS.success 
      },
      { 
        label: 'Saídas', 
        value: data?.saidas || 0, 
        icon: 'trending-down', 
        color: COLORS.danger 
      },
      { 
        label: 'Saldo Geral', 
        value: data?.saldo || 0, 
        icon: 'wallet-outline', 
        color: COLORS.primary 
      },
    ],
    [data]
  );

  if (!canView) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.surfaceBackground }]}>
        <MaterialCommunityIcons name="lock-outline" size={48} color={theme.textSecondary} />
        <Text style={{ color: theme.textPrimary, fontSize: 16, fontWeight: '700', marginTop: 10 }}>Acesso restrito</Text>
        <Text style={{ color: theme.textSecondary, marginTop: 6, textAlign: 'center', paddingHorizontal: 40 }}>
          O módulo Caixa completo está disponível apenas para dono e admin.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.surfaceBackground }}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={COLORS.modFinanceiro} />}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Resumo Financeiro</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Visão consolidada de entradas e saídas.</Text>
      </View>

      <View style={styles.periodRow}>
        {periods.map((item) => (
          <TouchableOpacity
            key={item.id}
            onPress={() => setPeriod(item.id)}
            style={[
              styles.periodTab,
              {
                borderColor: period === item.id ? COLORS.modFinanceiro : theme.border,
                backgroundColor: period === item.id ? `${COLORS.modFinanceiro}22` : theme.surfaceBackground,
              }
            ]}
          >
            <Text style={[
              styles.periodTabText, 
              { color: period === item.id ? COLORS.modFinanceiro : theme.textPrimary }
            ]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.cardsGrid}>
        {cards.map((card) => (
          <View key={card.label} style={[styles.kpiCard, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}>
            <View style={[styles.kpiIconBox, { backgroundColor: `${card.color}15` }]}>
              <MaterialCommunityIcons name={card.icon as any} size={22} color={card.color} />
            </View>
            <View>
              <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>{card.label}</Text>
              <Text style={[styles.kpiValue, { color: theme.textPrimary }]}>{formatCurrency(card.value)}</Text>
            </View>
          </View>
        ))}
      </View>

      {data?.naoClassificado > 0 && (
        <View style={[styles.alertCard, { backgroundColor: `${COLORS.warning}15`, borderColor: COLORS.warning }]}>
          <MaterialCommunityIcons name="alert-circle-outline" size={20} color={COLORS.warning} />
          <Text style={[styles.alertText, { color: theme.textPrimary }]}>
            Existem {formatCurrency(data.naoClassificado)} não classificados por pessoa.
          </Text>
        </View>
      )}

      <View style={[styles.sectionCard, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="account-group-outline" size={20} color={COLORS.modFinanceiro} />
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Saldos por Responsável</Text>
        </View>
        
        {(data?.porPessoa || []).length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Nenhum movimento registrado no período.</Text>
        ) : (
          (data?.porPessoa || []).map((row: any) => (
            <TouchableOpacity
              key={row.caixaPessoaId}
              onPress={() => navigation.navigate('CaixaExtrato', { caixaPessoaId: row.caixaPessoaId })}
              style={[styles.personRow, { borderBottomColor: theme.divider }]}
            >
              <View style={styles.personInfo}>
                <View style={[styles.avatar, { backgroundColor: theme.surfaceMuted }]}>
                  <Text style={[styles.avatarText, { color: theme.textSecondary }]}>
                    {row.caixaPessoaNome.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.personName, { color: theme.textPrimary }]}>{row.caixaPessoaNome}</Text>
              </View>
              <View style={styles.personBalance}>
                <Text style={[styles.personBalanceValue, { color: row.saldo >= 0 ? COLORS.success : COLORS.danger }]}>
                  {formatCurrency(row.saldo)}
                </Text>
                <MaterialCommunityIcons name="chevron-right" size={20} color={theme.textSecondary} />
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      <View style={[styles.sectionCard, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="history" size={20} color={COLORS.modFinanceiro} />
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Movimentos Recentes</Text>
        </View>
        
        {(data?.movimentos || []).length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Nenhum movimento recente.</Text>
        ) : (
          (data?.movimentos || []).slice(0, 5).map((mov: any) => {
            const isEntrada = mov.tipo === 'entrada';
            return (
              <View key={mov.id} style={[styles.miniMovRow, { borderBottomColor: theme.divider }]}>
                <View style={styles.miniMovLeft}>
                   <MaterialCommunityIcons 
                    name={isEntrada ? 'plus-circle' : 'minus-circle'} 
                    size={18} 
                    color={isEntrada ? COLORS.success : COLORS.danger} 
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.miniMovDesc, { color: theme.textPrimary }]} numberOfLines={1}>{mov.descricao}</Text>
                    <Text style={[styles.miniMovSub, { color: theme.textSecondary }]} numberOfLines={1}>
                      {mov.tipo === 'entrada' ? 'Recebido por' : 'Pago para'}: {mov.caixaPessoaNome}
                      {mov.observacoes ? ` • ${mov.observacoes}` : ''}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.miniMovValue, { color: isEntrada ? COLORS.success : COLORS.danger }]}>
                  {formatCurrency(mov.valor)}
                </Text>
              </View>
            );
          })
        )}
      </View>

      <TouchableOpacity
        onPress={() => navigation.navigate('CaixaExtrato')}
        style={[styles.fullExtratoBtn, { backgroundColor: COLORS.modFinanceiro }]}
      >
        <MaterialCommunityIcons name="format-list-bulleted" size={20} color="#fff" />
        <Text style={styles.fullExtratoText}>Abrir Extrato Completo</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  scrollContent: { padding: SPACING.lg, gap: 16 },
  header: { marginBottom: 4 },
  title: { fontSize: TYPOGRAPHY.h2, fontWeight: '900' },
  subtitle: { fontSize: 14, marginTop: 2, fontWeight: '600' },
  periodRow: { flexDirection: 'row', gap: 8 },
  periodTab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    flex: 1,
    alignItems: 'center',
  },
  periodTabText: { fontSize: 13, fontWeight: '800' },
  cardsGrid: { gap: 10 },
  kpiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    ...SHADOWS.card,
  },
  kpiIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  kpiLabel: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  kpiValue: { fontSize: 22, fontWeight: '900', marginTop: 2 },
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
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '800' },
  personRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  personInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontWeight: '800' },
  personName: { fontSize: 14, fontWeight: '700' },
  personBalance: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  personBalanceValue: { fontSize: 14, fontWeight: '800' },
  miniMovRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  miniMovLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  miniMovDesc: { fontSize: 13, fontWeight: '700' },
  miniMovSub: { fontSize: 11, fontWeight: '600' },
  miniMovValue: { fontSize: 14, fontWeight: '800' },
  emptyText: { textAlign: 'center', fontSize: 13, fontStyle: 'italic', paddingVertical: 20 },
  fullExtratoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: RADIUS.lg,
    gap: 10,
    ...SHADOWS.card,
    marginTop: 8,
  },
  fullExtratoText: { color: '#fff', fontSize: 16, fontWeight: '900' },
});

export default CaixaResumoScreen;
