import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { listVendasByMonth } from '../../services/vendaService';
import { listDespesasByMonth } from '../../services/despesaService';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/theme';
import { Venda, Despesa } from '../../types/domain';
import { Picker } from '@react-native-picker/picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';

const generateYearList = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = currentYear; i >= currentYear - 5; i--) {
    years.push(i);
  }
  return years;
};

const MONTHS = [
  { label: 'Janeiro', value: 1 }, { label: 'Fevereiro', value: 2 }, { label: 'Março', value: 3 },
  { label: 'Abril', value: 4 }, { label: 'Maio', value: 5 }, { label: 'Junho', value: 6 },
  { label: 'Julho', value: 7 }, { label: 'Agosto', value: 8 }, { label: 'Setembro', value: 9 },
  { label: 'Outubro', value: 10 }, { label: 'Novembro', value: 11 }, { label: 'Dezembro', value: 12 },
];
const YEARS = generateYearList();

type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Relatorios'>;

const RelatoriosScreen = () => {
  const navigation = useNavigation<ScreenNavigationProp>();
  const { user, selectedTenantId } = useAuth();
  const targetId = selectedTenantId || user?.uid;

  const [vendas, setVendas] = useState<Venda[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const loadData = async () => {
      if (!targetId) return;
      setLoading(true);
      try {
        const [vendasData, despesasData] = await Promise.all([
          listVendasByMonth(targetId, selectedYear, selectedMonth),
          listDespesasByMonth(targetId, selectedYear, selectedMonth)
        ]);
        setVendas(vendasData);
        setDespesas(despesasData);
      } catch (error) {
        console.error('Erro ao carregar relatórios', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [targetId, selectedYear, selectedMonth]);

  const stats = useMemo(() => {
    const receitaTotal = vendas.reduce((acc, v) => {
      const item = v.itens?.[0];
      const fallbackTotal = Number(item?.quantidade || 0) * Number(item?.valorUnitario || 0);
      return acc + Number(v.valorTotal || fallbackTotal || 0);
    }, 0);
    const despesaTotal = despesas.reduce((acc, d) => acc + Number(d.valor || 0), 0);
    const lucroLiquido = receitaTotal - despesaTotal;
    
    const margem = receitaTotal > 0 ? (lucroLiquido / receitaTotal) * 100 : 0;
    
    const porCategoria: Record<string, number> = {};
    despesas.forEach(d => {
      const cat = d.categoria || 'outros';
      porCategoria[cat] = (porCategoria[cat] || 0) + Number(d.valor || 0);
    });

    const categoriasArray = Object.entries(porCategoria)
      .map(([nome, valor]) => ({ nome, valor }))
      .sort((a, b) => b.valor - a.valor);

    return { receitaTotal, despesaTotal, lucroLiquido, margem, categoriasArray };
  }, [vendas, despesas]);

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      );
    }

    return (
      <>
        <View style={styles.cardsRow}>
          <View style={[styles.kpiCard, { borderLeftColor: COLORS.success, borderLeftWidth: 4 }]}>
            <Text style={styles.kpiLabel}>Receitas</Text>
            <Text style={[styles.kpiValue, { color: COLORS.success }]}>R$ {stats.receitaTotal.toFixed(2)}</Text>
          </View>
          <View style={[styles.kpiCard, { borderLeftColor: COLORS.danger, borderLeftWidth: 4 }]}>
            <Text style={styles.kpiLabel}>Despesas</Text>
            <Text style={[styles.kpiValue, { color: COLORS.danger }]}>R$ {stats.despesaTotal.toFixed(2)}</Text>
          </View>
        </View>

        <View style={[styles.lucroCard, { backgroundColor: stats.lucroLiquido >= 0 ? COLORS.infoSoft : COLORS.warning + '20' }]}>
          <View>
            <Text style={styles.lucroLabel}>Resultado Líquido</Text>
            <Text style={[styles.lucroValue, { color: stats.lucroLiquido >= 0 ? COLORS.primary : COLORS.danger }]}>
              R$ {stats.lucroLiquido.toFixed(2)}
            </Text>
          </View>
          <View style={styles.margemBadge}>
            <Text style={styles.margemText}>{stats.margem.toFixed(1)}% Margem</Text>
          </View>
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Receitas vs Despesas</Text>
          
          <View style={styles.barContainer}>
            <View style={styles.barLabelRow}>
              <Text style={styles.barLabel}>Receitas</Text>
              <Text style={styles.barAmount}>R$ {stats.receitaTotal.toFixed(2)}</Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { backgroundColor: COLORS.success, width: '100%' }]} />
            </View>
          </View>

          <View style={styles.barContainer}>
            <View style={styles.barLabelRow}>
              <Text style={styles.barLabel}>Despesas</Text>
              <Text style={styles.barAmount}>R$ {stats.despesaTotal.toFixed(2)}</Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { 
                backgroundColor: COLORS.danger, 
                width: stats.receitaTotal > 0 ? `${Math.min((stats.despesaTotal / stats.receitaTotal) * 100, 100)}%` : '0%' 
              }]} />
            </View>
          </View>
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Distribuição de Custos</Text>
          {stats.categoriasArray.length === 0 ? (
            <Text style={styles.emptyText}>Sem despesas no período.</Text>
          ) : (
            stats.categoriasArray.map((cat, index) => {
              const percent = stats.despesaTotal > 0 ? (cat.valor / stats.despesaTotal) * 100 : 0;
              return (
                <View key={index} style={styles.catRow}>
                  <View style={styles.catInfo}>
                    <Text style={styles.catName}>{cat.nome.toUpperCase()}</Text>
                    <Text style={styles.catPercent}>{percent.toFixed(1)}%</Text>
                  </View>
                  <View style={styles.catTrack}>
                    <View style={[styles.catFill, { width: `${percent}%` }]} />
                  </View>
                  <Text style={styles.catValue}>R$ {cat.valor.toFixed(2)}</Text>
                </View>
              );
            })
          )}
        </View>
      </>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      
      <View style={styles.header}>
        <Text style={styles.title}>Visão Geral do Negócio</Text>
        <Text style={styles.subtitle}>DRE Simplificado</Text>
      </View>

      <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('RelatorioOperacional')}>
        <MaterialCommunityIcons name="chart-line" size={20} color={COLORS.primary} />
        <Text style={styles.navButtonText}>Análise de Ciclo de Produção</Text>
      </TouchableOpacity>
      
      <View style={styles.filterContainer}>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={selectedMonth}
            onValueChange={(itemValue) => setSelectedMonth(itemValue)}
            style={styles.picker}
          >
            {MONTHS.map(m => <Picker.Item key={m.value} label={m.label} value={m.value} />)}
          </Picker>
        </View>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={selectedYear}
            onValueChange={(itemValue) => setSelectedYear(itemValue)}
            style={styles.picker}
          >
            {YEARS.map(y => <Picker.Item key={y} label={String(y)} value={y} />)}
          </Picker>
        </View>
      </View>

      {renderContent()}

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.xl, paddingBottom: 50 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 400 },
  
  header: { marginBottom: SPACING.md },
  title: { fontSize: TYPOGRAPHY.h2, fontWeight: '900', color: COLORS.textDark },
  subtitle: { fontSize: TYPOGRAPHY.body, color: COLORS.textSecondary, marginTop: 4 },

  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: COLORS.primarySoft,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginBottom: SPACING.lg,
  },
  navButtonText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: 'bold',
  },

  filterContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  pickerWrapper: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    ...SHADOWS.card,
    height: 50,
    justifyContent: 'center',
  },
  picker: {
    color: COLORS.textDark,
  },

  cardsRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.md },
  kpiCard: { flex: 1, backgroundColor: COLORS.surface, padding: SPACING.md, borderRadius: RADIUS.md, ...SHADOWS.card },
  kpiLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '700', marginBottom: 4 },
  kpiValue: { fontSize: 18, fontWeight: '900' },

  lucroCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.lg, borderRadius: RADIUS.lg, marginBottom: SPACING.xl },
  lucroLabel: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '800' },
  lucroValue: { fontSize: 24, fontWeight: '900', marginTop: 4 },
  margemBadge: { backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.pill },
  margemText: { color: COLORS.textLight, fontWeight: 'bold', fontSize: 12 },

  chartCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.xl, ...SHADOWS.card },
  chartTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textDark, marginBottom: SPACING.lg },
  
  barContainer: { marginBottom: SPACING.md },
  barLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  barLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  barAmount: { fontSize: 13, fontWeight: '800', color: COLORS.textDark },
  barTrack: { height: 12, backgroundColor: COLORS.surfaceMuted, borderRadius: RADIUS.pill, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: RADIUS.pill },

  catRow: { marginBottom: 15 },
  catInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  catName: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
  catPercent: { fontSize: 11, fontWeight: 'bold', color: COLORS.primary },
  catTrack: { height: 8, backgroundColor: COLORS.surfaceMuted, borderRadius: RADIUS.pill, overflow: 'hidden', marginBottom: 4 },
  catFill: { height: '100%', backgroundColor: COLORS.modDespesas, borderRadius: RADIUS.pill },
  catValue: { fontSize: 12, fontWeight: '700', color: COLORS.textDark, textAlign: 'right' },
  
  emptyText: { fontSize: 13, color: COLORS.textPlaceholder, fontStyle: 'italic', textAlign: 'center', paddingVertical: 20 }
});

export default RelatoriosScreen;
