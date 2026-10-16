import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../../../constants/theme';
import { formatDateSafe } from '../../../utils/date';
import LoadingButton from '../../../components/ui/LoadingButton';

interface DespesaItemCardProps {
  item: any;
  theme: any;
  isOwner: boolean;
  canWrite: boolean;
  deletingId: string | null;
  payingId: string | null;
  onDelete: (item: any) => void;
  onPay: (item: any) => void;
  onOpenComprovante: (url?: string | null) => void;
  caixaPessoaNome: string;
}

const getIcon = (cat: string) => {
  switch (cat) {
    case 'energia':
      return 'lightning-bolt';
    case 'agua':
      return 'water';
    case 'mao_de_obra':
      return 'account-hard-hat';
    case 'combustivel':
      return 'gas-station';
    case 'manutencao':
      return 'tools';
    default:
      return 'cash-minus';
  }
};

const DespesaItemCard = ({
  item,
  theme,
  isOwner,
  canWrite,
  deletingId,
  payingId,
  onDelete,
  onPay,
  onOpenComprovante,
  caixaPessoaNome,
}: DespesaItemCardProps) => {
  const isPendente = item.status === 'pendente';
  const isDeleting = deletingId === item.id;
  const isPaying = payingId === item.id;

  return (
    <View style={[styles.card, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}>
      <View style={styles.cardTopRow}>
        <View style={[styles.iconBox, { backgroundColor: `${COLORS.danger}15` }]}>
          <MaterialCommunityIcons name={getIcon(item.categoria) as any} size={22} color={COLORS.danger} />
        </View>
        <View style={styles.cardTitleArea}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>{item.descricao}</Text>
          <Text style={[styles.categoryText, { color: theme.textSecondary }]}>{item.categoria.replace(/_/g, ' ')}</Text>
          <Text style={[styles.date, { color: theme.textMuted }]}>{formatDateSafe(item.dataDespesa)}</Text>
        </View>
        <View
          style={[
            styles.statusPill,
            {
              backgroundColor: isPendente ? theme.warningSoft : theme.successSoft,
            },
          ]}
        >
          <Text style={[styles.statusPillText, { color: isPendente ? COLORS.warning : COLORS.success }]}>{isPendente ? 'PENDENTE' : 'PAGO'}</Text>
        </View>
      </View>

      <View style={styles.infoGrid}>
        <View style={[styles.infoCard, { backgroundColor: theme.surfaceMuted }]}>
          <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Valor</Text>
          <Text style={[styles.infoValueStrong, { color: COLORS.danger }]}>R$ {item.valor.toFixed(2)}</Text>
        </View>
        <View style={[styles.infoCard, { backgroundColor: theme.surfaceMuted }]}>
          <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Caixa responsável</Text>
          <Text style={[styles.infoValue, { color: theme.textPrimary }]} numberOfLines={1}>
            {caixaPessoaNome}
          </Text>
        </View>
      </View>

      <View style={[styles.metaPanel, { backgroundColor: theme.surfaceMuted }]}>
        {isPendente && item.dataVencimento ? (
          <Text style={[styles.metaText, { color: theme.textSecondary }]}>Vencimento: {formatDateSafe(item.dataVencimento)}</Text>
        ) : (
          <Text style={[styles.metaText, { color: theme.textSecondary }]}>Pagamento registrado</Text>
        )}
        {item.comprovanteUrl ? (
          <TouchableOpacity style={styles.comprovanteRow} onPress={() => onOpenComprovante(item.comprovanteUrl)}>
            <MaterialCommunityIcons name="eye-outline" size={16} color={theme.info} />
            <Text style={[styles.metaText, { color: theme.info }]}>Ver comprovante</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={[styles.actionsRow, { borderTopColor: theme.divider }]}>
        {isOwner && canWrite ? (
          <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(item)} disabled={isDeleting}>
            <Text style={styles.deleteText}>Excluir</Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}

        {isPendente && canWrite && (
          <LoadingButton
            label="Dar baixa"
            variant="success"
            loading={isPaying}
            onPress={() => onPay(item)}
            style={styles.payButton}
            textStyle={styles.payButtonText}
          />
        )}
      </View>
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
  cardTopRow: { flexDirection: 'row', alignItems: 'center' },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTitleArea: { flex: 1 },
  title: { fontSize: 16, fontWeight: '900', letterSpacing: -0.2 },
  categoryText: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  date: { marginTop: 4, fontSize: 12, fontWeight: '600' },
  statusPill: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  statusPillText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },

  infoGrid: { flexDirection: 'row', gap: 10, marginTop: 16 },
  infoCard: {
    flex: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: { marginTop: 4, fontSize: 13, fontWeight: '800' },
  infoValueStrong: {
    marginTop: 4,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },

  metaPanel: {
    marginTop: 12,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  metaText: { fontSize: 12, fontWeight: '700' },
  comprovanteRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },

  actionsRow: {
    marginTop: 16,
    borderTopWidth: 1,
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deleteBtn: {
    paddingVertical: 8,
  },
  deleteText: {
    color: '#94A3B8',
    fontWeight: '800',
    fontSize: 13,
  },
  payButton: {
    minWidth: 130,
    minHeight: 40,
    borderRadius: 12,
  },
  payButtonText: {
    fontSize: 14,
  },
});

export default React.memo(DespesaItemCard);
