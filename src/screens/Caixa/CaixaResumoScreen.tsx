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
  Platform
} from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView, MotiScrollView } from 'moti';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useThemeMode } from '../../hooks/useThemeMode';
import { useAuth } from '../../hooks/useAuth';
import { useAppSettings } from '../../hooks/useAppSettings';
import { RootStackParamList } from '../../navigation/types';
import { CaixaPeriod, getCaixaResumo, getCaixaExtrato } from '../../services/caixaService';
import { CaixaPessoa, createCaixaPessoa, listCaixaPessoas } from '../../services/caixaPessoaService';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../../constants/theme';
import { exportToExcel } from '../../services/excelService';
import LoadingButton from '../../components/ui/LoadingButton';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

const periods: { id: CaixaPeriod; label: string; hint: string }[] = [
  { id: 'today', label: 'Hoje', hint: 'Movimentos do dia' },
  { id: '7d', label: '7 dias', hint: 'Última semana' },
  { id: 'month', label: 'Mês', hint: 'Fechamento mensal' },
  { id: 'all', label: 'Tudo', hint: 'Histórico completo' },
  { id: 'custom', label: 'Personalizado', hint: 'Período customizado' },
];

const CaixaResumoScreen = () => {
  const theme = useThemeMode();
  const insets = useSafeAreaInsets();
  const { user, selectedTenantId, canViewCash } = useAuth();
  const { settings } = useAppSettings();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();
  
  const [period, setPeriod] = useState<CaixaPeriod>('month');
  const [dateFrom, setDateFrom] = useState<Date>(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [showPicker, setShowPicker] = useState<'from' | 'to' | null>(null);
  
  const [selectedPessoaId, setSelectedPessoaId] = useState<string | null>(null);
  
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
      const { items } = await getCaixaExtrato(
        targetId,
        {
          range: { period, from: dateFrom, to: dateTo },
          caixaPessoaId: selectedPessoaId || undefined,
          pageSize: 1000,
        },
        settings.activeProductionMode
      );

      if (items.length === 0) {
        Alert.alert('Aviso', 'Não há dados para exportar.');
        return;
      }

      await exportToExcel({
        fileName: `Caixa_Resumo_${period}_${new Date().toISOString().slice(0, 10)}`,
        sheetName: 'Caixa',
        columns: [
          { header: 'Data', key: 'data', width: 15 },
          { header: 'Cliente', key: 'cliente', width: 25 },
          { header: 'Descrição', key: 'descricao', width: 35 },
          { header: 'Responsável', key: 'pessoa', width: 20 },
          { header: 'Tipo', key: 'tipo', width: 12 },
          { header: 'Valor', key: 'valor', width: 15 },
          { header: 'Meio Pagamento', key: 'metodo', width: 20 },
          { header: 'Observações', key: 'obs', width: 30 },
        ],
        data: items.map((movimento) => ({
          data: new Date(movimento.data).toLocaleDateString('pt-BR'),
          cliente: movimento.clienteNome || (movimento.tipo === 'entrada' ? 'Cliente avulso' : '-'),
          descricao: movimento.descricao,
          pessoa: movimento.caixaPessoaNome,
          tipo: movimento.tipo === 'entrada' ? 'Entrada' : 'Saída',
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
        getCaixaResumo(
          targetId,
          { period, from: dateFrom, to: dateTo },
          settings.activeProductionMode
        ),
        listCaixaPessoas(targetId),
      ]);
      setData(result);
      setCaixaPessoas(pessoas);
    } catch (err) {
      console.error('Erro ao carregar resumo do caixa:', err);
    } finally {
      setLoading(false);
    }
  }, [
    canView,
    period,
    dateFrom,
    dateTo,
    settings.activeProductionMode,
    targetId,
  ]);

  React.useEffect(() => {
    if (isFocused) {
      void load();
    }
  }, [isFocused, load, period, dateFrom, dateTo]);

  const onDateChange = (_event: any, selectedDate?: Date) => {
    setShowPicker(null);
    if (selectedDate) {
      if (showPicker === 'from') setDateFrom(selectedDate);
      if (showPicker === 'to') setDateTo(selectedDate);
    }
  };

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

  // Derived filtered data based on selected person
  const { filteredSaldo, filteredEntradas, filteredSaidas, filteredMovimentos } = useMemo(() => {
    if (!data) return { filteredSaldo: 0, filteredEntradas: 0, filteredSaidas: 0, filteredMovimentos: [] };
    
    let movimentos = data.movimentos || [];
    if (selectedPessoaId) {
      movimentos = movimentos.filter((m: any) => m.caixaPessoaId === selectedPessoaId);
    }
    
    let entradas = 0;
    let saidas = 0;
    movimentos.forEach((m: any) => {
      if (m.status !== 'previsto') {
        if (m.tipo === 'entrada') entradas += m.valor;
        else saidas += m.valor;
      }
    });
    
    return {
      filteredSaldo: entradas - saidas,
      filteredEntradas: entradas,
      filteredSaidas: saidas,
      filteredMovimentos: movimentos
    };
  }, [data, selectedPessoaId]);

  const isPositive = filteredSaldo >= 0;

  const handleCreateCaixaPessoa = async () => {
    if (!targetId) return;

    const nome = novoResponsavelNome.trim();
    if (!nome) {
      Alert.alert('Atenção', 'Digite o nome do responsável.');
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
      Alert.alert('Sucesso', 'Responsável do caixa cadastrado.');
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Não foi possível cadastrar o responsável.');
    } finally {
      setSavingPessoa(false);
    }
  };

  if (!canView) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.pageBackground }]}>
        <MotiView
          from={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 15 }}
          style={[styles.lockCircle, { backgroundColor: theme.surfaceMuted }]}
        >
          <MaterialCommunityIcons name="lock-outline" size={36} color={theme.textSecondary} />
        </MotiView>
        <Text style={[styles.lockTitle, { color: theme.textPrimary }]}>Acesso Restrito</Text>
        <Text style={[styles.lockText, { color: theme.textSecondary }]}>
          O módulo Caixa completo está disponível apenas para proprietário e gerente.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.pageBackground }}>
      {/* HEADER BACKGROUND & NAV */}
      <View style={{ backgroundColor: theme.panelBackground, paddingTop: Math.max(insets.top, 10) }}>
        <MotiView 
          from={{ opacity: 0, translateY: -20 }} 
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400 }}
          style={styles.topHeader}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.pageTitle, { color: theme.rawColors.textLight }]}>Caixa</Text>
            <Text style={[styles.pageSubtitle, { color: theme.rawColors.whiteAlpha60 }]}>Seu panorama financeiro</Text>
          </View>
          <TouchableOpacity 
            onPress={handleExportExcel} 
            style={[styles.exportBtn, { backgroundColor: 'rgba(255,255,255,0.1)' }]} 
            disabled={exporting}
            activeOpacity={0.7}
          >
            {exporting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <MaterialCommunityIcons name="file-excel-outline" size={22} color="#fff" />
            )}
          </TouchableOpacity>
        </MotiView>

        {/* TOP NAVIGATION */}
        <MotiScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.financeLinksRow}
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 100 }}
        >
          <TouchableOpacity
            style={styles.financeLink}
            onPress={() => navigation.navigate('MainTabs', { screen: 'FinanceiroTab' })}
            activeOpacity={0.6}
          >
            <Text style={[styles.financeLinkText, { color: theme.rawColors.whiteAlpha60 }]}>Vendas</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.financeLink}
            onPress={() => navigation.navigate('MainTabs', { screen: 'FinanceiroTab', params: { filter: 'receber' } })}
            activeOpacity={0.6}
          >
            <Text style={[styles.financeLinkText, { color: theme.rawColors.whiteAlpha60 }]}>Contas</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.financeLink}
            onPress={() => navigation.navigate('DespesasList')}
            activeOpacity={0.6}
          >
            <Text style={[styles.financeLinkText, { color: theme.rawColors.whiteAlpha60 }]}>Despesas</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.financeLink, styles.financeLinkActive]} activeOpacity={1}>
            <Text style={[styles.financeLinkText, { color: '#fff', textShadowColor: 'rgba(255,255,255,0.3)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 }]}>Caixa</Text>
            <MotiView 
              from={{ scaleX: 0 }} 
              animate={{ scaleX: 1 }} 
              transition={{ type: 'spring', damping: 15 }}
              style={[styles.activeDot, { backgroundColor: COLORS.modFinanceiro, shadowColor: COLORS.modFinanceiro, shadowOpacity: 0.8, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }]} 
            />
          </TouchableOpacity>
        </MotiScrollView>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 60 + insets.bottom }]}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={COLORS.modFinanceiro} />}
        showsVerticalScrollIndicator={false}
      >
        {/* MAIN BALANCE CARD */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', delay: 150 }}
          style={styles.balanceContainer}
        >
          <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate('CaixaExtrato')}>
            <LinearGradient
              colors={isPositive ? ['#059669', '#047857'] : ['#334155', '#1e293b']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.balanceCard, SHADOWS.floating]}
            >
              {/* Decorative shapes for depth */}
              <View style={[styles.cardDecoration1, { backgroundColor: 'rgba(255,255,255,0.05)' }]} />
              <View style={[styles.cardDecoration2, { backgroundColor: 'rgba(255,255,255,0.03)' }]} />

              <View style={styles.balanceHeader}>
                <Text style={styles.balanceLabel}>SALDO NO PERÍODO</Text>
                <View style={styles.periodBadge}>
                  <Text style={styles.periodBadgeText}>
                    {period === 'custom' ? 'Custom' : selectedPeriod.label}
                  </Text>
                </View>
              </View>
              <Text style={styles.balanceValue}>{formatCurrency(filteredSaldo)}</Text>
              
              <View style={styles.balanceFooter}>
                <View style={styles.balanceStat}>
                  <MaterialCommunityIcons name="arrow-up-circle" size={16} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.balanceStatText}>+{formatCurrency(filteredEntradas)}</Text>
                </View>
                <View style={styles.balanceStat}>
                  <MaterialCommunityIcons name="arrow-down-circle" size={16} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.balanceStatText}>-{formatCurrency(filteredSaidas)}</Text>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </MotiView>

        {/* FILTERS AREA (Period & Person) */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 200 }}
          style={styles.filtersWrapper}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.periodSelector}>
            {periods.map((item) => {
              const isActive = period === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => setPeriod(item.id)}
                  activeOpacity={0.7}
                  style={[
                    styles.periodPill,
                    { backgroundColor: isActive ? COLORS.modFinanceiro : theme.surfaceBackground,
                      borderColor: isActive ? COLORS.modFinanceiro : theme.border,
                      borderWidth: 1
                    }
                  ]}
                >
                  <Text style={[
                    styles.periodPillText, 
                    { color: isActive ? '#fff' : theme.textSecondary }
                  ]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Custom Date Pickers */}
          {period === 'custom' && (
            <View style={styles.customDateRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.dateInput, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}
                onPress={() => setShowPicker('from')}
              >
                <MaterialCommunityIcons name="calendar-range" size={18} color={COLORS.modFinanceiro} />
                <Text style={[styles.dateInputText, { color: theme.textPrimary }]}>{dateFrom.toLocaleDateString('pt-BR')}</Text>
              </TouchableOpacity>
              <MaterialCommunityIcons name="arrow-right" size={16} color={theme.textSecondary} />
              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.dateInput, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}
                onPress={() => setShowPicker('to')}
              >
                <MaterialCommunityIcons name="calendar-range" size={18} color={COLORS.modFinanceiro} />
                <Text style={[styles.dateInputText, { color: theme.textPrimary }]}>{dateTo.toLocaleDateString('pt-BR')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Person Selector */}
          {caixaPessoas.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.periodSelector}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setSelectedPessoaId(null)}
                style={[
                  styles.personPill,
                  { backgroundColor: selectedPessoaId === null ? theme.textPrimary : theme.surfaceBackground,
                    borderColor: selectedPessoaId === null ? theme.textPrimary : theme.border,
                  }
                ]}
              >
                <Text style={[styles.personPillText, { color: selectedPessoaId === null ? theme.pageBackground : theme.textSecondary }]}>
                  Todos responsáveis
                </Text>
              </TouchableOpacity>
              {caixaPessoas.map((pessoa) => {
                const isActive = selectedPessoaId === pessoa.id;
                return (
                  <TouchableOpacity
                    key={`filt-${pessoa.id}`}
                    activeOpacity={0.7}
                    onPress={() => setSelectedPessoaId(pessoa.id)}
                    style={[
                      styles.personPill,
                      { backgroundColor: isActive ? theme.textPrimary : theme.surfaceBackground,
                        borderColor: isActive ? theme.textPrimary : theme.border,
                      }
                    ]}
                  >
                    <Text style={[styles.personPillText, { color: isActive ? theme.pageBackground : theme.textSecondary }]}>
                      {pessoa.nome}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </MotiView>

        {/* WARNINGS */}
        {data?.naoClassificado > 0 && (
          <MotiView from={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring' }} style={[styles.alertCard, { backgroundColor: theme.warningSoft, borderColor: theme.warning }]}>
            <MaterialCommunityIcons name="alert-circle-outline" size={22} color={theme.warning} />
            <Text style={[styles.alertText, { color: theme.textPrimary }]}>
              Existem <Text style={{fontWeight: '900'}}>{formatCurrency(data.naoClassificado)}</Text> sem responsável classificado.
            </Text>
          </MotiView>
        )}

        {/* EQUIPE DE CAIXA */}
        <MotiView from={{ opacity: 0, translateY: 15 }} animate={{ opacity: 1, translateY: 0 }} transition={{ delay: 250 }} style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Equipe de Caixa</Text>
              <Text style={[styles.sectionCaption, { color: theme.textSecondary }]}>Cadastre e gerencie responsáveis</Text>
            </View>
            <TouchableOpacity 
              onPress={() => setManageModalVisible(true)}
              activeOpacity={0.7}
              style={[styles.addButton, { backgroundColor: theme.infoSoft }]}
            >
              <MaterialCommunityIcons name="plus" size={16} color={theme.info} />
              <Text style={[styles.addButtonText, { color: theme.info }]}>Novo</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.peopleScroll}>
            {caixaPessoas.length === 0 ? (
              <View style={[styles.emptyChip, { borderColor: theme.border, backgroundColor: theme.surfaceMuted }]}>
                <Text style={[styles.emptyChipText, { color: theme.textSecondary }]}>Nenhum responsável</Text>
              </View>
            ) : (
              caixaPessoas.map((pessoa, idx) => (
                <MotiView 
                  key={pessoa.id}
                  from={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 250 + (idx * 50), type: 'spring' }}
                  style={[styles.personChip, { backgroundColor: theme.surfaceBackground, borderColor: theme.border, borderWidth: 1 }]}
                >
                  <View style={[styles.personChipAvatar, { backgroundColor: COLORS.modFinanceiro + '25' }]}>
                    <Text style={[styles.personChipAvatarText, { color: COLORS.modFinanceiro }]}>
                      {pessoa.nome.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.personChipName, { color: theme.textPrimary }]}>{pessoa.nome}</Text>
                </MotiView>
              ))
            )}
          </ScrollView>
        </MotiView>

        {/* SALDOS POR RESPONSAVEL */}
        {!selectedPessoaId && (
          <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ delay: 300 }} style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Saldos por Responsável</Text>
                <Text style={[styles.sectionCaption, { color: theme.textSecondary }]}>Posição de caixa individual</Text>
              </View>
            </View>
            
            <View style={[styles.listCard, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}>
              {mergedPeople.length === 0 ? (
                <View style={styles.emptyList}>
                  <MaterialCommunityIcons name="wallet-outline" size={36} color={theme.textMuted} />
                  <Text style={[styles.emptyListText, { color: theme.textSecondary }]}>Nenhum movimento registrado.</Text>
                </View>
              ) : (
                mergedPeople.map((row: any, index: number) => {
                  const isLast = index === mergedPeople.length - 1;
                  return (
                    <TouchableOpacity
                      key={row.caixaPessoaId}
                      activeOpacity={0.6}
                      onPress={() => {
                        setSelectedPessoaId(row.caixaPessoaId);
                        Alert.alert('Filtro Aplicado', `Mostrando movimentos apenas para ${row.caixaPessoaNome}`);
                      }}
                      style={[styles.personRow, !isLast && { borderBottomWidth: 1, borderBottomColor: theme.divider }]}
                    >
                      <View style={[styles.personAvatar, { backgroundColor: theme.surfaceMuted }]}>
                        <Text style={[styles.personAvatarText, { color: theme.textPrimary }]}>
                          {String(row.caixaPessoaNome || '?').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.personDetails}>
                        <Text style={[styles.personName, { color: theme.textPrimary }]}>{row.caixaPessoaNome}</Text>
                        <Text style={[styles.personStat, { color: theme.textSecondary }]}>
                          Entradas: {formatCurrency(row.entradas)}
                        </Text>
                      </View>
                      <View style={styles.personAmount}>
                        <Text style={[styles.personValue, { color: row.saldo >= 0 ? theme.success : theme.danger }]}>
                          {formatCurrency(row.saldo)}
                        </Text>
                        <Text style={[styles.personValueCaption, { color: theme.textSecondary }]}>SALDO</Text>
                      </View>
                      <MaterialCommunityIcons name="filter-outline" size={20} color={theme.textMuted} />
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          </MotiView>
        )}

        {/* MOVIMENTOS RECENTES */}
        <MotiView from={{ opacity: 0, translateY: 25 }} animate={{ opacity: 1, translateY: 0 }} transition={{ delay: 350 }} style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Movimentos Recentes</Text>
              <Text style={[styles.sectionCaption, { color: theme.textSecondary }]}>Últimas transações aplicadas no filtro</Text>
            </View>
          </View>
          
          <View style={[styles.listCard, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}>
            {filteredMovimentos.length === 0 ? (
              <View style={styles.emptyList}>
                <MaterialCommunityIcons name="text-box-search-outline" size={36} color={theme.textMuted} />
                <Text style={[styles.emptyListText, { color: theme.textSecondary }]}>Nenhum movimento no filtro atual.</Text>
              </View>
            ) : (
              filteredMovimentos.slice(0, 5).map((mov: any, index: number) => {
                const isEntrada = mov.tipo === 'entrada';
                const isLast = index === Math.min(filteredMovimentos.length, 5) - 1;
                return (
                  <View key={mov.id} style={[styles.movementRow, !isLast && { borderBottomWidth: 1, borderBottomColor: theme.divider }]}>
                    <View style={[styles.movementIcon, { backgroundColor: isEntrada ? theme.successSoft : theme.dangerSoft }]}>
                      <MaterialCommunityIcons
                        name={isEntrada ? 'arrow-bottom-left' : 'arrow-top-right'}
                        size={20}
                        color={isEntrada ? theme.success : theme.danger}
                      />
                    </View>
                    <View style={styles.movementDetails}>
                      <Text style={[styles.movementDesc, { color: theme.textPrimary }]} numberOfLines={1}>
                        {mov.descricao}
                      </Text>
                      <Text style={[styles.movementMeta, { color: theme.textSecondary }]} numberOfLines={1}>
                        {mov.caixaPessoaNome} • {String(mov.origem).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={[styles.movementValue, { color: isEntrada ? theme.success : theme.textPrimary }]}>
                      {isEntrada ? '+' : '-'}{formatCurrency(mov.valor)}
                    </Text>
                  </View>
                );
              })
            )}
            
            {filteredMovimentos.length > 0 && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => navigation.navigate('CaixaExtrato', { caixaPessoaId: selectedPessoaId || undefined })}
                style={[styles.viewAllBtn, { borderTopWidth: 1, borderTopColor: theme.divider }]}
              >
                <MaterialCommunityIcons name="format-list-bulleted" size={18} color={COLORS.modFinanceiro} />
                <Text style={[styles.viewAllText, { color: COLORS.modFinanceiro }]}>Ver Extrato Completo</Text>
                <MaterialCommunityIcons name="arrow-right" size={18} color={COLORS.modFinanceiro} />
              </TouchableOpacity>
            )}
          </View>
        </MotiView>

      </ScrollView>

      {/* MODALS */}
      {showPicker && (
        <DateTimePicker
          value={showPicker === 'from' ? dateFrom : dateTo}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
        />
      )}

      <Modal
        visible={manageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setManageModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
          <MotiView 
            from={{ scale: 0.9, opacity: 0, translateY: 20 }}
            animate={{ scale: 1, opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 20 }}
            style={[styles.modalContent, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }, SHADOWS.floating]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalIconBg}>
                <MaterialCommunityIcons name="account-plus" size={24} color={COLORS.modFinanceiro} />
              </View>
              <TouchableOpacity onPress={() => setManageModalVisible(false)} style={styles.modalClose}>
                <MaterialCommunityIcons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Novo Responsável</Text>
            <Text style={[styles.modalDescription, { color: theme.textSecondary }]}>
              Cadastre um nome para associar recebimentos e despesas do caixa.
            </Text>

            <TextInput
              style={[
                styles.modalInput,
                { borderColor: theme.border, backgroundColor: theme.surfaceMuted, color: theme.textPrimary },
              ]}
              placeholder="Ex: João Silva"
              placeholderTextColor={theme.textMuted}
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
          </MotiView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  lockCircle: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  lockTitle: { fontSize: 22, fontWeight: '900', marginBottom: 12, letterSpacing: -0.5 },
  lockText: { textAlign: 'center', fontSize: 15, lineHeight: 22 },
  
  topHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, marginBottom: 18 },
  pageTitle: { fontSize: 32, fontWeight: '900', letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  exportBtn: { width: 46, height: 46, borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center' },
  
  financeLinksRow: { paddingHorizontal: SPACING.lg, paddingBottom: 16, gap: 24 },
  financeLink: { alignItems: 'center', justifyContent: 'center', position: 'relative', paddingBottom: 6 },
  financeLinkActive: { },
  financeLinkText: { fontSize: 15, fontWeight: '700' },
  activeDot: { width: '100%', height: 3, borderRadius: 2, position: 'absolute', bottom: -3 },
  
  scrollContent: { paddingTop: 20, gap: 24 },
  
  balanceContainer: { paddingHorizontal: SPACING.lg },
  balanceCard: { borderRadius: RADIUS.xl, padding: 28, overflow: 'hidden', position: 'relative' },
  cardDecoration1: { position: 'absolute', width: 200, height: 200, borderRadius: 100, top: -50, right: -50, transform: [{ rotate: '45deg' }] },
  cardDecoration2: { position: 'absolute', width: 150, height: 150, borderRadius: 75, bottom: -40, left: -20, transform: [{ rotate: '15deg' }] },
  balanceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, zIndex: 2 },
  balanceLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
  periodBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.pill },
  periodBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  balanceValue: { color: '#fff', fontSize: 44, fontWeight: '900', letterSpacing: -2, marginBottom: 28, zIndex: 2 },
  balanceFooter: { flexDirection: 'row', gap: 28, zIndex: 2 },
  balanceStat: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  balanceStatText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  
  filtersWrapper: { paddingHorizontal: 0, gap: 12 },
  periodSelector: { paddingHorizontal: SPACING.lg, gap: 8 },
  periodPill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: RADIUS.pill, borderWidth: 1 },
  periodPillText: { fontSize: 13, fontWeight: '800' },
  personPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: RADIUS.lg, borderWidth: 1 },
  personPillText: { fontSize: 12, fontWeight: '700' },
  
  customDateRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, gap: 10 },
  dateInput: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 44, borderRadius: RADIUS.lg, borderWidth: 1, gap: 8 },
  dateInputText: { fontSize: 14, fontWeight: '700' },
  
  alertCard: { marginHorizontal: SPACING.lg, padding: 18, borderRadius: RADIUS.lg, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 14 },
  alertText: { flex: 1, fontSize: 14, lineHeight: 20 },
  
  section: { marginVertical: 4 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: SPACING.lg, marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  sectionCaption: { fontSize: 13, marginTop: 2 },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.pill },
  addButtonText: { fontSize: 13, fontWeight: '800' },
  
  peopleScroll: { paddingHorizontal: SPACING.lg, gap: 14 },
  emptyChip: { paddingHorizontal: 18, paddingVertical: 14, borderRadius: RADIUS.lg, borderWidth: 1 },
  emptyChipText: { fontSize: 14, fontWeight: '600' },
  personChip: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingRight: 18, paddingVertical: 8, paddingLeft: 8, borderRadius: RADIUS.pill },
  personChipAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  personChipAvatarText: { fontSize: 15, fontWeight: '900' },
  personChipName: { fontSize: 15, fontWeight: '800' },
  
  listCard: { marginHorizontal: SPACING.lg, borderRadius: RADIUS.xl, borderWidth: 1, overflow: 'hidden' },
  emptyList: { padding: 40, alignItems: 'center', gap: 16 },
  emptyListText: { fontSize: 15, fontWeight: '600' },
  
  personRow: { flexDirection: 'row', alignItems: 'center', padding: 18, gap: 14 },
  personAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  personAvatarText: { fontSize: 18, fontWeight: '900' },
  personDetails: { flex: 1 },
  personName: { fontSize: 16, fontWeight: '900', marginBottom: 4 },
  personStat: { fontSize: 13, fontWeight: '600' },
  personAmount: { alignItems: 'flex-end', marginRight: 8 },
  personValue: { fontSize: 18, fontWeight: '900' },
  personValueCaption: { fontSize: 10, fontWeight: '800', marginTop: 2, letterSpacing: 0.5 },
  
  movementRow: { flexDirection: 'row', alignItems: 'center', padding: 18, gap: 14 },
  movementIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  movementDetails: { flex: 1 },
  movementDesc: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  movementMeta: { fontSize: 13, fontWeight: '600' },
  movementValue: { fontSize: 18, fontWeight: '900' },
  
  viewAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 18, gap: 10 },
  viewAllText: { fontSize: 15, fontWeight: '800' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  modalContent: { width: '100%', borderRadius: RADIUS.xl, borderWidth: 1, padding: 28 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  modalIconBg: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.modFinanceiro + '15', alignItems: 'center', justifyContent: 'center' },
  modalClose: { padding: 4 },
  modalTitle: { fontSize: 24, fontWeight: '900', marginBottom: 10, letterSpacing: -0.5 },
  modalDescription: { fontSize: 15, lineHeight: 22, marginBottom: 24 },
  modalInput: { borderWidth: 1, borderRadius: RADIUS.lg, height: 56, paddingHorizontal: 18, fontSize: 16, fontWeight: '700', marginBottom: 28 },
  modalFooter: { flexDirection: 'row', gap: 14 },
});

export default CaixaResumoScreen;
