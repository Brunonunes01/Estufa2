import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../hooks/useAuth';
import { useThemeMode } from '../../hooks/useThemeMode';
import { useAppSettings } from '../../hooks/useAppSettings';
import {
  listContasAReceber,
  receberConta,
} from '../../services/colheitaService';
import { markVendaChequeEmMaos } from '../../services/vendaService';
import { listClientes } from '../../services/clienteService';
import {
  CaixaPessoa,
  createCaixaPessoa,
  listCaixaPessoas,
} from '../../services/caixaPessoaService';
import { Venda } from '../../types/domain';
import { SPACING } from '../../constants/theme';
import { queryClient, queryKeys } from '../../lib/queryClient';
import ScreenHeaderCard from '../../components/ui/ScreenHeaderCard';
import MetricCard from '../../components/ui/MetricCard';
import EmptyState from '../../components/ui/EmptyState';
import LoadingButton from '../../components/ui/LoadingButton';
import { sanitizeDecimalInput } from '../../utils/numericFields';
import { matchesVendaProductionMode } from '../../services/financeProductionScope';
import { listAllPlantios } from '../../services/plantioService';
import { isChequeEmMaosPayment } from '../../services/paymentStatusHelpers';

import ContaItemCard from './components/ContaItemCard';

const formatDateInputBR = (date: Date) =>
  date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

const sanitizeDateInputBR = (value: string) =>
  value
    .replace(/\D/g, '')
    .slice(0, 8)
    .replace(/^(\d{2})(\d)/, '$1/$2')
    .replace(/^(\d{2})\/(\d{2})(\d)/, '$1/$2/$3');

const parseDateInputBR = (value: string) => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
};

const ContasReceberScreen = ({ navigation }: any) => {
  const { user, selectedTenantId } = useAuth();
  const { settings } = useAppSettings();
  const theme = useThemeMode();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const auditActor = useMemo(
    () =>
      user?.uid
        ? { uid: user.uid, name: user.displayName || user.name || null }
        : null,
    [user?.displayName, user?.name, user?.uid]
  );

  const [contas, setContas] = useState<Venda[]>([]);
  const [clientesMap, setClientesMap] = useState<Record<string, string>>({});
  const [caixaPessoas, setCaixaPessoas] = useState<CaixaPessoa[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [clienteFilter, setClienteFilter] = useState<'all' | 'avulso' | string>(
    'all'
  );
  const [ageFilter, setAgeFilter] = useState<
    'all' | 'today' | '1_7' | '8_30' | '30_plus'
  >('all');
  const [methodFilter, setMethodFilter] = useState<
    'all' | 'prazo' | 'boleto' | 'cheque' | 'outro'
  >('all');

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedConta, setSelectedConta] = useState<Venda | null>(null);
  const [metodoRecebimento, setMetodoRecebimento] = useState('');
  const [chequeEmMaos, setChequeEmMaos] = useState(false);
  const [pagamentoPara, setPagamentoPara] = useState<string | null>(null);
  const [valorRecebido, setValorRecebido] = useState('');
  const [dataRecebimento, setDataRecebimento] = useState(new Date());
  const [dataRecebimentoInput, setDataRecebimentoInput] = useState(
    formatDateInputBR(new Date())
  );
  const [showDataRecebimentoPicker, setShowDataRecebimentoPicker] =
    useState(false);
  const [modalCaixaVisible, setModalCaixaVisible] = useState(false);
  const [novoCaixaNome, setNovoCaixaNome] = useState('');
  const [salvandoCaixaPessoa, setSalvandoCaixaPessoa] = useState(false);

  const carregarDados = useCallback(
    async (isRefresh = false) => {
      const targetId = selectedTenantId || user?.uid;
      if (!targetId) return;

      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const [listaContas, listaClientes, listaCaixaPessoas, listaPlantios] =
          await Promise.all([
            listContasAReceber(targetId),
            listClientes(targetId),
            listCaixaPessoas(targetId),
            listAllPlantios(targetId),
          ]);
        const plantiosMap = Object.fromEntries(
          listaPlantios.map((plantio) => [plantio.id, plantio])
        );

        const map: Record<string, string> = {};
        listaClientes.forEach((cliente) => {
          map[cliente.id] = cliente.nome;
        });

        setClientesMap(map);
        setContas(
          listaContas.filter((venda) =>
            matchesVendaProductionMode(
              venda,
              settings.activeProductionMode,
              plantiosMap
            )
          )
        );
        setCaixaPessoas(listaCaixaPessoas);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedTenantId, settings.activeProductionMode, user?.uid]
  );

  useEffect(() => {
    if (isFocused) {
      void carregarDados(true);
    }
  }, [carregarDados, isFocused, selectedTenantId, user?.uid]);

  const getVendaTotal = (venda: Venda) => {
    const item = venda.itens?.[0];
    const fallbackTotal =
      Number(item?.quantidade || 0) * Number(item?.valorUnitario || 0);
    return Number(venda.valorTotal || fallbackTotal || 0);
  };

  const totalPendente = useMemo(
    () => contas.reduce((acc, curr) => acc + getVendaTotal(curr), 0),
    [contas]
  );

  const ticketMedio = useMemo(() => {
    if (contas.length === 0) return 0;
    return totalPendente / contas.length;
  }, [contas.length, totalPendente]);

  const uniqueClientes = useMemo(() => {
    const ids = new Set(
      contas.map((item) => item.clienteId || item.id).filter(Boolean)
    );
    return ids.size;
  }, [contas]);

  const clienteOptions = useMemo(() => {
    const options = new Map<string, string>();
    contas.forEach((item) => {
      if (!item.clienteId) return;
      options.set(
        item.clienteId,
        clientesMap[item.clienteId] || 'Cliente desconhecido'
      );
    });

    return Array.from(options.entries())
      .map(([id, nome]) => ({ id, nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [clientesMap, contas]);

  const selectedClienteLabel = useMemo(() => {
    if (clienteFilter === 'all') return 'Todos os clientes';
    if (clienteFilter === 'avulso') return 'Vendas avulsas';
    return (
      clienteOptions.find((item) => item.id === clienteFilter)?.nome ||
      'Cliente selecionado'
    );
  }, [clienteFilter, clienteOptions]);

  const getOpenedDays = useCallback((venda: Venda) => {
    const baseDate =
      (venda as any).dataVenda ||
      (venda as any).createdAt ||
      (venda as any).dataColheita;
    if (!baseDate) return null;

    const parsed =
      typeof baseDate?.toDate === 'function'
        ? baseDate.toDate()
        : typeof baseDate?.seconds === 'number'
          ? new Date(baseDate.seconds * 1000)
          : new Date(baseDate);

    if (!(parsed instanceof Date) || Number.isNaN(parsed.getTime()))
      return null;

    const diffMs = Date.now() - parsed.getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  }, []);

  const filteredContas = useMemo(() => {
    const search = searchText.trim().toLowerCase();
    return contas
      .filter((item) => {
        const clienteNome = item.clienteId
          ? clientesMap[item.clienteId] || 'cliente desconhecido'
          : 'nao identificado';
        const metodo = String(
          item.metodoPagamento || item.formaPagamento || ''
        );
        const descricao = String(item.itens?.[0]?.descricao || '');
        const observacoes = String(item.observacoes || '');
        const openedDays = getOpenedDays(item);
        const normalizedMetodo = metodo.toLowerCase().trim();

        const clientMatch =
          clienteFilter === 'all' ||
          (clienteFilter === 'avulso'
            ? !item.clienteId
            : item.clienteId === clienteFilter);
        const searchMatch =
          !search ||
          `${clienteNome} ${metodo} ${descricao} ${observacoes}`
            .toLowerCase()
            .includes(search);
        const ageMatch =
          ageFilter === 'all' ||
          (ageFilter === 'today' && openedDays === 0) ||
          (ageFilter === '1_7' &&
            openedDays !== null &&
            openedDays >= 1 &&
            openedDays <= 7) ||
          (ageFilter === '8_30' &&
            openedDays !== null &&
            openedDays >= 8 &&
            openedDays <= 30) ||
          (ageFilter === '30_plus' && openedDays !== null && openedDays > 30);
        const methodMatch =
          methodFilter === 'all' ||
          normalizedMetodo === methodFilter ||
          (methodFilter === 'outro' &&
            !['prazo', 'boleto', 'cheque'].includes(normalizedMetodo));

        return clientMatch && searchMatch && ageMatch && methodMatch;
      })
      .sort((a, b) => {
        const openedA = getOpenedDays(a) ?? -1;
        const openedB = getOpenedDays(b) ?? -1;
        if (openedA !== openedB) return openedB - openedA;

        const rawA =
          (a as any).dataVenda ||
          (a as any).createdAt ||
          (a as any).dataColheita;
        const rawB =
          (b as any).dataVenda ||
          (b as any).createdAt ||
          (b as any).dataColheita;
        const timeA =
          typeof rawA?.toDate === 'function'
            ? rawA.toDate().getTime()
            : typeof rawA?.seconds === 'number'
              ? rawA.seconds * 1000
              : new Date(rawA || 0).getTime();
        const timeB =
          typeof rawB?.toDate === 'function'
            ? rawB.toDate().getTime()
            : typeof rawB?.seconds === 'number'
              ? rawB.seconds * 1000
              : new Date(rawB || 0).getTime();
        return timeA - timeB;
      });
  }, [
    ageFilter,
    clienteFilter,
    clientesMap,
    contas,
    getOpenedDays,
    methodFilter,
    searchText,
  ]);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-';
    const parsed =
      typeof timestamp?.toDate === 'function'
        ? timestamp.toDate()
        : typeof timestamp?.seconds === 'number'
          ? new Date(timestamp.seconds * 1000)
          : new Date(timestamp);
    return parsed.toLocaleDateString('pt-BR');
  };

  const formatMetodo = (metodo?: string | null) => {
    if (!metodo) return 'Indefinido';
    switch (metodo) {
      case 'prazo':
        return 'Fiado / Prazo';
      case 'boleto':
        return 'Boleto';
      case 'cheque':
        return 'Cheque';
      default:
        return metodo.charAt(0).toUpperCase() + metodo.slice(1);
    }
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const getOpenedDaysLabel = (venda: Venda) => {
    const diffDays = getOpenedDays(venda);
    if (diffDays === null) return 'Sem data';
    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return '1 dia aberto';
    return `${diffDays} dias abertos`;
  };

  const handleOpenReceber = (item: Venda) => {
    const today = new Date();
    setSelectedConta(item);
    setMetodoRecebimento('');
    setChequeEmMaos(isChequeEmMaosPayment(item.formaPagamento));
    setPagamentoPara(item.pagamentoPara || null);
    setValorRecebido(
      Number(getVendaTotal(item) || 0)
        .toFixed(2)
        .replace('.', ',')
    );
    setDataRecebimento(today);
    setDataRecebimentoInput(formatDateInputBR(today));
    setShowDataRecebimentoPicker(false);
    setModalVisible(true);
  };

  const confirmRecebimento = async () => {
    const targetId = selectedTenantId || user?.uid;
    if (!selectedConta || !targetId) return;

    if (!metodoRecebimento) {
      Alert.alert(
        'Forma de recebimento',
        'Selecione como o pagamento foi recebido.'
      );
      return;
    }
    const shouldMarkChequeEmMaos =
      metodoRecebimento === 'cheque' && chequeEmMaos;
    if (!shouldMarkChequeEmMaos && caixaPessoas.length > 0 && !pagamentoPara) {
      Alert.alert('Atencao', 'Selecione quem recebeu no caixa.');
      return;
    }
    const valorRecebidoNumero = Number(valorRecebido.replace(',', '.'));
    if (
      !valorRecebido.trim() ||
      !Number.isFinite(valorRecebidoNumero) ||
      valorRecebidoNumero < 0
    ) {
      Alert.alert(
        'Valor recebido',
        'Informe quanto o cliente realmente pagou.'
      );
      return;
    }

    const receiptDate =
      Platform.OS === 'web'
        ? parseDateInputBR(dataRecebimentoInput)
        : dataRecebimento;
    if (!receiptDate) {
      Alert.alert('Data inválida', 'Informe a data no formato dd/mm/aaaa.');
      return;
    }

    const rawSaleDate = selectedConta.dataVenda;
    const saleDate =
      typeof rawSaleDate?.toDate === 'function'
        ? rawSaleDate.toDate()
        : new Date(rawSaleDate as any);
    if (!Number.isNaN(saleDate.getTime())) {
      const saleDay = new Date(saleDate);
      const receiptDay = new Date(receiptDate);
      saleDay.setHours(0, 0, 0, 0);
      receiptDay.setHours(0, 0, 0, 0);
      if (receiptDay.getTime() < saleDay.getTime()) {
        Alert.alert(
          'Data inválida',
          'A data do recebimento não pode ser anterior à data da venda.'
        );
        return;
      }
    }

    setLoadingAction(true);
    try {
      if (shouldMarkChequeEmMaos) {
        await markVendaChequeEmMaos(
          selectedConta.id,
          targetId,
          receiptDate,
          valorRecebidoNumero,
          undefined,
          auditActor
        );
      } else {
        await receberConta(
          selectedConta.id,
          targetId,
          metodoRecebimento,
          pagamentoPara,
          auditActor,
          valorRecebidoNumero,
          receiptDate
        );
      }
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard(targetId),
      });
      queryClient.invalidateQueries({ queryKey: ['vendas-list', targetId] });
      setModalVisible(false);
      setSelectedConta(null);
      Alert.alert(
        'Sucesso',
        shouldMarkChequeEmMaos
          ? 'Cheque registrado em mãos. A venda continua pendente até definir o destino e compensar.'
          : 'Pagamento registrado e baixa efetuada.'
      );
      void carregarDados();
    } catch (error: any) {
      Alert.alert(
        'Erro',
        error?.message || 'Não foi possível registrar o recebimento.'
      );
    } finally {
      setLoadingAction(false);
    }
  };

  const handleSalvarPessoaCaixa = async () => {
    const targetId = selectedTenantId || user?.uid;
    if (!targetId) return;
    if (!novoCaixaNome.trim()) {
      Alert.alert('Atencao', 'Digite o nome da pessoa.');
      return;
    }

    setSalvandoCaixaPessoa(true);
    try {
      const id = await createCaixaPessoa(
        { nome: novoCaixaNome.trim() },
        targetId
      );
      const novaPessoa = {
        id,
        nome: novoCaixaNome.trim(),
        ativo: true,
      } as CaixaPessoa;
      setCaixaPessoas((prev) =>
        [...prev, novaPessoa].sort((a, b) => a.nome.localeCompare(b.nome))
      );
      setPagamentoPara(id);
      setNovoCaixaNome('');
      setModalCaixaVisible(false);
    } catch {
      Alert.alert('Erro', 'Nao foi possivel cadastrar a pessoa do caixa.');
    } finally {
      setSalvandoCaixaPessoa(false);
    }
  };

  const renderHeader = () => (
    <>
      <ScreenHeaderCard
        title="Recebimentos"
        subtitle="Baixe contas a prazo com menos passos e visao clara do que ainda esta pendente."
        badgeLabel="Contas"
      >
        <View style={styles.headerStats}>
          <View style={styles.headerStatChip}>
            <Text style={styles.headerStatValue}>{contas.length}</Text>
            <Text style={styles.headerStatLabel}>Em aberto</Text>
          </View>
          <View style={styles.headerStatChip}>
            <Text style={styles.headerStatValue}>
              {formatCurrency(totalPendente).split(',')[0]}
            </Text>
            <Text style={styles.headerStatLabel}>Total pendente</Text>
          </View>
        </View>
      </ScreenHeaderCard>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.financeLinksRow}
      >
        {[
          { label: 'Vendas', icon: 'cash-multiple', screen: 'VendasList' },
          {
            label: 'Contas',
            icon: 'cash-clock',
            active: true,
            screen: 'ContasReceber',
          },
          { label: 'Despesas', icon: 'cash-minus', screen: 'DespesasList' },
        ].map((link) => (
          <TouchableOpacity
            key={link.label}
            style={[
              styles.financeLink,
              link.active && {
                borderColor: theme.info,
                backgroundColor: theme.infoSoft,
              },
            ]}
            onPress={() =>
              link.active ? null : navigation.navigate(link.screen)
            }
          >
            <MaterialCommunityIcons
              name={link.icon as any}
              size={16}
              color={link.active ? theme.info : theme.textSecondary}
            />
            <Text
              style={[
                styles.financeLinkText,
                { color: link.active ? theme.info : theme.textSecondary },
              ]}
            >
              {link.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.metricsWrapper}>
        <MetricCard
          label="Pendente Total"
          value={formatCurrency(totalPendente)}
          icon="cash-clock"
          tone="warning"
        />
        <MetricCard
          label="Ticket Medio"
          value={formatCurrency(ticketMedio)}
          icon="chart-line"
          tone="info"
        />
      </View>

      <View
        style={[
          styles.insightCard,
          {
            backgroundColor: theme.surfaceBackground,
            borderColor: theme.border,
          },
        ]}
      >
        <View style={styles.insightHeader}>
          <View>
            <Text style={[styles.insightEyebrow, { color: theme.info }]}>
              Leitura rapida
            </Text>
            <Text style={[styles.insightTitle, { color: theme.textPrimary }]}>
              Quem precisa receber agora
            </Text>
          </View>
          <View
            style={[
              styles.insightBadge,
              { backgroundColor: theme.warningSoft },
            ]}
          >
            <Text style={[styles.insightBadgeText, { color: theme.warning }]}>
              {filteredContas.length} cobrancas
            </Text>
          </View>
        </View>

        <View style={styles.insightGrid}>
          <View
            style={[
              styles.insightMiniCard,
              { backgroundColor: theme.surfaceMuted },
            ]}
          >
            <Text
              style={[styles.insightMiniLabel, { color: theme.textSecondary }]}
            >
              Clientes
            </Text>
            <Text
              style={[styles.insightMiniValue, { color: theme.textPrimary }]}
            >
              {uniqueClientes}
            </Text>
          </View>
          <View
            style={[
              styles.insightMiniCard,
              { backgroundColor: theme.surfaceMuted },
            ]}
          >
            <Text
              style={[styles.insightMiniLabel, { color: theme.textSecondary }]}
            >
              Caixas ativos
            </Text>
            <Text
              style={[styles.insightMiniValue, { color: theme.textPrimary }]}
            >
              {caixaPessoas.length}
            </Text>
          </View>
        </View>

        <Text style={[styles.insightText, { color: theme.textSecondary }]}>
          Toque no card para revisar a venda ou use o botao azul para registrar
          a baixa direto.
        </Text>
      </View>

      <View
        style={[
          styles.clientFilterCard,
          {
            backgroundColor: theme.surfaceBackground,
            borderColor: theme.border,
          },
        ]}
      >
        <View style={styles.filtersHeader}>
          <Text style={[styles.filtersTitle, { color: theme.textPrimary }]}>
            Cliente
          </Text>
          <Text
            style={[styles.clientFilterCurrent, { color: theme.textSecondary }]}
            numberOfLines={1}
          >
            {selectedClienteLabel}
          </Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
        >
          <TouchableOpacity
            style={[
              styles.filterChip,
              {
                borderColor:
                  clienteFilter === 'all' ? theme.info : theme.border,
                backgroundColor:
                  clienteFilter === 'all' ? theme.infoSoft : theme.surfaceMuted,
              },
            ]}
            onPress={() => setClienteFilter('all')}
          >
            <Text
              style={[
                styles.filterChipText,
                {
                  color:
                    clienteFilter === 'all' ? theme.info : theme.textPrimary,
                },
              ]}
            >
              Todos
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterChip,
              {
                borderColor:
                  clienteFilter === 'avulso' ? theme.info : theme.border,
                backgroundColor:
                  clienteFilter === 'avulso'
                    ? theme.infoSoft
                    : theme.surfaceMuted,
              },
            ]}
            onPress={() => setClienteFilter('avulso')}
          >
            <Text
              style={[
                styles.filterChipText,
                {
                  color:
                    clienteFilter === 'avulso' ? theme.info : theme.textPrimary,
                },
              ]}
            >
              Avulsos
            </Text>
          </TouchableOpacity>
          {clienteOptions.map((cliente) => (
            <TouchableOpacity
              key={cliente.id}
              style={[
                styles.filterChip,
                {
                  borderColor:
                    clienteFilter === cliente.id ? theme.info : theme.border,
                  backgroundColor:
                    clienteFilter === cliente.id
                      ? theme.infoSoft
                      : theme.surfaceMuted,
                },
              ]}
              onPress={() => setClienteFilter(cliente.id)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  {
                    color:
                      clienteFilter === cliente.id
                        ? theme.info
                        : theme.textPrimary,
                  },
                ]}
              >
                {cliente.nome}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View
        style={[
          styles.searchWrapper,
          {
            backgroundColor: theme.surfaceBackground,
            borderColor: theme.border,
          },
        ]}
      >
        <MaterialCommunityIcons
          name="magnify"
          size={20}
          color={theme.textSecondary}
        />
        <TextInput
          style={[styles.searchInput, { color: theme.textPrimary }]}
          placeholder="Buscar cliente, produto ou forma..."
          placeholderTextColor={theme.textMuted}
          value={searchText}
          onChangeText={setSearchText}
        />
        {searchText ? (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <MaterialCommunityIcons
              name="close-circle"
              size={18}
              color={theme.textSecondary}
            />
          </TouchableOpacity>
        ) : null}
      </View>

      <View
        style={[
          styles.filtersCard,
          {
            backgroundColor: theme.surfaceBackground,
            borderColor: theme.border,
          },
        ]}
      >
        <View style={styles.filtersHeader}>
          <Text style={[styles.filtersTitle, { color: theme.textPrimary }]}>
            Filtros
          </Text>
          <TouchableOpacity
            onPress={() => {
              setSearchText('');
              setClienteFilter('all');
              setAgeFilter('all');
              setMethodFilter('all');
            }}
          >
            <Text style={[styles.clearFiltersText, { color: theme.info }]}>
              Limpar
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.filterLabel, { color: theme.textSecondary }]}>
          Tempo em aberto
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
        >
          {[
            { id: 'all', label: 'Todas' },
            { id: 'today', label: 'Hoje' },
            { id: '1_7', label: '1 a 7 dias' },
            { id: '8_30', label: '8 a 30 dias' },
            { id: '30_plus', label: '30+ dias' },
          ].map((filter) => (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.filterChip,
                {
                  borderColor:
                    ageFilter === filter.id ? theme.info : theme.border,
                  backgroundColor:
                    ageFilter === filter.id
                      ? theme.infoSoft
                      : theme.surfaceMuted,
                },
              ]}
              onPress={() => setAgeFilter(filter.id as typeof ageFilter)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  {
                    color:
                      ageFilter === filter.id ? theme.info : theme.textPrimary,
                  },
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={[styles.filterLabel, { color: theme.textSecondary }]}>
          Forma original
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
        >
          {[
            { id: 'all', label: 'Todas' },
            { id: 'prazo', label: 'Prazo' },
            { id: 'boleto', label: 'Boleto' },
            { id: 'cheque', label: 'Cheque' },
            { id: 'outro', label: 'Outros' },
          ].map((filter) => (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.filterChip,
                {
                  borderColor:
                    methodFilter === filter.id ? theme.info : theme.border,
                  backgroundColor:
                    methodFilter === filter.id
                      ? theme.infoSoft
                      : theme.surfaceMuted,
                },
              ]}
              onPress={() => setMethodFilter(filter.id as typeof methodFilter)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  {
                    color:
                      methodFilter === filter.id
                        ? theme.info
                        : theme.textPrimary,
                  },
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {!loading && searchText ? (
        <Text style={[styles.searchFeedback, { color: theme.textSecondary }]}>
          {filteredContas.length} resultado(s) para "{searchText}".
        </Text>
      ) : null}

      {loading ? (
        <View style={styles.loadingWrapper}>
          <ActivityIndicator size="large" color={theme.info} />
        </View>
      ) : null}
    </>
  );

  const valorCombinadoSelecionado = selectedConta
    ? getVendaTotal(selectedConta)
    : 0;
  const valorRecebidoSelecionado = Number(valorRecebido.replace(',', '.'));
  const diferencaRecebida = Number.isFinite(valorRecebidoSelecionado)
    ? valorRecebidoSelecionado - valorCombinadoSelecionado
    : 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.pageBackground }]}>
      <FlatList
        data={filteredContas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 40 },
        ]}
        ListHeaderComponent={renderHeader}
        refreshing={refreshing}
        onRefresh={() => void carregarDados(true)}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="hand-coin-outline"
              title="Tudo em dia!"
              description="Nao ha recebimentos pendentes no momento."
            />
          ) : null
        }
        renderItem={({ item }) => (
          <ContaItemCard
            item={item}
            theme={theme}
            clienteNome={
              item.clienteId
                ? clientesMap[item.clienteId] || 'Cliente desconhecido'
                : 'Nao identificado'
            }
            formatDate={formatDate}
            formatMetodo={formatMetodo}
            formatCurrency={formatCurrency}
            getVendaTotal={getVendaTotal}
            getOpenedDaysLabel={getOpenedDaysLabel}
            onReceber={handleOpenReceber}
            onPress={() => {
              navigation.navigate(
                item.talhaoId ? 'CampoVendaForm' : 'ColheitaForm',
                { vendaId: item.id, isEdit: true }
              );
            }}
          />
        )}
      />

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.surfaceBackground },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                Receber Pagamento
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color={theme.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {selectedConta ? (
              <View
                style={[
                  styles.resumoConta,
                  {
                    backgroundColor: theme.surfaceMuted,
                    borderColor: theme.border,
                  },
                ]}
              >
                <View style={styles.resumoRow}>
                  <View style={styles.resumoMainColumn}>
                    <Text
                      style={[
                        styles.resumoLabel,
                        { color: theme.textSecondary },
                      ]}
                    >
                      Cliente
                    </Text>
                    <Text
                      style={[styles.resumoValue, { color: theme.textPrimary }]}
                    >
                      {selectedConta.clienteId
                        ? clientesMap[selectedConta.clienteId]
                        : 'Avulso'}
                    </Text>
                    <Text
                      style={[
                        styles.resumoMetaText,
                        { color: theme.textMuted },
                      ]}
                    >
                      {getOpenedDaysLabel(selectedConta)}
                    </Text>
                  </View>
                  <View style={styles.resumoPriceColumn}>
                    <Text
                      style={[
                        styles.resumoLabel,
                        { color: theme.textSecondary },
                      ]}
                    >
                      Valor total
                    </Text>
                    <Text
                      style={[styles.resumoValuePrice, { color: theme.info }]}
                    >
                      {formatCurrency(getVendaTotal(selectedConta))}
                    </Text>
                  </View>
                </View>
                <View
                  style={[styles.divider, { backgroundColor: theme.divider }]}
                />
                <Text
                  style={[styles.resumoLabel, { color: theme.textSecondary }]}
                >
                  Metodo original
                </Text>
                <Text
                  style={[styles.resumoValue, { color: theme.textPrimary }]}
                >
                  {formatMetodo(
                    selectedConta.metodoPagamento ||
                      selectedConta.formaPagamento ||
                      undefined
                  )}
                </Text>
                {selectedConta.metodoPagamento === 'cheque' &&
                (selectedConta.dataCompensacaoCheque ||
                  selectedConta.dataVencimento) ? (
                  <View
                    style={[
                      styles.chequeModalNotice,
                      {
                        backgroundColor: theme.warningSoft,
                        borderColor: theme.warning,
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="calendar-clock-outline"
                      size={18}
                      color={theme.warning}
                    />
                    <Text
                      style={[
                        styles.chequeModalText,
                        { color: theme.textSecondary },
                      ]}
                    >
                      Compensação prevista em{' '}
                      {formatDate(
                        selectedConta.dataCompensacaoCheque ||
                          selectedConta.dataVencimento
                      )}
                      . Confirme somente quando o dinheiro estiver disponível.
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            <View
              style={[
                styles.actualPaymentCard,
                {
                  backgroundColor: theme.successBackground,
                  borderColor: theme.success,
                },
              ]}
            >
              <Text
                style={[
                  styles.actualPaymentTitle,
                  { color: theme.textPrimary },
                ]}
              >
                {chequeEmMaos
                  ? 'Valor do cheque em mãos *'
                  : 'Quanto o cliente realmente pagou? *'}
              </Text>
              <Text
                style={[
                  styles.actualPaymentHint,
                  { color: theme.textSecondary },
                ]}
              >
                {chequeEmMaos
                  ? 'Esse valor não entra no caixa até confirmar a compensação.'
                  : 'O valor combinado não será alterado.'}
              </Text>
              <View
                style={[
                  styles.actualPaymentInputRow,
                  {
                    backgroundColor: theme.surfaceBackground,
                    borderColor: theme.success,
                  },
                ]}
              >
                <Text
                  style={[styles.actualPaymentPrefix, { color: theme.success }]}
                >
                  R$
                </Text>
                <TextInput
                  style={[
                    styles.actualPaymentInput,
                    { color: theme.textPrimary },
                  ]}
                  value={valorRecebido}
                  onChangeText={(value) =>
                    setValorRecebido(sanitizeDecimalInput(value))
                  }
                  keyboardType="decimal-pad"
                  placeholder="0,00"
                  placeholderTextColor={theme.textMuted}
                  selectTextOnFocus
                />
              </View>
              <Text
                style={[
                  styles.actualPaymentDifference,
                  {
                    color:
                      Math.abs(diferencaRecebida) < 0.01
                        ? theme.textSecondary
                        : diferencaRecebida < 0
                          ? theme.warning
                          : theme.success,
                  },
                ]}
              >
                {Math.abs(diferencaRecebida) < 0.01
                  ? 'Mesmo valor combinado'
                  : diferencaRecebida < 0
                    ? `${formatCurrency(Math.abs(diferencaRecebida))} abaixo do combinado`
                    : `${formatCurrency(diferencaRecebida)} acima do combinado`}
              </Text>
            </View>

            <View
              style={[styles.flowCard, { backgroundColor: theme.infoSoft }]}
            >
              <Text style={[styles.flowTitle, { color: theme.info }]}>
                Fluxo de baixa
              </Text>
              <Text style={[styles.flowText, { color: theme.textSecondary }]}>
                1. Informe a data em que o dinheiro entrou.
              </Text>
              <Text style={[styles.flowText, { color: theme.textSecondary }]}>
                2. Escolha como o cliente pagou.
              </Text>
              <Text style={[styles.flowText, { color: theme.textSecondary }]}>
                3. Informe quem recebeu no caixa.
              </Text>
              <Text style={[styles.flowText, { color: theme.textSecondary }]}>
                4. Confirme para retirar da lista de pendentes.
              </Text>
            </View>

            <Text style={[styles.labelPicker, { color: theme.textSecondary }]}>
              {chequeEmMaos
                ? 'Data que pegou o cheque'
                : 'Data efetiva do recebimento'}
            </Text>
            {Platform.OS === 'web' ? (
              <TextInput
                style={[
                  styles.receiptDateInput,
                  {
                    borderColor: theme.border,
                    backgroundColor: theme.surfaceMuted,
                    color: theme.textPrimary,
                  },
                ]}
                value={dataRecebimentoInput}
                onChangeText={(value) => {
                  const formatted = sanitizeDateInputBR(value);
                  setDataRecebimentoInput(formatted);
                  const parsed = parseDateInputBR(formatted);
                  if (parsed) setDataRecebimento(parsed);
                }}
                placeholder="dd/mm/aaaa"
                placeholderTextColor={theme.textMuted}
                keyboardType="numeric"
              />
            ) : (
              <TouchableOpacity
                style={[
                  styles.receiptDateButton,
                  {
                    borderColor: theme.border,
                    backgroundColor: theme.surfaceMuted,
                  },
                ]}
                onPress={() => setShowDataRecebimentoPicker(true)}
              >
                <MaterialCommunityIcons
                  name="calendar-check-outline"
                  size={20}
                  color={theme.info}
                />
                <Text
                  style={[styles.receiptDateText, { color: theme.textPrimary }]}
                >
                  {dataRecebimento.toLocaleDateString('pt-BR')}
                </Text>
              </TouchableOpacity>
            )}

            {Platform.OS !== 'web' && showDataRecebimentoPicker ? (
              <DateTimePicker
                value={dataRecebimento}
                mode="date"
                display="default"
                maximumDate={new Date()}
                onChange={(_event, selectedDate) => {
                  setShowDataRecebimentoPicker(false);
                  if (selectedDate) {
                    setDataRecebimento(selectedDate);
                    setDataRecebimentoInput(formatDateInputBR(selectedDate));
                  }
                }}
              />
            ) : null}

            <Text style={[styles.labelPicker, { color: theme.textSecondary }]}>
              Forma de recebimento
            </Text>
            <View
              style={[
                styles.pickerWrapper,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.surfaceMuted,
                },
              ]}
            >
              <Picker
                selectedValue={metodoRecebimento}
                onValueChange={(value) => {
                  setMetodoRecebimento(value);
                  if (value !== 'cheque') setChequeEmMaos(false);
                }}
                style={{ color: theme.textPrimary }}
                dropdownIconColor={theme.textPrimary}
              >
                <Picker.Item
                  label="Selecione a forma de recebimento..."
                  value=""
                />
                <Picker.Item label="Pix" value="pix" />
                <Picker.Item label="Dinheiro" value="dinheiro" />
                <Picker.Item label="Cartao" value="cartao" />
                <Picker.Item label="Boleto" value="boleto" />
                <Picker.Item label="Cheque" value="cheque" />
                <Picker.Item label="Outro" value="outro" />
              </Picker>
            </View>

            {metodoRecebimento === 'cheque' ? (
              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.chequeWalletOption,
                  {
                    backgroundColor: chequeEmMaos
                      ? theme.warningSoft
                      : theme.surfaceMuted,
                    borderColor: chequeEmMaos ? theme.warning : theme.border,
                  },
                ]}
                onPress={() => {
                  setChequeEmMaos((current) => !current);
                  setPagamentoPara(null);
                }}
              >
                <MaterialCommunityIcons
                  name={
                    chequeEmMaos
                      ? 'checkbox-marked-circle-outline'
                      : 'checkbox-blank-circle-outline'
                  }
                  size={22}
                  color={chequeEmMaos ? theme.warning : theme.textSecondary}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.chequeWalletTitle,
                      { color: theme.textPrimary },
                    ]}
                  >
                    Cheque em mãos, destino a definir
                  </Text>
                  <Text
                    style={[
                      styles.chequeWalletText,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Mantém a venda pendente, não entra no caixa e sai destacado
                    no PDF/Excel.
                  </Text>
                </View>
              </TouchableOpacity>
            ) : null}

            <Text style={[styles.labelPicker, { color: theme.textSecondary }]}> 
              {chequeEmMaos ? 'Destino do cheque' : 'Recebido por (caixa)'}
            </Text>
            {chequeEmMaos ? (
              <Text style={[styles.receiptHelperText, { color: theme.textSecondary }]}>
                Pode deixar sem selecionar. Depois você define para quem vai e confirma a baixa.
              </Text>
            ) : null}
            {selectedConta?.metodoPagamento === 'cheque' ? (
              <Text style={[styles.receiptHelperText, { color: theme.textSecondary }]}>
                Se o cheque foi entregue a outra pessoa, selecione quem efetivamente recebeu a entrada agora.
              </Text>
            ) : null}
            <View style={styles.pickerRow}>
              <View
                style={[
                  styles.pickerWrapper,
                  {
                    flex: 1,
                    borderColor: theme.border,
                    backgroundColor: theme.surfaceMuted,
                    marginBottom: 0,
                  },
                ]}
              >
                <Picker
                  selectedValue={pagamentoPara || ''}
                  onValueChange={(value) => setPagamentoPara(value || null)}
                  style={{ color: theme.textPrimary }}
                  dropdownIconColor={theme.textPrimary}
                >
                  <Picker.Item label="Selecione uma pessoa..." value="" />
                  {caixaPessoas.map((pessoa) => (
                    <Picker.Item
                      key={pessoa.id}
                      label={pessoa.nome}
                      value={pessoa.id}
                    />
                  ))}
                </Picker>
              </View>
              <TouchableOpacity
                style={[
                  styles.addCaixaBtn,
                  {
                    borderColor: theme.border,
                    backgroundColor: theme.surfaceMuted,
                  },
                ]}
                onPress={() => setModalCaixaVisible(true)}
              >
                <MaterialCommunityIcons
                  name="account-plus"
                  size={22}
                  color={theme.info}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <LoadingButton
                label="Cancelar"
                variant="neutral"
                onPress={() => setModalVisible(false)}
                style={{ flex: 1 }}
              />
              <LoadingButton
                label={
                  loadingAction
                    ? 'Registrando...'
                    : chequeEmMaos
                      ? 'Registrar cheque'
                      : 'Confirmar baixa'
                }
                variant="primary"
                onPress={confirmRecebimento}
                loading={loadingAction}
                style={{ flex: 1.5 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={modalCaixaVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalCaixaVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.surfaceBackground },
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
              Nova Pessoa do Caixa
            </Text>
            <Text
              style={[styles.modalDescription, { color: theme.textSecondary }]}
            >
              Cadastre rapidamente quem pode receber pagamentos no fechamento.
            </Text>

            <TextInput
              style={[
                styles.input,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.surfaceMuted,
                  color: theme.textPrimary,
                },
              ]}
              placeholder="Nome da pessoa"
              placeholderTextColor={theme.textMuted}
              value={novoCaixaNome}
              onChangeText={setNovoCaixaNome}
              autoFocus
            />

            <View style={styles.modalActions}>
              <LoadingButton
                label="Cancelar"
                variant="neutral"
                onPress={() => setModalCaixaVisible(false)}
                style={{ flex: 1 }}
              />
              <LoadingButton
                label={salvandoCaixaPessoa ? 'Salvando...' : 'Salvar'}
                variant="primary"
                onPress={handleSalvarPessoaCaixa}
                loading={salvandoCaixaPessoa}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingHorizontal: SPACING.lg },
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
  headerStatValue: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  headerStatLabel: {
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  financeLinksRow: { gap: 10, marginTop: 16, paddingRight: 20 },
  financeLink: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 100,
    borderColor: '#E2E8F0',
  },
  financeLinkText: { fontSize: 13, fontWeight: '800' },
  metricsWrapper: { flexDirection: 'row', gap: 10, marginTop: 16 },
  insightCard: {
    marginTop: 16,
    marginBottom: 6,
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 16,
  },
  insightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  insightEyebrow: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  insightTitle: { fontSize: 18, fontWeight: '900', marginTop: 4 },
  insightBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  insightBadgeText: { fontSize: 11, fontWeight: '900' },
  insightGrid: { flexDirection: 'row', gap: 10, marginTop: 14 },
  insightMiniCard: { flex: 1, borderRadius: 14, padding: 12 },
  insightMiniLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  insightMiniValue: { marginTop: 4, fontSize: 18, fontWeight: '900' },
  insightText: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  searchWrapper: {
    marginTop: 16,
    marginBottom: 8,
    borderWidth: 1.5,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    minHeight: 52,
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15, fontWeight: '600' },
  clientFilterCard: {
    marginTop: 16,
    marginBottom: 8,
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 14,
  },
  clientFilterCurrent: {
    flex: 1,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 12,
  },
  filtersCard: {
    marginBottom: 10,
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 14,
  },
  filtersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  filtersTitle: { fontSize: 15, fontWeight: '900' },
  clearFiltersText: { fontSize: 12, fontWeight: '800' },
  filterLabel: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filtersRow: { gap: 8, paddingRight: 20, marginBottom: 12 },
  filterChip: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  filterChipText: { fontSize: 12, fontWeight: '800' },
  searchFeedback: { marginBottom: 12, fontSize: 12, fontWeight: '700' },
  loadingWrapper: { marginVertical: 20, alignItems: 'center' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  modalDescription: {
    marginTop: 8,
    marginBottom: 20,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  resumoConta: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 18,
    borderWidth: 1.5,
  },
  actualPaymentCard: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  actualPaymentTitle: { fontSize: 14, fontWeight: '900' },
  actualPaymentHint: { fontSize: 11, marginTop: 3, marginBottom: 10 },
  actualPaymentInputRow: {
    minHeight: 54,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actualPaymentPrefix: { fontSize: 17, fontWeight: '900', marginRight: 8 },
  actualPaymentInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 21,
    fontWeight: '900',
  },
  actualPaymentDifference: {
    marginTop: 7,
    textAlign: 'right',
    fontSize: 11,
    fontWeight: '800',
  },
  resumoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  resumoMainColumn: { flex: 1 },
  resumoPriceColumn: { alignItems: 'flex-end' },
  resumoLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resumoValue: { marginTop: 4, fontSize: 16, fontWeight: '800' },
  resumoMetaText: { marginTop: 6, fontSize: 12, fontWeight: '700' },
  resumoValuePrice: { marginTop: 4, fontSize: 24, fontWeight: '900' },
  divider: { height: 1, marginVertical: 12 },
  chequeModalNotice: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chequeModalText: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: '700' },
  flowCard: { borderRadius: 16, padding: 14, marginBottom: 18 },
  flowTitle: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  flowText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    marginBottom: 3,
  },
  labelPicker: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  receiptHelperText: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: -3,
    marginBottom: 8,
  },
  receiptDateButton: {
    minHeight: 54,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  receiptDateText: { fontSize: 14, fontWeight: '800' },
  receiptDateInput: {
    minHeight: 54,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 12,
    fontSize: 14,
    fontWeight: '800',
  },
  pickerWrapper: {
    borderWidth: 1.5,
    borderRadius: 14,
    marginBottom: 20,
    overflow: 'hidden',
  },
  chequeWalletOption: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 12,
    marginTop: -8,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  chequeWalletTitle: { fontSize: 13, fontWeight: '900' },
  chequeWalletText: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
    marginTop: 3,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginBottom: 24,
  },
  addCaixaBtn: {
    width: 54,
    height: 54,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalActions: { flexDirection: 'row', gap: 12 },
  input: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 24,
  },
});

export default ContasReceberScreen;
