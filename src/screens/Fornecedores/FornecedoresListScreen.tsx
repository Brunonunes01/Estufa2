import React, { useEffect } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../constants/theme';
import { useThemeMode } from '../../hooks/useThemeMode';
import { useFeedback } from '../../hooks/useFeedback';
import { useFornecedoresList } from '../../hooks/useFornecedoresList';
import EmptyState from '../../components/ui/EmptyState';
import SkeletonBlock from '../../components/ui/SkeletonBlock';
import ScreenHeaderCard from '../../components/ui/ScreenHeaderCard';

const FornecedoresListScreen = ({ navigation }: any) => {
  const theme = useThemeMode();
  const { showError } = useFeedback();
  const { fornecedores, loading, refreshing, isError, refetch } = useFornecedoresList();

  useEffect(() => {
    if (isError) showError('Não foi possível carregar os fornecedores.');
  }, [isError, showError]);

  return (
    <View style={[styles.container, { backgroundColor: theme.pageBackground }]}>
      <ScreenHeaderCard
        title="Fornecedores"
        subtitle="Organize parceiros de compra e contatos operacionais."
        badgeLabel="Supply"
        actionLabel="Novo Fornecedor"
        actionIcon="plus"
        onPressAction={() => navigation.navigate('FornecedorForm')}
      >
        <View style={styles.headerStats}>
          <View style={styles.headerStatChip}>
            <Text style={styles.headerStatValue}>{fornecedores.length}</Text>
            <Text style={styles.headerStatLabel}>Parceiros cadastrados</Text>
          </View>
          <View style={styles.headerStatChip}>
            <Text style={styles.headerStatValue}>
              {fornecedores.filter((fornecedor) => !!fornecedor.telefone).length}
            </Text>
            <Text style={styles.headerStatLabel}>Com telefone</Text>
          </View>
        </View>
      </ScreenHeaderCard>

      {loading ? (
        <View style={styles.skeletonWrapper}>
          <SkeletonBlock style={styles.skeletonCard} />
          <SkeletonBlock style={styles.skeletonCard} />
          <SkeletonBlock style={styles.skeletonCard} />
        </View>
      ) : null}

      <FlatList
        data={fornecedores}
        keyExtractor={(item) => item.id}
        refreshing={refreshing && !loading}
        onRefresh={refetch}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="truck-delivery-outline"
              title="Nenhum fornecedor encontrado"
              description="Cadastre fornecedores para vincular compras e contatos."
              actionLabel="Adicionar fornecedor"
              onAction={() => navigation.navigate('FornecedorForm')}
            />
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.item, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}
            onPress={() => navigation.navigate('FornecedorForm', { fornecedorId: item.id })}
            activeOpacity={0.9}
          >
            <View style={styles.itemTop}>
              <View style={[styles.avatar, { backgroundColor: `${COLORS.orange}22` }]}>
                <MaterialCommunityIcons name="truck-delivery-outline" size={20} color={COLORS.orange} />
              </View>
              <View style={styles.mainInfo}>
                <Text style={[styles.name, { color: theme.textPrimary }]}>{item.nome}</Text>
                <Text style={[styles.secondary, { color: theme.textSecondary }]}>
                  {item.contato || 'Contato não informado'}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color={theme.textSecondary} />
            </View>

            <View style={styles.metaRow}>
              <View style={styles.phoneBlock}>
                <MaterialCommunityIcons name="phone-outline" size={13} color={theme.textSecondary} />
                <Text style={[styles.phoneText, { color: theme.textSecondary }]}>
                  {item.telefone || 'Sem telefone'}
                </Text>
              </View>
              <Text style={[styles.metaHint, { color: theme.textSecondary }]}>Abrir cadastro</Text>
            </View>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('FornecedorForm')}>
        <MaterialCommunityIcons name="plus" size={30} color={COLORS.textLight} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingHorizontal: SPACING.md, paddingBottom: 84, paddingTop: SPACING.md },
  headerStats: { flexDirection: 'row', gap: 8 },
  headerStatChip: {
    flex: 1,
    backgroundColor: COLORS.whiteAlpha12,
    borderWidth: 1,
    borderColor: COLORS.whiteAlpha20,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  headerStatValue: { color: COLORS.textLight, fontSize: 15, fontWeight: '900' },
  headerStatLabel: { color: COLORS.whiteAlpha80, marginTop: 2, fontSize: 10, fontWeight: '700' },
  skeletonWrapper: { paddingHorizontal: SPACING.md, marginTop: SPACING.md, gap: 10 },
  skeletonCard: { width: '100%', height: 94, borderRadius: RADIUS.md },
  item: {
    padding: SPACING.md,
    borderRadius: 16,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    ...SHADOWS.card,
  },
  itemTop: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  mainInfo: { flex: 1 },
  name: { fontSize: 15, fontWeight: '900' },
  secondary: { marginTop: 2, fontSize: 12, fontWeight: '600' },
  metaRow: { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  phoneBlock: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  phoneText: { fontSize: 12, fontWeight: '600' },
  metaHint: { fontSize: 11, fontWeight: '600' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: COLORS.warning,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.floating,
  },
});

export default FornecedoresListScreen;
