import React, { useCallback, useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemeMode } from '../../hooks/useThemeMode';
import { useAuth } from '../../hooks/useAuth';
import { RootStackParamList } from '../../navigation/types';
import { CaixaPeriod, getCaixaResumo, getCaixaExtrato } from '../../services/caixaService';
import { CaixaPessoa, createCaixaPessoa, listCaixaPessoas } from '../../services/caixaPessoaService';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../constants/theme';
import { exportToExcel } from '../../services/excelService';
import ScreenHeaderCard from '../../components/ui/ScreenHeaderCard';
import MetricCard from '../../components/ui/MetricCard';
import LoadingButton from '../../components/ui/LoadingButton';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

const periods: { id: CaixaPeriod; label: string; hint: string }[] = [
  { id: 'today', label: 'Hoje', hint: 'Movimentos do dia' },
  { id: '7d', label: '7 dias', hint: 'Ultima semana' },
  { id: 'month', label: 'Mes', hint: 'Fechamento mensal' },
  { id: 'all', label: 'Tudo', hint: 'Historico completo' },
];

const CaixaResumoScreen = () => {
  const theme = useThemeMode();
  const insets = useSafeAreaInsets();
  const { user, selectedTenantId, canViewCash } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();
  const [period, setPeriod] = useState<CaixaPeriod>('month');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [data, setData] = useState<any>(null);
  const [caixaPessoas, setCaixaPessoas] = useState<CaixaPessoa[]>([]);
  const [manageModalVisible, setManageModalVisible] = useState(false);
  const [novoResponsavelNome, setNovoResponsavelNome] = useState('');
  const [savingPessoa, setSavingPessoa] = useState(false);

  const canView = canViewCash;
  const targetId = selectedTenantId || user?.uid;

  const handleExportExcel = async () => {
    if (!targetId) return;
    setExporting(true);
    try {
      const { items } = await getCaixaExtrato(targetId, {
        range: { period },
        pageSize: 1000,
      });

      if (items.length === 0) {
        Alert.alert('Aviso', 'Nao ha dados para exportar.');
        return;
      }

      await exportToExcel({
        fileName: `Caixa_Resumo_${period}_${new Date().toISOString().slice(0, 10)}`,
        sheetName: 'Caixa',
        columns: [
          { header: 'Data', key: 'data', width: 15 },
          { header: 'Cliente', key: 'cliente', width: 25 },
          { header: 'Descricao', key: 'descricao', width: 35 },
          { header: 'Responsavel', key: 'pessoa', width: 20 },
          { header: 'Tipo', key: 'tipo', width: 12 },
          { header: 'Valor', key: 'valor', width: 15 },
          { header: 'Meio Pagamento', key: 'metodo', width: 20 },
          { header: 'Observacoes', key: 'obs', width: 30 },
        ],
        data: items.map((movimento) => ({
          data: new Date(movimento.data).toLocaleDateString('pt-BR'),
          cliente: movimento.clienteNome || (movimento.tipo === 'entrada' ? 'Cliente avulso' : '-'),
          descricao: movimento.descricao,
          pessoa: movimento.caixaPessoaNome,
          tipo: movimento.tipo === 'entrada' ? 'Entrada' : 'Saida',
          valor: movimento.valor,
          metodo: String(movimento.metodoPagamento || '-').toUpperCase(),
          obs: movimento.observacoes || '-',
        })),
      });
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Falha ao gerar Excel.');
    } finally {
      setExporting(false);
    }
  };

  const load = useCallback(async () => {
    if (!targetId || !canView) return;
    setLoading(true);
    try {
      const [result, pessoas] = await Promise.all([
        getCaixaResumo(targetId, { period }),
        listCaixaPessoas(targetId),
      ]);
      setData(result);
      setCaixaPessoas(pessoas);
    } catch (err) {
      console.error('Erro ao carregar resumo do caixa:', err);
    } finally {
      setLoading(false);
    }
  }, [canView, period, targetId]);

  React.useEffect(() => {
    if (isFocused) {
      void load();
    }
  }, [isFocused, load]);

  const selectedPeriod = periods.find((item) => item.id === period) || periods[2];
  const mergedPeople = useMemo(() => {
    const summaryRows = Array.isArray(data?.porPessoa) ? data.porPessoa : [];
    const summaryMap = new Map(summaryRows.map((row: any) => [row.caixaPessoaId, row]));

    const merged = caixaPessoas.map((pessoa) => {
      const existing = summaryMap.get(pessoa.id);
      return (
        existing || {
          caixaPessoaId: pessoa.id,
          caixaPessoaNome: pessoa.nome,
          entradas: 0,
          saidas: 0,
          saldo: 0,
        }
      );
    });

    summaryRows.forEach((row: any) => {
      if (!merged.some((item: any) => item.caixaPessoaId === row.caixaPessoaId)) {
        merged.push(row);
      }
    });

    return merged.sort((a: any, b: any) => b.saldo - a.saldo);
  }, [caixaPessoas, data?.porPessoa]);

  const totalResponsaveis = mergedPeople.length || 0;
  const totalMovimentos = data?.movimentos?.length || 0;

  const handleCreateCaixaPessoa = async () => {
    if (!targetId) return;

    const nome = novoResponsavelNome.trim();
    if (!nome) {
      Alert.alert('Atencao', 'Digite o nome do responsavel.');
      return;
    }

    setSavingPessoa(true);
    try {
      const id = await createCaixaPessoa({ nome }, targetId);
      setCaixaPessoas((prev) =>
        [...prev, { id, nome, ativo: true }].sort((a, b) => a.nome.localeCompare(b.nome))
      );
      setNovoResponsavelNome('');
      setManageModalVisible(false);
      Alert.alert('Sucesso', 'Responsavel do caixa cadastrado.');
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Nao foi possivel cadastrar o responsavel.');
    } finally {
      setSavingPessoa(false);
    }
  };

  const cards = useMemo(
    () => [
      {
        label: 'Entradas',
        helper: 'Recebimentos pagos',
        value: data?.entradas || 0,
        icon: 'trending-up',
        tone: 'success' as const,
      },
      {
        label: 'Saidas',
        helper: 'Pagamentos realizados',
        value: data?.saidas || 0,
        icon: 'trending-down',
        tone: 'danger' as const,
      },
      {
        label: 'Saldo Geral',
        helper: 'Resultado consolidado',
        value: data?.saldo || 0,
        icon: 'wallet-outline',
        tone: (data?.saldo || 0) >= 0 ? ('info' as const) : ('warning' as const),
      },
      {
        label: 'Responsaveis',
        helper: 'Pessoas cadastradas',
        value: String(totalResponsaveis),
        icon: 'account-group-outline',
        tone: 'neutral' as const,
      },
    ],
    [data?.entradas, data?.saidas, data?.saldo, totalResponsaveis]
  );

  if (!canView) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.surfaceBackground }]}>
        <MaterialCommunityIcons name="lock-outline" size={48} color={theme.textSecondary} />
        <Text style={[styles.lockTitle, { color: theme.textPrimary }]}>Acesso restrito</Text>
        <Text style={[styles.lockText, { color: theme.textSecondary }]}>
          O modulo Caixa completo esta disponivel apenas para proprietario e gerente.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.pageBackground }}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={COLORS.modFinanceiro} />}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeaderCard
        title="Caixa"
        subtitle="Entenda rapidamente saldo, entradas, saidas e quem esta concentrando as movimentacoes."
        badgeLabel="Caixa"
      >
        <View style={styles.headerStats}>
          <View style={styles.headerStatChip}>
            <Text style={styles.headerStatValue}>{selectedPeriod.label}</Text>
            <Text style={styles.headerStatLabel}>Periodo ativo</Text>
          </View>
          <View style={styles.headerStatChip}>
            <Text style={styles.headerStatValue}>{totalMovimentos}</Text>
            <Text style={styles.headerStatLabel}>Movimentos</Text>
          </View>
        </View>
      </ScreenHeaderCard>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.financeLinksRow}>
        <TouchableOpacity
          style={[styles.financeLink, { borderColor: theme.border, backgroundColor: theme.surfaceBackground }]}
          onPress={() => navigation.navigate('MainTabs', { screen: 'FinanceiroTab' })}
        >
          <MaterialCommunityIcons name="cash-multiple" size={16} color={theme.textSecondary} />
          <Text style={[styles.financeLinkText, { color: theme.textSecondary }]}>Vendas</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.financeLink, { borderColor: theme.border, backgroundColor: theme.surfaceBackground }]}
          onPress={() => navigation.navigate('ContasReceber')}
        >
          <MaterialCommunityIcons name="cash-clock" size={16} color={theme.textSecondary} />
          <Text style={[styles.financeLinkText, { color: theme.textSecondary }]}>Contas</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.financeLink, { borderColor: theme.border, backgroundColor: theme.surfaceBackground }]}
          onPress={() => navigation.navigate('DespesasList')}
        >
          <MaterialCommunityIcons name="cash-minus" size={16} color={theme.textSecondary} />
          <Text style={[styles.financeLinkText, { color: theme.textSecondary }]}>Despesas</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.financeLink, styles.financeLinkActive, { borderColor: COLORS.modFinanceiro }]}
        >
          <MaterialCommunityIcons name="wallet-outline" size={16} color={COLORS.modFinanceiro} />
          <Text style={[styles.financeLinkText, { color: COLORS.modFinanceiro }]}>Caixa</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={[styles.heroCard, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}>
        <View style={styles.heroTopRow}>
          <View>
            <Text style={[styles.heroLabel, { color: theme.textSecondary }]}>Saldo atual</Text>
            <Text style={[styles.heroValue, { color: theme.textPrimary }]}>{formatCurrency(data?.saldo || 0)}</Text>
            <Text style={[styles.heroHint, { color: theme.textSecondary }]}>{selectedPeriod.hint}</Text>
          </View>

          <TouchableOpacity
            onPress={handleExportExcel}
            style={[styles.exportBtn, { backgroundColor: '#1D6F42' }]}
            disabled={exporting}
            activeOpacity={0.7}
          >
            {exporting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialCommunityIcons name="file-excel" size={18} color="#fff" />
                <Text style={styles.exportBtnText}>Excel</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={[styles.healthStrip, { backgroundColor: (data?.saldo || 0) >= 0 ? theme.successSoft : theme.warningSoft }]}>
          <MaterialCommunityIcons
            name={(data?.saldo || 0) >= 0 ? 'check-decagram-outline' : 'alert-outline'}
            size={18}
            color={(data?.saldo || 0) >= 0 ? theme.success : theme.warning}
          />
          <Text style={[styles.healthStripText, { color: (data?.saldo || 0) >= 0 ? theme.success : theme.warning }]}>
            {(data?.saldo || 0) >= 0 ? 'Caixa positivo no recorte atual.' : 'Caixa negativo no recorte atual.'}
          </Text>
        </View>

        <View style={styles.periodGrid}>
          {periods.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => setPeriod(item.id)}
              style={[
                styles.periodCard,
                {
                  borderColor: period === item.id ? COLORS.modFinanceiro : theme.border,
                  backgroundColor: period === item.id ? `${COLORS.modFinanceiro}18` : theme.surfaceMuted,
                },
              ]}
            >
              <Text style={[styles.periodCardTitle, { color: period === item.id ? COLORS.modFinanceiro : theme.textPrimary }]}>
                {item.label}
              </Text>
              <Text style={[styles.periodCardHint, { color: theme.textSecondary }]}>{item.hint}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.metricsGrid}>
        {cards.map((card) => (
          <MetricCard
            key={card.label}
            label={card.label}
            value={typeof card.value === 'number' ? formatCurrency(card.value) : card.value}
            hint={card.helper}
            icon={card.icon}
            tone={card.tone}
          />
        ))}
      </View>

      <View style={[styles.insightCard, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}>
        <View style={styles.insightHeader}>
          <View>
            <Text style={[styles.insightEyebrow, { color: theme.info }]}>Como ler</Text>
            <Text style={[styles.insightTitle, { color: theme.textPrimary }]}>O que olhar primeiro</Text>
          </View>
          <TouchableOpacity
            style={[styles.secondaryAction, { borderColor: theme.border, backgroundColor: theme.surfaceMuted }]}
            onPress={() => navigation.navigate('CaixaExtrato')}
          >
            <MaterialCommunityIcons name="format-list-bulleted" size={16} color={theme.info} />
            <Text style={[styles.secondaryActionText, { color: theme.info }]}>Extrato</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.insightText, { color: theme.textSecondary }]}>
          Compare entradas e saidas, veja se existe valor nao classificado e depois abra o extrato para investigar
          responsavel, origem e observacoes.
        </Text>
      </View>

      {data?.naoClassificado > 0 ? (
        <View style={[styles.alertCard, { backgroundColor: theme.warningSoft, borderColor: theme.warning }]}>
          <MaterialCommunityIcons name="alert-circle-outline" size={18} color={theme.warning} />
          <Text style={[styles.alertText, { color: theme.textPrimary }]}>
            Existem {formatCurrency(data.naoClassificado)} sem responsavel classificado.
          </Text>
        </View>
      ) : null}

      <View style={[styles.sectionCard, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Equipe de caixa</Text>
              <Text style={[styles.sectionCaption, { color: theme.textSecondary }]}>
                Cadastre aqui quem pode receber ou pagar no caixa.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setManageModalVisible(true)}
              style={[styles.secondaryAction, { borderColor: theme.border, backgroundColor: theme.surfaceMuted }]}
            >
              <MaterialCommunityIcons name="account-plus-outline" size={16} color={theme.info} />
              <Text style={[styles.secondaryActionText, { color: theme.info }]}>Cadastrar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {caixaPessoas.length === 0 ? (
          <View style={[styles.peopleEmptyCard, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
            <MaterialCommunityIcons name="account-off-outline" size={22} color={theme.textSecondary} />
            <Text style={[styles.peopleEmptyText, { color: theme.textSecondary }]}>
              Nenhum responsavel cadastrado. Cadastre ao menos um para organizar recebimentos e saidas.
            </Text>
          </View>
        ) : (
          <View style={styles.peopleChipsWrap}>
            {caixaPessoas.map((pessoa) => (
              <View
                key={pessoa.id}
                style={[styles.peopleChip, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}
              >
                <MaterialCommunityIcons name="account-circle-outline" size={16} color={theme.info} />
                <Text style={[styles.peopleChipText, { color: theme.textPrimary }]}>{pessoa.nome}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={[styles.sectionCard, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Saldos por responsavel</Text>
            <Text style={[styles.sectionCaption, { color: theme.textSecondary }]}>
              Toque em um responsavel para abrir o extrato filtrado.
            </Text>
          </View>
        </View>

        {mergedPeople.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Nenhum movimento registrado no periodo.</Text>
        ) : (
          mergedPeople.map((row: any) => (
            <TouchableOpacity
              key={row.caixaPessoaId}
              onPress={() => navigation.navigate('CaixaExtrato', { caixaPessoaId: row.caixaPessoaId })}
              style={[styles.personCard, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}
            >
              <View style={styles.personTopRow}>
                <View style={styles.personIdentity}>
                  <View style={[styles.avatar, { backgroundColor: theme.surfaceBackground }]}>
                    <Text style={[styles.avatarText, { color: theme.textSecondary }]}>
                      {String(row.caixaPessoaNome || '?').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.personName, { color: theme.textPrimary }]}>{row.caixaPessoaNome}</Text>
                    <Text style={[styles.personMeta, { color: theme.textSecondary }]}>
                      {formatCurrency(row.entradas)} em entradas
                    </Text>
                  </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={18} color={theme.textSecondary} />
              </View>

              <View style={styles.personSummaryGrid}>
                <View style={styles.personSummaryCell}>
                  <Text style={[styles.personSummaryLabel, { color: theme.textSecondary }]}>Saidas</Text>
                  <Text style={[styles.personSummaryValue, { color: theme.textPrimary }]}>{formatCurrency(row.saidas)}</Text>
                </View>
                <View style={styles.personSummaryCell}>
                  <Text style={[styles.personSummaryLabel, { color: theme.textSecondary }]}>Saldo</Text>
                  <Text style={[styles.personSummaryValue, { color: row.saldo >= 0 ? COLORS.success : COLORS.danger }]}>
                    {formatCurrency(row.saldo)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      <View style={[styles.sectionCard, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Movimentos recentes</Text>
            <Text style={[styles.sectionCaption, { color: theme.textSecondary }]}>Ultimos 5 registros do recorte</Text>
          </View>
        </View>

        {(data?.movimentos || []).length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Nenhum movimento recente.</Text>
        ) : (
          (data?.movimentos || []).slice(0, 5).map((mov: any) => {
            const isEntrada = mov.tipo === 'entrada';
            return (
              <View key={mov.id} style={[styles.movementCard, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
                <View style={styles.movementTopRow}>
                  <View style={[styles.movementIconBox, { backgroundColor: isEntrada ? `${COLORS.success}18` : `${COLORS.danger}18` }]}>
                    <MaterialCommunityIcons
                      name={isEntrada ? 'plus' : 'minus'}
                      size={18}
                      color={isEntrada ? COLORS.success : COLORS.danger}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.movementDesc, { color: theme.textPrimary }]} numberOfLines={2}>
                      {mov.descricao}
                    </Text>
                    <Text style={[styles.movementMeta, { color: theme.textSecondary }]} numberOfLines={2}>
                      {mov.tipo === 'entrada' ? 'Recebido por' : 'Pago para'}: {mov.caixaPessoaNome}
                    </Text>
                  </View>
                  <Text style={[styles.movementValue, { color: isEntrada ? COLORS.success : COLORS.danger }]}>
                    {formatCurrency(mov.valor)}
                  </Text>
                </View>

                <View style={styles.movementFooter}>
                  <View style={[styles.originBadge, { backgroundColor: theme.surfaceBackground }]}>
                    <Text style={[styles.originBadgeText, { color: theme.textSecondary }]}>{String(mov.origem).toUpperCase()}</Text>
                  </View>
                  <Text style={[styles.movementFootnote, { color: theme.textSecondary }]} numberOfLines={1}>
                    {mov.observacoes || 'Sem observacoes'}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </View>

      <TouchableOpacity
        onPress={() => navigation.navigate('CaixaExtrato')}
        style={[styles.fullExtratoBtn, { backgroundColor: COLORS.modFinanceiro }]}
      >
        <MaterialCommunityIcons name="format-list-bulleted" size={20} color="#fff" />
        <Text style={styles.fullExtratoText}>Abrir extrato completo</Text>
      </TouchableOpacity>

      <Modal
        visible={manageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setManageModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Novo responsavel do caixa</Text>
                <Text style={[styles.modalDescription, { color: theme.textSecondary }]}>
                  Esse nome aparecera nos recebimentos, despesas e relatorios do caixa.
                </Text>
              </View>
              <TouchableOpacity onPress={() => setManageModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={22} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[
                styles.modalInput,
                { borderColor: theme.border, backgroundColor: theme.surfaceMuted, color: theme.textPrimary },
              ]}
              placeholder="Nome do responsavel"
              placeholderTextColor={theme.textSecondary}
              value={novoResponsavelNome}
              onChangeText={setNovoResponsavelNome}
              autoFocus
            />

            <View style={styles.modalFooter}>
              <LoadingButton
                label="Cancelar"
                variant="neutral"
                onPress={() => setManageModalVisible(false)}
                style={{ flex: 1 }}
              />
              <LoadingButton
                label={savingPessoa ? 'Salvando...' : 'Salvar'}
                variant="primary"
                onPress={handleCreateCaixaPessoa}
                loading={savingPessoa}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  lockTitle: { fontSize: 16, fontWeight: '800', marginTop: 10 },
  lockText: { marginTop: 6, textAlign: 'center', paddingHorizontal: 40, fontSize: 13, lineHeight: 18 },
  scrollContent: { padding: SPACING.lg, gap: 14 },
  headerStats: { flexDirection: 'row', gap: 8 },
  headerStatChip: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  headerStatValue: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  headerStatLabel: { color: 'rgba(255,255,255,0.8)', marginTop: 2, fontSize: 10, fontWeight: '700' },
  financeLinksRow: { gap: 8, paddingBottom: SPACING.xs },
  financeLink: {
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    minWidth: 96,
  },
  financeLinkActive: { backgroundColor: `${COLORS.modFinanceiro}1A` },
  financeLinkText: { fontSize: 12, fontWeight: '800' },
  heroCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: 16,
    ...SHADOWS.card,
  },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  heroLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  heroValue: { fontSize: 30, fontWeight: '900', marginTop: 4, letterSpacing: -0.8 },
  heroHint: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  exportBtn: {
    minWidth: 84,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
  },
  exportBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  healthStrip: {
    marginTop: 14,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  healthStripText: { fontSize: 12, fontWeight: '800', flex: 1 },
  periodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  periodCard: {
    width: '48%',
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    padding: 12,
  },
  periodCardTitle: { fontSize: 14, fontWeight: '900' },
  periodCardHint: { fontSize: 11, fontWeight: '600', marginTop: 4 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  insightCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: 16,
    ...SHADOWS.card,
  },
  insightHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  insightEyebrow: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.6 },
  insightTitle: { fontSize: 18, fontWeight: '900', marginTop: 4 },
  insightText: { fontSize: 13, lineHeight: 19, fontWeight: '600', marginTop: 12 },
  secondaryAction: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  secondaryActionText: { fontSize: 12, fontWeight: '800' },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    gap: 8,
  },
  alertText: { fontSize: 12, fontWeight: '700', flex: 1 },
  sectionCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: 16,
    ...SHADOWS.card,
  },
  sectionHeader: { marginBottom: 12 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '900' },
  sectionCaption: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  peopleEmptyCard: {
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  peopleEmptyText: { flex: 1, fontSize: 12, fontWeight: '600', lineHeight: 18 },
  peopleChipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  peopleChip: {
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  peopleChipText: { fontSize: 12, fontWeight: '800' },
  personCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  personTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  personIdentity: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontWeight: '900' },
  personName: { fontSize: 14, fontWeight: '800' },
  personMeta: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  personSummaryGrid: { flexDirection: 'row', gap: 10, marginTop: 12 },
  personSummaryCell: { flex: 1 },
  personSummaryLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  personSummaryValue: { fontSize: 14, fontWeight: '900', marginTop: 4 },
  movementCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  movementTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  movementIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  movementDesc: { fontSize: 13, fontWeight: '800', lineHeight: 18 },
  movementMeta: { fontSize: 11, fontWeight: '600', marginTop: 2, lineHeight: 16 },
  movementValue: { fontSize: 13, fontWeight: '900' },
  movementFooter: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  originBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  originBadgeText: { fontSize: 10, fontWeight: '900' },
  movementFootnote: { flex: 1, fontSize: 11, fontWeight: '600' },
  emptyText: { textAlign: 'center', fontSize: 13, fontStyle: 'italic', paddingVertical: 20 },
  fullExtratoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: RADIUS.xl,
    gap: 10,
    ...SHADOWS.card,
  },
  fullExtratoText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  modalOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalContent: {
    width: '100%',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: 18,
    ...SHADOWS.card,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: '900' },
  modalDescription: { marginTop: 6, fontSize: 12, fontWeight: '600', lineHeight: 18 },
  modalInput: {
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    minHeight: 52,
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 16,
  },
  modalFooter: { flexDirection: 'row', gap: 10, marginTop: 18 },
});

export default CaixaResumoScreen;
