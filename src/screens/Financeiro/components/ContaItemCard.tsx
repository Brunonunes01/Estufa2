import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../../../constants/theme';
import { Venda } from '../../../types/domain';

interface ContaItemCardProps {
  item: Venda;
  theme: any;
  clienteNome: string;
  formatDate: (timestamp: any) => string;
  formatMetodo: (metodo?: string | null) => string;
  formatCurrency: (value: number) => string;
  getVendaTotal: (venda: Venda) => number;
  onReceber: (item: Venda) => void;
  onPress: () => void;
}

const ContaItemCard = ({
  item,
  theme,
  clienteNome,
  formatDate,
  formatMetodo,
  formatCurrency,
  getVendaTotal,
  onReceber,
  onPress,
}: ContaItemCardProps) => {
  const total = getVendaTotal(item);
  const primeiraLinha = item.itens?.[0];
  const quantidade = Number((item as any).quantidade || primeiraLinha?.quantidade || 0);
  const unidade = String((item as any).unidade || (primeiraLinha as any)?.unidade || 'un');
  const precoUnitario = Number((item as any).precoUnitario || primeiraLinha?.valorUnitario || 0);
  const metodoLabel = formatMetodo(item.metodoPagamento || item.formaPagamento || undefined);

  return (
    <View style={[styles.card, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}>
      <TouchableOpacity activeOpacity={0.85} style={styles.cardTouch} onPress={onPress}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderMain}>
            <Text style={[styles.clienteName, { color: theme.textPrimary }]}>{clienteNome}</Text>
            <Text style={[styles.productName, { color: theme.textSecondary }]} numberOfLines={1}>
              {String(primeiraLinha?.descricao || 'Venda registrada')}
            </Text>
            <View style={styles.metodoRow}>
              <MaterialCommunityIcons name="credit-card-clock-outline" size={14} color={theme.info} />
              <Text style={[styles.metodoText, { color: theme.info }]}>{metodoLabel}</Text>
            </View>
            <Text style={[styles.dateText, { color: theme.textMuted }]}>Venda em {formatDate(item.dataVenda)}</Text>
          </View>

          <View style={[styles.badge, { backgroundColor: theme.dangerBackground, borderColor: COLORS.cFECACA }]}>
            <Text style={[styles.badgeText, { color: COLORS.danger }]}>PENDENTE</Text>
          </View>
        </View>

        <View style={styles.infoGrid}>
          <View style={[styles.infoCard, { backgroundColor: theme.surfaceMuted }]}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Composição</Text>
            <Text style={[styles.infoValue, { color: theme.textPrimary }]}>
              {quantidade} {unidade} x {formatCurrency(precoUnitario)}
            </Text>
          </View>
          <View style={[styles.infoCard, { backgroundColor: theme.surfaceMuted }]}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Total</Text>
            <Text style={[styles.infoValueStrong, { color: theme.textPrimary }]}>{formatCurrency(total)}</Text>
          </View>
        </View>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.receiveBtn, { backgroundColor: theme.info }]} 
        activeOpacity={0.8}
        onPress={() => onReceber(item)}
      >
        <MaterialCommunityIcons name="check-circle-outline" size={20} color={COLORS.textLight} />
        <Text style={styles.btnText}>Dar Baixa / Receber</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    marginBottom: 14,
    borderWidth: 1.5,
    padding: 16,
    ...SHADOWS.card,
  },
  cardTouch: { width: '100%' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardHeaderMain: { flex: 1, paddingRight: 8 },
  clienteName: { fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  productName: { marginTop: 3, fontSize: 13, fontWeight: '700' },
  metodoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 },
  metodoText: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  dateText: { fontSize: 12, marginTop: 4, fontWeight: '600' },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  infoGrid: { flexDirection: 'row', gap: 10, marginTop: 16, marginBottom: 16 },
  infoCard: { flex: 1, borderRadius: 14, padding: 12 },
  infoLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { marginTop: 4, fontSize: 13, fontWeight: '700' },
  infoValueStrong: { marginTop: 4, fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  receiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: 14,
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  btnText: { color: COLORS.textLight, fontWeight: '900', fontSize: 14, letterSpacing: 0.3 },
});

export default React.memo(ContaItemCard);
