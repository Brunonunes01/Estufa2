import React from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../../constants/theme';

interface VendasToolbarProps {
  searchPlaceholder?: string;
  searchText: string;
  onSearchChange: (text: string) => void;
  onShowFilters: () => void;
  onShowReports: () => void;
  onExportPdf: () => void;
  onGenerateStatement?: () => void;
  activeFiltersCount: number;
  showStatementBtn: boolean;
  statementClientName?: string | null;
  theme: any;
}

const VendasToolbar = ({
  searchPlaceholder = 'Buscar cliente, local ou produto...',
  searchText,
  onSearchChange,
  onShowFilters,
  onShowReports,
  onExportPdf,
  onGenerateStatement,
  activeFiltersCount,
  showStatementBtn,
  statementClientName,
  theme,
}: VendasToolbarProps) => {
  return (
    <View style={[styles.toolbarCard, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}>
      <View style={[styles.searchBox, { borderColor: theme.border, backgroundColor: theme.surfaceBackground }]}>
        <MaterialCommunityIcons name="magnify" size={20} color={theme.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: theme.textPrimary }]}
          placeholder={searchPlaceholder}
          placeholderTextColor={theme.textMuted}
          value={searchText}
          onChangeText={onSearchChange}
        />
        {searchText ? (
          <TouchableOpacity onPress={() => onSearchChange('')}>
            <MaterialCommunityIcons name="close-circle" size={18} color={theme.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: theme.border, backgroundColor: theme.surfaceMuted }]}
          onPress={onShowFilters}
        >
          <MaterialCommunityIcons name="filter-variant" size={20} color={theme.info} />
          <Text style={[styles.actionBtnText, { color: theme.textPrimary }]}>Filtros</Text>
          {activeFiltersCount > 0 ? (
            <View style={[styles.filterCountBadge, { backgroundColor: theme.info }]}>
              <Text style={styles.filterCountText}>{activeFiltersCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: theme.border, backgroundColor: theme.surfaceMuted }]}
          onPress={onShowReports}
        >
          <MaterialCommunityIcons name="chart-box-outline" size={20} color={theme.info} />
          <Text style={[styles.actionBtnText, { color: theme.textPrimary }]}>Resumo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: theme.border, backgroundColor: theme.surfaceMuted }]}
          onPress={onExportPdf}
        >
          <MaterialCommunityIcons name="file-pdf-box" size={20} color={theme.info} />
          <Text style={[styles.actionBtnText, { color: theme.textPrimary }]}>PDF</Text>
        </TouchableOpacity>

        {showStatementBtn && onGenerateStatement && (
          <TouchableOpacity
            style={[
              styles.actionBtn,
              { borderColor: COLORS.success, backgroundColor: `${COLORS.success}10`, width: '100%' },
            ]}
            onPress={onGenerateStatement}
          >
            <MaterialCommunityIcons name="account-details-outline" size={20} color={COLORS.success} />
            <Text style={[styles.actionBtnText, { color: COLORS.success }]}>
              {statementClientName ? `Extrato: ${statementClientName}` : 'Gerar Extrato do Cliente'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  toolbarCard: {
    marginTop: SPACING.md,
    borderWidth: 1.5,
    borderRadius: RADIUS.lg,
    padding: 16,
    ...SHADOWS.card,
  },
  searchBox: {
    borderWidth: 1.5,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    minHeight: 48,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  actionBtn: {
    flex: 1,
    minWidth: '30%',
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    minHeight: 48,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  filterCountBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    position: 'absolute',
    top: -8,
    right: -4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  filterCountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
});

export default React.memo(VendasToolbar);
