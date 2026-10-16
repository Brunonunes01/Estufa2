import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../../../constants/theme';
import { formatCurrencyBRL, getSaleStatusBadgeLabel } from '../vendasListUtils';
import { isChequeEmMaosPayment } from '../../../services/paymentStatusHelpers';

interface VendaItemCardProps {
  item: any;
  theme: any; // Using any for now to match current pattern, but should be properly typed
  clienteNome: string;
  produtoNome: string;
  loteNome: string;
  dataVenda: any;
  localLabel: string;
  localNome: string;
  status: 'pago' | 'pendente' | 'cancelado';
  recebidoPor: string;
  onPrintReceipt: (id: string, item: any) => void;
  isGeneratingReceipt?: boolean;
  onDelete?: () => void;
  isDeleting?: boolean;
  onReceive?: () => void;
  onEdit?: () => void;
  onEditReceipt?: () => void;
  onRemoveReceipt?: () => void;
  isRemovingReceipt?: boolean;
  canWrite: boolean;
}

const VendaItemCard = ({
  item,
  theme,
  clienteNome,
  produtoNome,
  loteNome,
  dataVenda,
  localLabel,
  localNome,
  status,
  recebidoPor,
  onPrintReceipt,
  isGeneratingReceipt = false,
  onDelete,
  isDeleting = false,
  onReceive,
  onEdit,
  onEditReceipt,
  onRemoveReceipt,
  isRemovingReceipt = false,
  canWrite,
}: VendaItemCardProps) => {
  const paymentMethod = item.metodoPagamento || item.formaPagamento || '';
  const isCheque = String(paymentMethod).toLowerCase() === 'cheque';
  const isChequeEmMaos = isChequeEmMaosPayment(item.formaPagamento);
  const statusBadgeLabel = isChequeEmMaos
    ? 'CHEQUE EM MÃOS'
    : getSaleStatusBadgeLabel(status, paymentMethod);
  const chequeDate = item.dataCompensacaoCheque || item.dataVencimento || null;
  const valorCombinado = Number(item.valorTotal || item.total || 0);
  const valorRecebido =
    item.valorRecebido !== null && item.valorRecebido !== undefined
      ? Number(item.valorRecebido)
      : valorCombinado;
  const hasPaymentDifference =
    status === 'pago' && Math.abs(valorRecebido - valorCombinado) >= 0.01;
  const statusTone =
    status === 'pendente'
      ? {
          bg: theme.dangerBackground,
          border: COLORS.cFECACA,
          text: COLORS.danger,
        }
      : status === 'cancelado'
        ? {
            bg: theme.surfaceMuted,
            border: theme.border,
            text: theme.textSecondary,
          }
        : {
            bg: theme.successBackground,
            border: COLORS.c86EFAC,
            text: COLORS.success,
          };

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
      <View>
        <View style={styles.saleTopRow}>
          <View style={styles.saleTopLeft}>
            <Text
              style={[styles.saleProductTitle, { color: theme.textPrimary }]}
              numberOfLines={1}
            >
              {produtoNome}
            </Text>
            <Text
              style={[styles.saleClient, { color: theme.textSecondary }]}
              numberOfLines={1}
            >
              {clienteNome}
            </Text>
            <Text
              style={[styles.saleQuickMeta, { color: theme.textSecondary }]}
              numberOfLines={1}
            >
              {formatDate(dataVenda)} • {localLabel}: {localNome}
            </Text>
          </View>
          <View style={styles.saleTopRight}>
            <Text style={[styles.saleTotal, { color: theme.textPrimary }]}>
              {formatCurrencyBRL(valorCombinado)}
            </Text>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: statusTone.bg,
                  borderColor: statusTone.border,
                },
              ]}
            >
              <Text style={[styles.badgeText, { color: statusTone.text }]}>
                {statusBadgeLabel}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.saleBadgesRow}>
          {status !== 'pago' ? (
            <View
              style={[
                styles.methodBadge,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.surfaceMuted,
                },
              ]}
            >
              <Text
                style={[styles.methodBadgeText, { color: theme.textSecondary }]}
              >
                {isChequeEmMaos
                  ? 'CHEQUE EM MÃOS'
                  : String(paymentMethod || 'N/A').toUpperCase()}
              </Text>
            </View>
          ) : null}
          <View
            style={[
              styles.methodBadge,
              {
                borderColor: theme.border,
                backgroundColor: theme.surfaceMuted,
              },
            ]}
          >
            <Text
              style={[styles.methodBadgeText, { color: theme.textSecondary }]}
            >
              LOTE {loteNome}
            </Text>
          </View>
          
        </View>

        <View style={styles.saleInfoGrid}>
          <View
            style={[
              styles.saleInfoCard,
              { backgroundColor: theme.surfaceMuted },
            ]}
          >
            <Text
              style={[styles.saleInfoLabel, { color: theme.textSecondary }]}
            >
              Quantidade
            </Text>
            <Text style={[styles.saleInfoValue, { color: theme.textPrimary }]}>
              {item.quantidade || item.qtd || 0} {item.unidade || ''}
            </Text>
          </View>
          <View
            style={[
              styles.saleInfoCard,
              { backgroundColor: theme.surfaceMuted },
            ]}
          >
            <Text
              style={[styles.saleInfoLabel, { color: theme.textSecondary }]}
            >
              Preço unitário
            </Text>
            <Text style={[styles.saleInfoValue, { color: theme.textPrimary }]}>
              {formatCurrencyBRL(item.precoUnitario || 0)}
            </Text>
          </View>
        </View>
        <Text style={[styles.saleMetaStrong, { color: theme.textSecondary }]}>
          {status === 'pago'
            ? `Recebido em ${formatDate(item.dataRecebimento || item.dataVenda)} por ${recebidoPor}`
            : isChequeEmMaos
              ? `Cheque em mãos desde ${formatDate(item.dataRecebimento || item.dataVenda)} · destino a definir`
              : isCheque
              ? `Não pago · compensação prevista em ${formatDate(chequeDate)}`
              : 'Recebimento pendente'}
        </Text>
        {status === 'pago' ? (
          <View
            style={[
              styles.receivedAmountRow,
              {
                backgroundColor: hasPaymentDifference
                  ? theme.warningSoft
                  : theme.successBackground,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="cash-check"
              size={16}
              color={hasPaymentDifference ? theme.warning : COLORS.success}
            />
            <Text
              style={[
                styles.receivedAmountText,
                {
                  color: hasPaymentDifference ? theme.warning : COLORS.success,
                },
              ]}
            >
              Pago: {formatCurrencyBRL(valorRecebido)}
              {hasPaymentDifference ? ' • diferente do combinado' : ''}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.saleFooter, { borderTopColor: theme.divider }]}>
        {canWrite && onEdit ? (
          <TouchableOpacity
            style={[
              styles.saleFooterBtn,
              { backgroundColor: `${theme.info}18` },
            ]}
            disabled={isDeleting}
            onPress={onEdit}
          >
            <MaterialCommunityIcons
              name="pencil-outline"
              size={20}
              color={theme.info}
            />
            <Text style={[styles.saleFooterBtnText, { color: theme.info }]}>
              Editar venda
            </Text>
          </TouchableOpacity>
        ) : null}
        {canWrite && status === 'pendente' && onReceive ? (
          <TouchableOpacity
            style={[
              styles.saleFooterBtn,
              { backgroundColor: `${COLORS.success}18` },
            ]}
            onPress={onReceive}
          >
            <MaterialCommunityIcons
              name={isCheque ? 'calendar-check-outline' : 'cash-check'}
              size={20}
              color={COLORS.success}
            />
            <Text style={[styles.saleFooterBtnText, { color: COLORS.success }]}>
              Confirmar recebimento
            </Text>
          </TouchableOpacity>
        ) : null}
        {canWrite && status === 'pago' && onEditReceipt ? (
          <TouchableOpacity
            style={[
              styles.saleFooterBtn,
              { backgroundColor: `${theme.info}18` },
            ]}
            onPress={onEditReceipt}
          >
            <MaterialCommunityIcons
              name="pencil-outline"
              size={20}
              color={theme.info}
            />
            <Text style={[styles.saleFooterBtnText, { color: theme.info }]}>
              Editar recebimento
            </Text>
          </TouchableOpacity>
        ) : null}
        {canWrite && status === 'pago' && onRemoveReceipt ? (
          <TouchableOpacity
            style={[
              styles.saleFooterBtn,
              { backgroundColor: `${COLORS.danger}14` },
            ]}
            disabled={isRemovingReceipt || isDeleting}
            onPress={onRemoveReceipt}
          >
            {isRemovingReceipt ? (
              <ActivityIndicator size="small" color={COLORS.danger} />
            ) : (
              <MaterialCommunityIcons
                name="cash-remove"
                size={20}
                color={COLORS.danger}
              />
            )}
            <Text style={[styles.saleFooterBtnText, { color: COLORS.danger }]}>
              {isRemovingReceipt ? 'Removendo...' : 'Remover recebimento'}
            </Text>
          </TouchableOpacity>
        ) : null}
        {canWrite && onDelete ? (
          <TouchableOpacity
            style={[
              styles.saleFooterBtn,
              { backgroundColor: `${COLORS.danger}14` },
            ]}
            disabled={isDeleting}
            onPress={onDelete}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color={COLORS.danger} />
            ) : (
              <MaterialCommunityIcons
                name="trash-can-outline"
                size={20}
                color={COLORS.danger}
              />
            )}
            <Text style={[styles.saleFooterBtnText, { color: COLORS.danger }]}>
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={[
            styles.saleFooterBtn,
            { backgroundColor: theme.surfaceMuted },
          ]}
          disabled={isGeneratingReceipt || isDeleting}
          onPress={() => onPrintReceipt(item.id, item)}
        >
          {isGeneratingReceipt ? (
            <ActivityIndicator size="small" color={theme.info} />
          ) : (
            <MaterialCommunityIcons
              name="file-pdf-box"
              size={20}
              color={theme.info}
            />
          )}
          <Text style={[styles.saleFooterBtnText, { color: theme.info }]}>
            {isGeneratingReceipt ? 'Gerando...' : 'PDF'}
          </Text>
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
  receivedAmountRow: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 9,
    paddingVertical: 6,
    marginTop: 8,
  },
  receivedAmountText: { fontSize: 11, fontWeight: '900' },
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
    flexWrap: 'wrap',
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
