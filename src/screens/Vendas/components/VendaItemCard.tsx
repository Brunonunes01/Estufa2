import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../../../constants/theme';
import { formatCurrencyBRL } from '../vendasListUtils';

interface VendaItemCardProps {
  item: any;
  theme: any; // Using any for now to match current pattern, but should be properly typed
  navigation: any;
  isHydroSale: boolean;
  clienteNome: string;
  produtoNome: string;
  loteNome: string;
  dataVenda: any;
  localLabel: string;
  localNome: string;
  status: 'pago' | 'pendente' | 'cancelado';
  recebidoPor: string;
  onPrintReceipt: (id: string, item: any) => void;
  onReceive?: () => void;
  canWrite: boolean;
}

const VendaItemCard = ({
  item,
  theme,
  navigation,
  isHydroSale,
  clienteNome,
  produtoNome,
  loteNome,
  dataVenda,
  localLabel,
  localNome,
  status,
  recebidoPor,
  onPrintReceipt,
  onReceive,
  canWrite,
}: VendaItemCardProps) => {
  const statusTone =
    status === 'pendente'
      ? { bg: theme.dangerBackground, border: COLORS.cFECACA, text: COLORS.danger }
      : status === 'cancelado'
      ? { bg: theme.surfaceMuted, border: theme.border, text: theme.textSecondary }
      : { bg: theme.successBackground, border: COLORS.c86EFAC, text: COLORS.success };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-';
    try {
      const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return d.toLocaleDateString('pt-BR');
    } catch {
      return '-';
    }
  };

  return (
    <View
      style={[
        styles.saleCard,
        {
          backgroundColor: theme.surfaceBackground,
          borderColor: theme.border,
          borderLeftColor: statusTone.text,
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={canWrite ? 0.85 : 1}
        disabled={!canWrite}
        onPress={
          canWrite
            ? () =>
                isHydroSale
                  ? navigation.navigate('HidroponiaVendaForm', { vendaId: item.id })
                  : navigation.navigate('ColheitaForm', { vendaId: item.id, isEdit: true })
            : undefined
        }
      >
        <View style={styles.saleTopRow}>
          <View style={styles.saleTopLeft}>
            <Text style={[styles.saleProductTitle, { color: theme.textPrimary }]} numberOfLines={1}>
              {produtoNome}
            </Text>
            <Text style={[styles.saleClient, { color: theme.textSecondary }]} numberOfLines={1}>
              {clienteNome}
            </Text>
            <Text style={[styles.saleQuickMeta, { color: theme.textSecondary }]} numberOfLines={1}>
              {formatDate(dataVenda)} • {localLabel}: {localNome}
            </Text>
          </View>
          <View style={styles.saleTopRight}>
            <Text style={[styles.saleTotal, { color: theme.textPrimary }]}>{formatCurrencyBRL(item.valorTotal || item.total || 0)}</Text>
            <View style={[styles.badge, { backgroundColor: statusTone.bg, borderColor: statusTone.border }]}>
              <Text style={[styles.badgeText, { color: statusTone.text }]}>
                {status.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.saleBadgesRow}>
          <View style={[styles.methodBadge, { borderColor: theme.border, backgroundColor: theme.surfaceMuted }]}>
            <Text style={[styles.methodBadgeText, { color: theme.textSecondary }]}>
              {String(item.metodoPagamento || item.formaPagamento || 'N/A').toUpperCase()}
            </Text>
          </View>
          <View style={[styles.methodBadge, { borderColor: theme.border, backgroundColor: theme.surfaceMuted }]}>
            <Text style={[styles.methodBadgeText, { color: theme.textSecondary }]}>LOTE {loteNome}</Text>
          </View>
          {isHydroSale ? (
            <View style={[styles.methodBadge, { borderColor: theme.border, backgroundColor: theme.surfaceMuted }]}>
              <Text style={[styles.methodBadgeText, { color: theme.info }]}>HIDROPONIA</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.saleInfoGrid}>
          <View style={[styles.saleInfoCard, { backgroundColor: theme.surfaceMuted }]}>
            <Text style={[styles.saleInfoLabel, { color: theme.textSecondary }]}>Quantidade</Text>
            <Text style={[styles.saleInfoValue, { color: theme.textPrimary }]}>
              {item.quantidade || item.qtd || 0} {item.unidade || ''}
            </Text>
          </View>
          <View style={[styles.saleInfoCard, { backgroundColor: theme.surfaceMuted }]}>
            <Text style={[styles.saleInfoLabel, { color: theme.textSecondary }]}>Preço unitário</Text>
            <Text style={[styles.saleInfoValue, { color: theme.textPrimary }]}>
              {formatCurrencyBRL(item.precoUnitario || 0)}
            </Text>
          </View>
        </View>
        <Text style={[styles.saleMetaStrong, { color: theme.textSecondary }]}>
          {status === 'pago' ? `Recebido por: ${recebidoPor}` : 'Recebimento pendente'}
        </Text>
      </TouchableOpacity>

      <View style={[styles.saleFooter, { borderTopColor: theme.divider }]}>
        {canWrite && status === 'pendente' && onReceive ? (
          <TouchableOpacity
            style={[styles.saleFooterBtn, { backgroundColor: `${COLORS.success}18` }]}
            onPress={onReceive}
          >
            <MaterialCommunityIcons name="cash-check" size={20} color={COLORS.success} />
            <Text style={[styles.saleFooterBtnText, { color: COLORS.success }]}>Receber</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={[styles.saleFooterBtn, { backgroundColor: theme.surfaceMuted }]}
          onPress={() => onPrintReceipt(item.id, item)}
        >
          <MaterialCommunityIcons name="file-pdf-box" size={20} color={theme.info} />
          <Text style={[styles.saleFooterBtnText, { color: theme.info }]}>PDF</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  saleCard: {
    borderWidth: 1.5,
    borderLeftWidth: 6,
    borderRadius: RADIUS.md,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  saleTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  saleTopLeft: {
    flex: 1,
  },
  saleTopRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  saleProductTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  saleClient: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: '800',
  },
  saleQuickMeta: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
  },
  saleTotal: {
    fontSize: 18,
    fontWeight: '900',
  },
  saleBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    marginBottom: 2,
    flexWrap: 'wrap',
  },
  saleInfoGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  saleInfoCard: {
    flex: 1,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  saleInfoLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  saleInfoValue: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '800',
  },
  saleMetaStrong: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: '700',
  },
  badge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  methodBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  methodBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  saleFooter: {
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  saleFooterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: RADIUS.md,
  },
  saleFooterBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
});

export default React.memo(VendaItemCard);
