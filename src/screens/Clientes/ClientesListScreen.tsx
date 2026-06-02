import React, { useEffect } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../constants/theme';
import { useThemeMode } from '../../hooks/useThemeMode';
import { useFeedback } from '../../hooks/useFeedback';
import { useClientesList } from '../../hooks/useClientesList';
import { useAuth } from '../../hooks/useAuth';
import EmptyState from '../../components/ui/EmptyState';
import SkeletonBlock from '../../components/ui/SkeletonBlock';
import ScreenHeaderCard from '../../components/ui/ScreenHeaderCard';
import { listAllVendas } from '../../services/vendaService';
import { shareSalesReportPdf } from '../../services/receiptService';
import { listEstufas } from '../../services/estufaService';

const ClientesListScreen = ({ navigation }: any) => {
  const theme = useThemeMode();
  const { showError } = useFeedback();
  const { user, selectedTenantId, availableTenants } = useAuth();
  const { clientes, loading, refreshing, isError, refetch } = useClientesList();
  const targetId = selectedTenantId || user?.uid;

  useEffect(() => {
    if (isError) showError('Nao foi possivel carregar os clientes.');
  }, [isError, showError]);

  const toDate = (value: any): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    if (typeof value?.toDate === 'function') return value.toDate();
    if (typeof value?.seconds === 'number') return new Date(value.seconds * 1000);
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const normalizeStatus = (venda: any): 'PAGO' | 'PENDENTE' | 'CANCELADO' => {
    const st = String(venda?.statusPagamento || '').toLowerCase().trim();
    if (st === 'cancelado') return 'CANCELADO';
    if (st === 'pendente' || st === 'atrasado' || (!st && venda.metodoPagamento === 'prazo')) return 'PENDENTE';
    return 'PAGO';
  };

  const getVendaTotal = (venda: any) => {
    const item = venda.itens?.[0];
    const fallbackTotal = Number(item?.quantidade || 0) * Number(item?.valorUnitario || 0);
    return Number(venda.valorTotal || fallbackTotal || 0);
  };

  const handleExportClientReport = async (cliente: any) => {
    if (!targetId) {
      Alert.alert('Erro', 'Sessao invalida para gerar relatorio.');
      return;
    }
    try {
      const [vendasRaw, estufas] = await Promise.all([listAllVendas(targetId), listEstufas(targetId)]);
      const vendasCliente = vendasRaw.filter((v) => v.clienteId === cliente.id);
      const vendas = vendasCliente.filter((venda) => normalizeStatus(venda) !== 'CANCELADO');
      if (vendas.length === 0) {
        Alert.alert('Sem contas', 'Este cliente ainda nao possui contas pagas ou pendentes.');
        return;
      }

      const estufasMap: Record<string, string> = {};
      estufas.forEach((estufa) => {
        if (estufa.id) estufasMap[estufa.id] = estufa.nome;
      });

      const totalVendido = vendas.reduce((acc, venda) => {
        const total = getVendaTotal(venda);
        return normalizeStatus(venda) === 'CANCELADO' ? acc : acc + total;
      }, 0);
      const totalRecebido = vendas.reduce((acc, venda) => {
        if (normalizeStatus(venda) !== 'PAGO') return acc;
        return acc + getVendaTotal(venda);
      }, 0);
      const totalReceber = vendas.reduce((acc, venda) => {
        if (normalizeStatus(venda) !== 'PENDENTE') return acc;
        return acc + getVendaTotal(venda);
      }, 0);

      const periodDates = vendas
        .map((v) => toDate(v.dataVenda))
        .filter((d): d is Date => !!d)
        .sort((a, b) => a.getTime() - b.getTime());
      const periodo =
        periodDates.length > 0
          ? `${periodDates[0].toLocaleDateString('pt-BR')} ate ${periodDates[periodDates.length - 1].toLocaleDateString('pt-BR')}`
          : 'Periodo completo';

      const nomeProdutor =
        availableTenants.find((tenant) => tenant.uid === targetId)?.ownerName || user?.name || 'Produtor';

      await shareSalesReportPdf({
        nomeProdutor,
        nomeEstufa: cliente.nome,
        tituloRelatorio: `Contas do Cliente - ${cliente.nome}`,
        periodo,
        observacoes: `Relatorio consolidado de contas pagas e pendentes do cliente ${cliente.nome}.`,
        totais: {
          totalReceber,
          totalPagar: 0,
          saldo: totalRecebido + totalReceber,
          totalVendido,
          totalRecebido,
          ticketMedio: vendas.length > 0 ? totalVendido / vendas.length : 0,
          totalRegistros: vendas.length,
        },
        itens: vendas.map((venda) => ({
          codigo: venda.id,
          data: toDate(venda.dataVenda)?.toLocaleDateString('pt-BR') || '-',
          cliente: cliente.nome,
          estufa: estufasMap[venda.estufaId || ''] || 'Estufa nao identificada',
          metodoPagamento: String(venda.metodoPagamento || venda.formaPagamento || 'N/A').toUpperCase(),
          status: normalizeStatus(venda),
          valor: getVendaTotal(venda),
          observacoes: venda.observacoes || null,
        })),
      });
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Nao foi possivel gerar o relatorio do cliente.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.pageBackground }]}>
      <ScreenHeaderCard
        title="Clientes"
        subtitle="Gerencie carteira, contatos e tipo de relacionamento."
        badgeLabel="CRM"
        actionLabel="Novo Cliente"
        actionIcon="plus"
        onPressAction={() => navigation.navigate('ClienteForm')}
      >
        <View style={styles.headerStats}>
          <View style={styles.headerStatChip}>
            <Text style={styles.headerStatValue}>{clientes.length}</Text>
            <Text style={styles.headerStatLabel}>Clientes ativos</Text>
          </View>
          <View style={styles.headerStatChip}>
            <Text style={styles.headerStatValue}>
              {clientes.filter((cliente) => cliente.tipo === 'atacado').length}
            </Text>
            <Text style={styles.headerStatLabel}>Atacado</Text>
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
        data={clientes}
        keyExtractor={(item) => item.id}
        refreshing={refreshing && !loading}
        onRefresh={refetch}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="account-group-outline"
              title="Nenhum cliente cadastrado"
              description="Cadastre clientes para associar vendas e acompanhar historico."
              actionLabel="Adicionar cliente"
              onAction={() => navigation.navigate('ClienteForm')}
            />
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.item, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}
            onPress={() => navigation.navigate('ClienteForm', { clienteId: item.id })}
            activeOpacity={0.9}
          >
            <View style={styles.itemTop}>
              <View style={[styles.avatar, { backgroundColor: `${COLORS.modClientes}20` }]}>
                <MaterialCommunityIcons name="account" size={20} color={COLORS.modClientes} />
              </View>
              <View style={styles.mainInfo}>
                <Text style={[styles.name, { color: theme.textPrimary }]}>{item.nome}</Text>
                <Text style={[styles.secondary, { color: theme.textSecondary }]}>
                  {[item.telefone, item.email, item.cidade].filter(Boolean).join(' • ') || 'Sem contato cadastrado'}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color={theme.textSecondary} />
            </View>

            <View style={styles.metaRow}>
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>{item.tipo?.toUpperCase()}</Text>
              </View>
              {item.documento ? (
                <Text style={[styles.metaHint, { color: theme.textSecondary }]}>{item.documento}</Text>
              ) : null}
              <Text style={[styles.metaHint, { color: theme.textSecondary }]}>Toque para editar</Text>
            </View>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.reportBtn, { borderColor: theme.border }]}
                onPress={() => handleExportClientReport(item)}
              >
                <MaterialCommunityIcons name="file-chart-outline" size={16} color={COLORS.info} />
                <Text style={styles.reportBtnText}>PDF contas (pago/pendente)</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('ClienteForm')}>
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
  typeBadge: { backgroundColor: COLORS.infoSoft, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  typeBadgeText: { color: COLORS.info, fontSize: 10, fontWeight: '800' },
  metaHint: { fontSize: 11, fontWeight: '600' },
  actionsRow: { marginTop: 10, alignItems: 'flex-start' },
  reportBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
  },
  reportBtnText: { color: COLORS.info, fontSize: 11, fontWeight: '800' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: COLORS.modClientes,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.floating,
  },
});

export default ClientesListScreen;
