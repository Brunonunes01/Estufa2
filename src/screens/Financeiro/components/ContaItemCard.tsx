import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../../../constants/theme';
import { Venda } from '../../../types/domain';
import { isChequeEmMaosPayment } from '../../../services/paymentStatusHelpers';

interface ContaItemCardProps {
  item: Venda;
  theme: any;
  clienteNome: string;
  formatDate: (timestamp: any) => string;
  formatMetodo: (metodo?: string | null) => string;
  formatCurrency: (value: number) => string;
  getVendaTotal: (venda: Venda) => number;
  getOpenedDaysLabel: (venda: Venda) => string;
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
  getOpenedDaysLabel,
  onReceber,
  onPress,
}: ContaItemCardProps) => {
  const total = getVendaTotal(item);
  const primeiraLinha = item.itens?.[0];
  const quantidade = Number((item as any).quantidade || primeiraLinha?.quantidade || 0);
  const unidade = String((item as any).unidade || (primeiraLinha as any)?.unidade || 'un');
  const precoUnitario = Number((item as any).precoUnitario || primeiraLinha?.valorUnitario || 0);
  const metodoLabel = formatMetodo(item.metodoPagamento || item.formaPagamento || undefined);
  const isCheque = item.metodoPagamento === 'cheque';
  const isChequeEmMaos = isChequeEmMaosPayment(item.formaPagamento);
  const chequeDate = item.dataCompensacaoCheque || item.dataVencimento || null;
  const openedLabel = getOpenedDaysLabel(item);
  const pagamentoPara = String((item as any).pagamentoParaNome || (item as any).pagamentoPara || '').trim();
  const observacoes = String(item.observacoes || '').trim();

  return (
    <View style={[styles.card, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}>
      <TouchableOpacity activeOpacity={0.85} style={styles.cardTouch} onPress={onPress}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderMain}>
            <Text style={[styles.clienteName, { color: theme.textPrimary }]}>{clienteNome}</Text>
            <Text style={[styles.productName, { color: theme.textSecondary }]} numberOfLines={1}>
              {String(primeiraLinha?.descricao || 'Venda registrada')}
            </Text>
            <View style={styles.chipsRow}>
              <View style={[styles.metaChip, { backgroundColor: theme.infoSoft }]}>
                <MaterialCommunityIcons name="credit-card-clock-outline" size={13} color={theme.info} />
                <Text style={[styles.metaChipText, { color: theme.info }]}>
                  {isChequeEmMaos ? 'CHEQUE EM MÃOS' : metodoLabel}
                </Text>
              </View>
              <View style={[styles.metaChip, { backgroundColor: theme.warningSoft }]}>
                <MaterialCommunityIcons name="calendar-clock-outline" size={13} color={theme.warning} />
                <Text style={[styles.metaChipText, { color: theme.warning }]}>{openedLabel}</Text>
              </View>
            </View>
            <Text style={[styles.dateText, { color: theme.textMuted }]}>Venda em {formatDate(item.dataVenda)}</Text>
            {isChequeEmMaos ? (
              <View style={[styles.chequeNotice, { backgroundColor: theme.warningSoft, borderColor: theme.warning }]}>
                <MaterialCommunityIcons name="cash-clock" size={15} color={theme.warning} />
                <Text style={[styles.chequeNoticeText, { color: theme.warning }]}>
                  Cheque em mãos · destino a definir
                </Text>
              </View>
            ) : isCheque && chequeDate ? (
              <View style={[styles.chequeNotice, { backgroundColor: theme.warningSoft, borderColor: theme.warning }]}>
                <MaterialCommunityIcons name="calendar-clock-outline" size={15} color={theme.warning} />
                <Text style={[styles.chequeNoticeText, { color: theme.warning }]}>
                  Não pago · compensação prevista em {formatDate(chequeDate)}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={[styles.badge, { backgroundColor: theme.warningSoft, borderColor: theme.warning }]}>
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

        {observacoes ? (
          <View style={[styles.noteCard, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
            <Text style={[styles.noteLabel, { color: theme.textSecondary }]}>Observacao da venda</Text>
            <Text style={[styles.noteText, { color: theme.textPrimary }]} numberOfLines={3}>
              {observacoes}
            </Text>
          </View>
        ) : null}

        <View style={[styles.bottomStrip, { borderTopColor: theme.border }]}>
          <View style={styles.bottomStripItem}>
            <Text style={[styles.bottomStripLabel, { color: theme.textMuted }]}>Receber em</Text>
            <Text style={[styles.bottomStripValue, { color: theme.textPrimary }]}>
              {pagamentoPara || (isCheque ? 'A definir' : 'Caixa nao definido')}
            </Text>
          </View>
          <View style={styles.bottomStripItem}>
            <Text style={[styles.bottomStripLabel, { color: theme.textMuted }]}>Acao</Text>
            <Text style={[styles.bottomStripValue, { color: theme.info }]}>Registrar baixa</Text>
          </View>
        </View>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.receiveBtn, { backgroundColor: theme.info }]} 
        activeOpacity={0.8}
        onPress={() => onReceber(item)}
      >
        <MaterialCommunityIcons name="check-circle-outline" size={20} color={COLORS.textLight} />
        <Text style={styles.btnText}>Registrar Recebimento</Text>
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
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 8 },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  metaChipText: { fontSize: 11, fontWeight: '800' },
  dateText: { fontSize: 12, marginTop: 4, fontWeight: '600' },
  chequeNotice: {
    marginTop: 9,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  chequeNoticeText: { fontSize: 11, fontWeight: '800' },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  infoGrid: { flexDirection: 'row', gap: 10, marginTop: 16, marginBottom: 16 },
  infoCard: { flex: 1, borderRadius: 14, padding: 12 },
  infoLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { marginTop: 4, fontSize: 13, fontWeight: '700' },
  infoValueStrong: { marginTop: 4, fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  noteCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  noteLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  noteText: { marginTop: 6, fontSize: 12, fontWeight: '600', lineHeight: 17 },
  bottomStrip: {
    borderTopWidth: 1,
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  bottomStripItem: { flex: 1 },
  bottomStripLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  bottomStripValue: { marginTop: 4, fontSize: 12, fontWeight: '800' },
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
