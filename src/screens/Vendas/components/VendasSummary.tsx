import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../../../constants/theme';
import { formatCurrencyBRL } from '../vendasListUtils';

interface VendasSummaryProps {
  stats: any;
  totalPagar: number;
  periodLabel: string;
  activeFiltersLabel: string;
  theme: any;
  onNavigateToContas: () => void;
  onNavigateToDespesas: () => void;
}

const VendasSummary = ({
  stats,
  totalPagar,
  periodLabel,
  activeFiltersLabel,
  theme,
  onNavigateToContas,
  onNavigateToDespesas,
}: VendasSummaryProps) => {
  const saldoAtual = stats.totalRecebido - totalPagar;
  const saldoProjetado = stats.totalRecebido + stats.totalReceber - totalPagar;

  return (
    <View style={[styles.overviewCard, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}>
      <View style={styles.overviewTopRow}>
        <View style={styles.overviewMainBlock}>
          <Text style={[styles.overviewLabel, { color: theme.textSecondary }]}>Visão atual</Text>
          <Text style={[styles.overviewValue, { color: theme.textPrimary }]}>{formatCurrencyBRL(stats.totalValor)}</Text>
          <Text style={[styles.overviewCaption, { color: theme.textSecondary }]}>{periodLabel}</Text>
        </View>
        <View style={[styles.overviewBadge, { backgroundColor: theme.infoSoft, borderColor: theme.info }]}>
          <Text style={[styles.overviewBadgeText, { color: theme.info }]}>{activeFiltersLabel}</Text>
        </View>
      </View>

      <View style={styles.summaryGrid}>
        <View style={[styles.summaryCard, { backgroundColor: theme.surfaceMuted }]}>
          <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Recebido</Text>
          <Text style={[styles.summaryValue, { color: COLORS.success }]}>{formatCurrencyBRL(stats.totalRecebido)}</Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.88}
          style={[styles.summaryCard, { backgroundColor: theme.surfaceMuted }]}
          onPress={onNavigateToContas}
        >
          <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>A receber</Text>
          <Text style={[styles.summaryValue, { color: COLORS.warning }]}>{formatCurrencyBRL(stats.totalReceber)}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.88}
          style={[styles.summaryCard, { backgroundColor: theme.surfaceMuted }]}
          onPress={onNavigateToDespesas}
        >
          <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>A pagar</Text>
          <Text style={[styles.summaryValue, { color: COLORS.danger }]}>{formatCurrencyBRL(totalPagar)}</Text>
        </TouchableOpacity>
        <View style={[styles.summaryCard, { backgroundColor: theme.surfaceMuted }]}>
          <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Saldo atual</Text>
          <Text style={[styles.summaryValue, { color: saldoAtual >= 0 ? COLORS.success : COLORS.danger }]}>
            {formatCurrencyBRL(saldoAtual)}
          </Text>
        </View>
      </View>

      <View style={styles.insightsRow}>
        <View style={[styles.insightCard, { backgroundColor: theme.surfaceMuted }]}>
          <Text style={[styles.insightLabel, { color: theme.textSecondary }]}>Saldo projetado</Text>
          <Text style={[styles.insightValue, { color: theme.textPrimary }]}>{formatCurrencyBRL(saldoProjetado)}</Text>
        </View>
        <View style={[styles.insightCard, { backgroundColor: theme.surfaceMuted }]}>
          <Text style={[styles.insightLabel, { color: theme.textSecondary }]}>Ticket médio</Text>
          <Text style={[styles.insightValue, { color: theme.textPrimary }]}>{formatCurrencyBRL(stats.ticketMedio)}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overviewCard: {
    marginTop: SPACING.md,
    borderWidth: 1.5,
    borderRadius: RADIUS.lg,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  overviewTopRow: {
    gap: 10,
  },
  overviewMainBlock: {
    gap: 4,
  },
  overviewLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  overviewValue: {
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  overviewCaption: {
    fontSize: 12,
    fontWeight: '600',
  },
  overviewBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  overviewBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  summaryCard: {
    width: '48.7%',
    borderRadius: RADIUS.md,
    padding: 12,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  summaryValue: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: '900',
  },
  insightsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  insightCard: {
    flex: 1,
    borderRadius: RADIUS.md,
    padding: 12,
  },
  insightLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  insightValue: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '800',
  },
});

export default React.memo(VendasSummary);
