import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS, RADIUS } from '../../../constants/theme';
import { formatCurrencyBRL } from '../vendasListUtils';

interface VendasReportModalProps {
  visible: boolean;
  onClose: () => void;
  theme: any;
  reportStats: any;
  reportPeriodLabel: string;
  reportStartDate: Date | null;
  setReportStartDate: (date: Date | null) => void;
  reportEndDate: Date | null;
  setReportEndDate: (date: Date | null) => void;
  showReportStartPicker: boolean;
  setShowReportStartPicker: (show: boolean) => void;
  showReportEndPicker: boolean;
  setShowReportEndPicker: (show: boolean) => void;
  reportStatusFilter: 'todos' | 'pago' | 'pendente';
  setReportStatusFilter: (status: 'todos' | 'pago' | 'pendente') => void;
  onExportPdf: () => void;
  onExportAccountingPdf: () => void;
  onExportAccountingExcel: () => void;
  onShareReport: () => void;
}

const VendasReportModal = ({
  visible,
  onClose,
  theme,
  reportStats,
  reportPeriodLabel,
  reportStartDate,
  setReportStartDate,
  reportEndDate,
  setReportEndDate,
  showReportStartPicker,
  setShowReportStartPicker,
  showReportEndPicker,
  setShowReportEndPicker,
  reportStatusFilter,
  setReportStatusFilter,
  onExportPdf,
  onExportAccountingPdf,
  onExportAccountingExcel,
  onShareReport,
}: VendasReportModalProps) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
        <View style={[styles.reportCard, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}>
          <View style={styles.reportHeader}>
            <View style={styles.reportHeaderTextWrap}>
              <Text style={[styles.reportTitle, { color: theme.textPrimary }]}>Resumo gerencial</Text>
              <Text style={[styles.reportPeriod, { color: theme.textSecondary }]}>{reportPeriodLabel}</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.dateRow}>
              <TouchableOpacity
                style={[styles.dateBtn, { borderColor: theme.border, backgroundColor: theme.surfaceMuted }]}
                onPress={() => setShowReportStartPicker(true)}
              >
                <Text style={[styles.dateBtnText, { color: theme.textPrimary }]}>
                  {reportStartDate ? reportStartDate.toLocaleDateString('pt-BR') : 'Início'}
                </Text>
                <MaterialCommunityIcons name="calendar" size={16} color={theme.info} />
              </TouchableOpacity>
              <Text style={[styles.dateSeparator, { color: theme.textSecondary }]}>até</Text>
              <TouchableOpacity
                style={[styles.dateBtn, { borderColor: theme.border, backgroundColor: theme.surfaceMuted }]}
                onPress={() => setShowReportEndPicker(true)}
              >
                <Text style={[styles.dateBtnText, { color: theme.textPrimary }]}>
                  {reportEndDate ? reportEndDate.toLocaleDateString('pt-BR') : 'Fim'}
                </Text>
                <MaterialCommunityIcons name="calendar" size={16} color={theme.info} />
              </TouchableOpacity>
            </View>

            {showReportStartPicker ? (
              <DateTimePicker
                value={reportStartDate || new Date()}
                mode="date"
                display="default"
                onChange={(_, d) => {
                  setShowReportStartPicker(false);
                  if (d) setReportStartDate(d);
                }}
              />
            ) : null}

            {showReportEndPicker ? (
              <DateTimePicker
                value={reportEndDate || new Date()}
                mode="date"
                display="default"
                onChange={(_, d) => {
                  setShowReportEndPicker(false);
                  if (d) setReportEndDate(d);
                }}
              />
            ) : null}

            <View style={[styles.sectionBox, { borderColor: theme.border, backgroundColor: theme.surfaceMuted, marginTop: 16 }]}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Filtro do resumo</Text>
              <View style={styles.reportFilterRow}>
                {(['todos', 'pago', 'pendente'] as const).map((status) => {
                  const active = reportStatusFilter === status;
                  const statusColor = status === 'pago' ? COLORS.success : status === 'pendente' ? COLORS.danger : theme.info;
                  return (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.reportFilterChip,
                        {
                          borderColor: active ? statusColor : theme.border,
                          backgroundColor: active ? (status === 'pago' ? COLORS.successSoft : status === 'pendente' ? theme.dangerBackground : theme.infoSoft) : theme.surfaceBackground,
                        },
                      ]}
                      onPress={() => setReportStatusFilter(status)}
                    >
                      <Text style={[styles.reportFilterChipText, { color: active ? statusColor : theme.textPrimary }]}>
                        {status === 'todos' ? 'Tudo' : status === 'pago' ? 'Só pagos' : 'Só pendentes'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={[styles.bigStat, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
              <Text style={[styles.bigStatLabel, { color: theme.textSecondary }]}>Total vendido</Text>
              <Text style={[styles.bigStatValue, { color: theme.textPrimary }]}>{formatCurrencyBRL(reportStats.totalValor)}</Text>
            </View>

            <View style={[styles.sectionBox, { borderColor: theme.border, backgroundColor: theme.surfaceMuted, marginBottom: 12 }]}>
              <View style={styles.statRow}>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Volume Total</Text>
                <Text style={[styles.statValue, { color: theme.textPrimary }]}>{reportStats.totalCaixas.toFixed(1)} caixas</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Qtd. Vendas</Text>
                <Text style={[styles.statValue, { color: theme.textPrimary }]}>{reportStats.totalItens} registros</Text>
              </View>
            </View>

            <View style={[styles.sectionBox, { borderColor: theme.border, backgroundColor: theme.surfaceMuted }]}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Métodos de pagamento</Text>
              {Object.keys(reportStats.porMetodo).length === 0 ? (
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Sem dados no período.</Text>
              ) : (
                Object.keys(reportStats.porMetodo).map((metodo) => (
                  <View key={metodo} style={[styles.statRow, { borderBottomColor: theme.divider }]}>
                    <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{metodo}</Text>
                    <Text style={[styles.statValue, { color: theme.textPrimary }]}>
                      {formatCurrencyBRL(reportStats.porMetodo[metodo])}
                    </Text>
                  </View>
                ))
              )}
            </View>

            <View style={styles.reportActions}>
              <TouchableOpacity
                style={[styles.reportActionBtn, { backgroundColor: theme.info }]}
                onPress={onExportPdf}
              >
                <MaterialCommunityIcons name="file-pdf-box" size={18} color={COLORS.textLight} />
                <Text style={styles.reportActionText}>Exportar PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.reportActionBtn, { backgroundColor: COLORS.secondary }]}
                onPress={onExportAccountingPdf}
              >
                <MaterialCommunityIcons name="file-document-outline" size={18} color={COLORS.textLight} />
                <Text style={styles.reportActionText}>PDF Contábil</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.reportActionBtn, { backgroundColor: COLORS.primary }]}
                onPress={onExportAccountingExcel}
              >
                <MaterialCommunityIcons name="microsoft-excel" size={18} color={COLORS.textLight} />
                <Text style={styles.reportActionText}>Excel (.xlsx)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.reportActionBtn, { backgroundColor: COLORS.whatsapp }]}
                onPress={onShareReport}
              >
                <MaterialCommunityIcons name="whatsapp" size={18} color={COLORS.textLight} />
                <Text style={styles.reportActionText}>Compartilhar</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  reportCard: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1.5,
    maxHeight: '90%',
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  reportHeaderTextWrap: {
    flex: 1,
    paddingRight: 10,
  },
  reportTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  reportPeriod: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  dateBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 10,
  },
  dateBtnText: {
    fontWeight: '700',
    fontSize: 13,
  },
  dateSeparator: {
    marginHorizontal: 4,
    fontWeight: '800',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  bigStat: {
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  bigStatLabel: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  bigStatValue: {
    fontSize: 34,
    fontWeight: '900',
    marginTop: 6,
    letterSpacing: -1,
  },
  sectionBox: {
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    borderBottomWidth: 1,
    paddingBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  reportActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
    marginBottom: 8,
  },
  reportActionBtn: {
    width: '48.4%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  reportActionText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  reportFilterRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  reportFilterChip: {
    borderWidth: 1.5,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportFilterChipText: {
    fontSize: 12,
    fontWeight: '800',
  },
});

export default React.memo(VendasReportModal);
