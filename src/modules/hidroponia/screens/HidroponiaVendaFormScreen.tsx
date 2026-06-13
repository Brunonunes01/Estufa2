import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuth } from '../../../hooks/useAuth';
import { RootStackParamList } from '../../../navigation/types';
import { COLORS } from '../../../constants/theme';
import { Cliente } from '../../../types/domain';
import { invalidateClientesQuery, invalidateVendasQueries } from '../../../lib/queryInvalidation';
import { listClientes, createCliente } from '../../../services/clienteService';
import { createCaixaPessoa, listCaixaPessoas, CaixaPessoa } from '../../../services/caixaPessoaService';
import { getVendaById, updateVenda, deleteVenda } from '../../../services/vendaService';
import { getHydroLoteById, listHydroLotes } from '../services/hidroponiaLoteService';
import { listHydroOcupacoesByLote } from '../services/hidroponiaOcupacaoService';
import { HydroLote, HydroOcupacao } from '../types';
import { registrarVendaHidroponicaPorLote } from '../services/hidroponiaColheitaService';
import { useAppSettings } from '../../../hooks/useAppSettings';
import { verifyCurrentUserPassword } from '../../../services/securityService';
import {
  clearHidroponiaVendaDraft,
  loadHidroponiaVendaDraft,
  saveHidroponiaVendaDraft,
} from '../services/hidroponiaVendaDraftStorage';

type Props = NativeStackScreenProps<RootStackParamList, 'HidroponiaVendaForm'>;
type UnidadeVenda = 'kg' | 'caixas' | 'un' | 'maços';
type MetodoPagamento = 'pix' | 'dinheiro' | 'boleto' | 'prazo' | 'cartao' | 'cheque' | 'outro';

const HidroponiaVendaFormScreen = ({ route, navigation }: Props) => {
  const { user, selectedTenantId } = useAuth();
  const { settings } = useAppSettings();
  const insets = useSafeAreaInsets();
  const targetId = selectedTenantId || user?.uid;
  const params = route.params || {};
  const isEditMode = !!params.vendaId;
  const [isEditAuthorized, setIsEditAuthorized] = useState(false);

  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [lotes, setLotes] = useState<HydroLote[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [caixaPessoas, setCaixaPessoas] = useState<CaixaPessoa[]>([]);
  const [selectedLoteId, setSelectedLoteId] = useState<string>(params.loteId || '');
  const [loteInfo, setLoteInfo] = useState<HydroLote | null>(null);
  const [ocupacoesAtivas, setOcupacoesAtivas] = useState<HydroOcupacao[]>([]);

  const [quantidade, setQuantidade] = useState('');
  const [unidade, setUnidade] = useState<UnidadeVenda>('caixas');
  const [precoUnitario, setPrecoUnitario] = useState('');
  const [metodoPagamento, setMetodoPagamento] = useState<MetodoPagamento>('pix');
  const [pagamentoPara, setPagamentoPara] = useState<string | null>(null);
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null);
  const [dataVenda, setDataVenda] = useState(new Date());
  const [produtoDescricao, setProdutoDescricao] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const [modalClienteVisible, setModalClienteVisible] = useState(false);
  const [novoClienteNome, setNovoClienteNome] = useState('');
  const [salvandoCliente, setSalvandoCliente] = useState(false);
  const [modalCaixaVisible, setModalCaixaVisible] = useState(false);
  const [novoCaixaNome, setNovoCaixaNome] = useState('');
  const [salvandoCaixaPessoa, setSalvandoCaixaPessoa] = useState(false);
  const [editAuthModalVisible, setEditAuthModalVisible] = useState(false);
  const [editPassword, setEditPassword] = useState('');
  const [editAuthorizing, setEditAuthorizing] = useState(false);
  const [draftRestoredAt, setDraftRestoredAt] = useState<string | null>(null);
  const initialEditSnapshotRef = useRef<string | null>(null);
  const draftReadyRef = useRef(false);

  const buildEditSnapshot = (values: {
    selectedLoteId: string;
    quantidade: string;
    unidade: UnidadeVenda;
    precoUnitario: string;
    metodoPagamento: MetodoPagamento;
    pagamentoPara: string | null;
    selectedClienteId: string | null;
    dataVenda: Date;
    produtoDescricao: string;
    observacoes: string;
  }) =>
    JSON.stringify({
      selectedLoteId: values.selectedLoteId || '',
      quantidade: Number(values.quantidade.replace(',', '.')) || 0,
      unidade: values.unidade,
      precoUnitario: Number(values.precoUnitario.replace(',', '.')) || 0,
      metodoPagamento: values.metodoPagamento,
      pagamentoPara: values.pagamentoPara || null,
      selectedClienteId: values.selectedClienteId || null,
      dataVenda: new Date(values.dataVenda).toISOString().slice(0, 10),
      produtoDescricao: values.produtoDescricao.trim(),
      observacoes: values.observacoes.trim(),
    });

  useLayoutEffect(() => {
    navigation.setOptions({
      title: isEditMode ? 'Editar Venda Hidroponia' : 'Venda Hidroponia',
      headerRight: () =>
        isEditMode ? (
          <TouchableOpacity onPress={handleDelete} style={{ marginRight: 14 }}>
            <MaterialCommunityIcons name="trash-can-outline" size={22} color={COLORS.textLight} />
          </TouchableOpacity>
        ) : null,
    });
  }, [navigation, isEditMode]);

  const culturasAtivas = useMemo(() => {
    const unique = Array.from(new Set(ocupacoesAtivas.map((item) => item.cultura).filter(Boolean)));
    return unique;
  }, [ocupacoesAtivas]);

  const quantidadeDisponivel = useMemo(
    () => ocupacoesAtivas.reduce((sum, item) => sum + Number(item.quantidadeAlocada || 0), 0),
    [ocupacoesAtivas]
  );

  const valorTotal = useMemo(() => {
    const qtd = Number(quantidade.replace(',', '.')) || 0;
    const preco = Number(precoUnitario.replace(',', '.')) || 0;
    return qtd * preco;
  }, [precoUnitario, quantidade]);

  const hasEditChanges = useMemo(() => {
    if (!isEditMode) return true;
    if (!initialEditSnapshotRef.current) return false;
    const current = buildEditSnapshot({
      selectedLoteId,
      quantidade,
      unidade,
      precoUnitario,
      metodoPagamento,
      pagamentoPara,
      selectedClienteId,
      dataVenda,
      produtoDescricao,
      observacoes,
    });
    return current !== initialEditSnapshotRef.current;
  }, [
    isEditMode,
    selectedLoteId,
    quantidade,
    unidade,
    precoUnitario,
    metodoPagamento,
    pagamentoPara,
    selectedClienteId,
    dataVenda,
    produtoDescricao,
    observacoes,
  ]);

  const carregarSnapshotLote = async (tenantId: string, loteId: string) => {
    const [lote, ocupacoes] = await Promise.all([
      getHydroLoteById(loteId, tenantId),
      listHydroOcupacoesByLote(tenantId, loteId),
    ]);
    setLoteInfo(lote);
    setOcupacoesAtivas(ocupacoes);

    if (!produtoDescricao.trim() && ocupacoes.length > 0) {
      const culturas = Array.from(new Set(ocupacoes.map((item) => item.cultura).filter(Boolean)));
      if (culturas.length > 0) {
        setProdutoDescricao(culturas.join(' / '));
      }
    }
  };

  useEffect(() => {
    const carregar = async () => {
      if (!targetId) return;
      setLoadingData(true);
      try {
        const [clientesData, pessoasCaixa, lotesData] = await Promise.all([
          listClientes(targetId),
          listCaixaPessoas(targetId),
          listHydroLotes(targetId),
        ]);
        setClientes(clientesData);
        setCaixaPessoas(pessoasCaixa);
        if (!pagamentoPara && pessoasCaixa.length > 0) {
          setPagamentoPara(pessoasCaixa[0].id);
        }
        setLotes(lotesData);

        if (isEditMode && params.vendaId) {
          const venda = await getVendaById(params.vendaId, targetId);
          if (!venda) {
            Alert.alert('Erro', 'Venda não encontrada.');
            navigation.goBack();
            return;
          }

          const isHydroSale = venda.originType === 'hydro_lote' || !!(venda as any).hydroLoteId;
          if (!isHydroSale) {
            Alert.alert('Origem inválida', 'Esta venda não pertence ao fluxo de hidroponia.');
            navigation.goBack();
            return;
          }

          const hydroLoteId = (venda as any).hydroLoteId || venda.originId || '';
          if (!hydroLoteId) {
            Alert.alert('Dados inválidos', 'Venda sem produção hidropônica vinculada.');
            navigation.goBack();
            return;
          }

          setSelectedLoteId(hydroLoteId);
          setQuantidade(String((venda as any).quantidade || venda.itens?.[0]?.quantidade || ''));
          setUnidade(((venda as any).unidade || venda.itens?.[0]?.unidade || 'caixas') as UnidadeVenda);
          setPrecoUnitario(
            String((venda as any).precoUnitario || venda.itens?.[0]?.valorUnitario || '')
          );
          setSelectedClienteId(venda.clienteId || null);
          const metodoVenda = (venda.metodoPagamento as MetodoPagamento) || 'pix';
          setMetodoPagamento(metodoVenda);
          setPagamentoPara(metodoVenda === 'prazo' ? null : (venda.pagamentoPara as string) || pessoasCaixa[0]?.id || null);
          setObservacoes(venda.observacoes || '');
          setProdutoDescricao(((venda as any).cultura as string) || venda.itens?.[0]?.descricao || '');

          const rawDate: any = venda.dataVenda || (venda as any).dataColheita;
          if (rawDate) {
            const date = rawDate.toDate ? rawDate.toDate() : new Date(rawDate.seconds * 1000);
            setDataVenda(date);
            initialEditSnapshotRef.current = buildEditSnapshot({
              selectedLoteId: hydroLoteId,
              quantidade: String((venda as any).quantidade || venda.itens?.[0]?.quantidade || ''),
              unidade: ((venda as any).unidade || venda.itens?.[0]?.unidade || 'caixas') as UnidadeVenda,
              precoUnitario: String((venda as any).precoUnitario || venda.itens?.[0]?.valorUnitario || ''),
              metodoPagamento: metodoVenda,
              pagamentoPara:
                metodoVenda === 'prazo' ? null : (venda.pagamentoPara as string) || pessoasCaixa[0]?.id || null,
              selectedClienteId: venda.clienteId || null,
              dataVenda: date,
              produtoDescricao: ((venda as any).cultura as string) || venda.itens?.[0]?.descricao || '',
              observacoes: venda.observacoes || '',
            });
          }
        } else if (!params.loteId && lotesData.length === 1) {
          setSelectedLoteId(lotesData[0].id);
        }
      } catch (error) {
        Alert.alert('Erro', 'Não foi possível carregar os dados.');
      } finally {
        setLoadingData(false);
      }
    };

    carregar();
  }, [targetId, isEditMode, params.vendaId, params.loteId, navigation]);

  useEffect(() => {
    const restoreDraft = async () => {
      if (!targetId || isEditMode || loadingData) return;

      const draft = await loadHidroponiaVendaDraft(targetId);
      if (!draft) {
        draftReadyRef.current = true;
        return;
      }

      setSelectedLoteId(draft.selectedLoteId || '');
      setQuantidade(draft.quantidade || '');
      setUnidade((draft.unidade as UnidadeVenda) || 'caixas');
      setPrecoUnitario(draft.precoUnitario || '');
      setMetodoPagamento((draft.metodoPagamento as MetodoPagamento) || 'pix');
      setPagamentoPara(draft.pagamentoPara || null);
      setSelectedClienteId(draft.selectedClienteId || null);
      setDataVenda(draft.dataVendaIso ? new Date(draft.dataVendaIso) : new Date());
      setProdutoDescricao(draft.produtoDescricao || '');
      setObservacoes(draft.observacoes || '');
      setDraftRestoredAt(draft.savedAt);
      draftReadyRef.current = true;
    };

    void restoreDraft();
  }, [targetId, isEditMode, loadingData]);

  useEffect(() => {
    const persistDraft = async () => {
      if (!targetId || isEditMode || !draftReadyRef.current) return;

      const hasContent =
        !!selectedLoteId ||
        !!quantidade ||
        !!precoUnitario ||
        !!pagamentoPara ||
        !!selectedClienteId ||
        !!produtoDescricao.trim() ||
        !!observacoes.trim();

      if (!hasContent) {
        await clearHidroponiaVendaDraft(targetId);
        setDraftRestoredAt(null);
        return;
      }

      await saveHidroponiaVendaDraft(targetId, {
        selectedLoteId,
        quantidade,
        unidade,
        precoUnitario,
        metodoPagamento,
        pagamentoPara,
        selectedClienteId,
        dataVendaIso: dataVenda.toISOString(),
        produtoDescricao,
        observacoes,
      });
    };

    void persistDraft();
  }, [
    targetId,
    isEditMode,
    selectedLoteId,
    quantidade,
    unidade,
    precoUnitario,
    metodoPagamento,
    pagamentoPara,
    selectedClienteId,
    dataVenda,
    produtoDescricao,
    observacoes,
  ]);

  useEffect(() => {
    if (!targetId || !selectedLoteId) {
      setLoteInfo(null);
      setOcupacoesAtivas([]);
      return;
    }
    void carregarSnapshotLote(targetId, selectedLoteId);
  }, [selectedLoteId, targetId]);

  const invalidateQueries = async () => {
    if (!targetId) return;
    await invalidateVendasQueries(targetId, [['hidroponia-lotes', targetId]]);
  };

  async function handleDelete() {
    if (!targetId || !params.vendaId) return;
    Alert.alert('Excluir venda', 'Deseja remover esta venda?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteVenda(params.vendaId!, targetId);
            await invalidateQueries();
            navigation.goBack();
          } catch (error: any) {
            Alert.alert('Erro', error?.message || 'Não foi possível excluir a venda.');
          }
        },
      },
    ]);
  }

  const handleSalvarNovoCliente = async () => {
    if (!targetId) return;
    if (!novoClienteNome.trim()) {
      Alert.alert('Atenção', 'Digite o nome do cliente.');
      return;
    }
    setSalvandoCliente(true);
    try {
      const clienteId = await createCliente({ nome: novoClienteNome.trim(), tipo: 'Consumidor' }, targetId);
      const novo = { id: clienteId, nome: novoClienteNome.trim() } as Cliente;
      setClientes((prev) => [...prev, novo].sort((a, b) => a.nome.localeCompare(b.nome)));
      setSelectedClienteId(clienteId);
      setNovoClienteNome('');
      setModalClienteVisible(false);
      await invalidateClientesQuery(targetId);
    } catch {
      Alert.alert('Erro', 'Não foi possível cadastrar o cliente.');
    } finally {
      setSalvandoCliente(false);
    }
  };

  const handleSalvarNovaPessoaCaixa = async () => {
    if (!targetId) return;
    if (!novoCaixaNome.trim()) {
      Alert.alert('Atenção', 'Digite o nome da pessoa do caixa.');
      return;
    }
    setSalvandoCaixaPessoa(true);
    try {
      const pessoaId = await createCaixaPessoa({ nome: novoCaixaNome.trim() }, targetId);
      const novaPessoa = { id: pessoaId, nome: novoCaixaNome.trim(), ativo: true } as CaixaPessoa;
      setCaixaPessoas((prev) => [...prev, novaPessoa].sort((a, b) => a.nome.localeCompare(b.nome)));
      setPagamentoPara(pessoaId);
      setNovoCaixaNome('');
      setModalCaixaVisible(false);
    } catch {
      Alert.alert('Erro', 'Não foi possível cadastrar pessoa do caixa.');
    } finally {
      setSalvandoCaixaPessoa(false);
    }
  };

  const handleDiscardDraft = async () => {
    if (!targetId || isEditMode) return;
    await clearHidroponiaVendaDraft(targetId);
    setDraftRestoredAt(null);
    setSelectedLoteId(params.loteId || lotes[0]?.id || '');
    setQuantidade('');
    setUnidade('caixas');
    setPrecoUnitario('');
    setMetodoPagamento('pix');
    setPagamentoPara(caixaPessoas[0]?.id || null);
    setSelectedClienteId(null);
    setDataVenda(new Date());
    setProdutoDescricao('');
    setObservacoes('');
  };

  const continueSave = async () => {
    if (!targetId) {
      Alert.alert('Sessão expirada', 'Entre novamente para continuar.');
      return;
    }
    if (!selectedLoteId) {
      Alert.alert('Atenção', 'Selecione uma produção de hidroponia.');
      return;
    }

    const qtd = Number(quantidade.replace(',', '.'));
    const preco = Number(precoUnitario.replace(',', '.'));
    if (!qtd || qtd <= 0) {
      Alert.alert('Atenção', 'A quantidade deve ser maior que zero.');
      return;
    }
    if (preco < 0) {
      Alert.alert('Atenção', 'Preço unitário inválido.');
      return;
    }
    if (metodoPagamento !== 'prazo' && caixaPessoas.length > 0 && !pagamentoPara) {
      Alert.alert('Atenção', 'Selecione quem recebeu no caixa.');
      return;
    }

    if (quantidadeDisponivel > 0 && qtd > quantidadeDisponivel) {
      Alert.alert(
        'Quantidade acima do saldo ativo',
        `A produção possui ${quantidadeDisponivel} unidades em bancadas ativas. Deseja continuar mesmo assim?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Continuar', onPress: () => void persistSale(qtd, preco) },
        ]
      );
      return;
    }

    await persistSale(qtd, preco);
  };

  const handleSave = async () => {
    if (isEditMode && !isEditAuthorized) {
      if (!hasEditChanges) {
        Alert.alert('Sem alteracoes', 'Altere algum campo para salvar a venda.');
        return;
      }
      setEditPassword('');
      setEditAuthModalVisible(true);
      return;
    }

    await continueSave();
  };

  const persistSale = async (qtd: number, preco: number) => {
    if (!targetId || !selectedLoteId) return;

    setSaving(true);
    try {
      const lote = lotes.find((item) => item.id === selectedLoteId) || loteInfo;
      const descricaoDefault = produtoDescricao.trim() || culturasAtivas.join(' / ') || 'Produção hidropônica';
      const observacaoFinal =
        observacoes.trim() || (lote ? `Produção hidropônica: ${lote.codigoLote}` : 'Venda hidroponia');

      const payload = {
        hydroLoteId: selectedLoteId,
        originType: 'hydro_lote' as const,
        originId: selectedLoteId,
        estufaId: lote?.estufaId || params.estufaId,
        clienteId: selectedClienteId,
        quantidade: qtd,
        unidade,
        precoUnitario: preco,
        metodoPagamento,
        pagamentoPara,
        dataVenda,
        observacoes: observacaoFinal,
        itemDescricao: descricaoDefault,
        cultura: descricaoDefault,
      };

      if (isEditMode && params.vendaId) {
        await updateVenda(params.vendaId, payload, targetId);
      } else {
        await registrarVendaHidroponicaPorLote(
          {
            loteId: selectedLoteId,
            quantidadeColhida: qtd,
            unidade,
            precoUnitario: preco,
            clienteId: selectedClienteId,
            metodoPagamento,
            pagamentoPara,
            dataColheita: dataVenda,
            observacoes: observacaoFinal,
            itemDescricao: descricaoDefault,
          },
          targetId
        );
      }

      await invalidateQueries();
      Alert.alert(
        isEditMode ? 'Venda atualizada' : 'Venda registrada',
        `${qtd} ${unidade} • R$ ${(qtd * preco).toFixed(2)}`,
        [{
          text: 'OK',
          onPress: () => {
            if (!isEditMode && targetId) {
              void clearHidroponiaVendaDraft(targetId);
            }
            navigation.goBack();
          },
        }]
      );
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Não foi possível salvar a venda.');
    } finally {
      setSaving(false);
    }
  };

  if (loadingData) {
    return <ActivityIndicator size="large" color={COLORS.primary} style={{ flex: 1 }} />;
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: (settings.uiV2Enabled ? 138 : 34) + insets.bottom },
        ]}
      >
        {!isEditMode && draftRestoredAt ? (
          <View style={styles.draftBanner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.draftBannerTitle}>Rascunho recuperado</Text>
              <Text style={styles.draftBannerText}>
                Última atualização em {new Date(draftRestoredAt).toLocaleString('pt-BR')}
              </Text>
            </View>
            <TouchableOpacity style={styles.draftBannerAction} onPress={() => void handleDiscardDraft()}>
              <Text style={styles.draftBannerActionText}>Descartar</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Origem do Produto</Text>
          <Text style={styles.label}>Produção hidropônica</Text>
          <View style={styles.pickerWrapper}>
            <Picker selectedValue={selectedLoteId} onValueChange={setSelectedLoteId} style={styles.picker} enabled={!isEditMode}>
              <Picker.Item label="Selecione uma produção..." value="" />
              {lotes.map((lote) => (
                <Picker.Item
                  key={lote.id}
                  label={`${lote.codigoLote} • ${lote.nomeOperacional || 'Produção Hidropônica'}`}
                  value={lote.id}
                />
              ))}
            </Picker>
          </View>

          {loteInfo ? (
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>Resumo da produção</Text>
              <Text style={styles.infoText}>Código: {loteInfo.codigoLote}</Text>
              <Text style={styles.infoText}>Bancadas ativas: {ocupacoesAtivas.length}</Text>
              <Text style={styles.infoText}>Saldo nas bancadas: {quantidadeDisponivel} unidades</Text>
              {culturasAtivas.length > 0 ? (
                <Text style={styles.infoText}>Culturas: {culturasAtivas.join(' / ')}</Text>
              ) : (
                <Text style={styles.infoText}>Sem cultura ativa no momento.</Text>
              )}
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Cliente e Data</Text>
          <Text style={styles.label}>Cliente</Text>
          <View style={styles.rowAlign}>
            <View style={styles.pickerWrapper}>
              <Picker selectedValue={selectedClienteId} onValueChange={setSelectedClienteId} style={styles.picker}>
                <Picker.Item label="Venda Avulsa / Consumidor Final" value={null} />
                {clientes.map((cliente) => (
                  <Picker.Item key={cliente.id} label={cliente.nome} value={cliente.id} />
                ))}
              </Picker>
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={() => setModalClienteVisible(true)}>
              <MaterialCommunityIcons name="account-plus" size={22} color={COLORS.textLight} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, { marginTop: 14 }]}>Data da venda</Text>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
            <MaterialCommunityIcons name="calendar" size={20} color={COLORS.primary} />
            <Text style={styles.dateText}>{dataVenda.toLocaleDateString('pt-BR')}</Text>
          </TouchableOpacity>
          {showDatePicker ? (
            <DateTimePicker
              value={dataVenda}
              mode="date"
              display="default"
              onChange={(_, date) => {
                setShowDatePicker(false);
                if (date) setDataVenda(date);
              }}
            />
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Produto e Quantidade</Text>
          <Text style={styles.label}>Descrição do produto</Text>
          <TextInput
            style={styles.input}
            value={produtoDescricao}
            onChangeText={setProdutoDescricao}
            placeholder="Ex.: Alface Crespa Hidropônica"
          />

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.label}>Quantidade</Text>
              <TextInput
                style={styles.input}
                value={quantidade}
                onChangeText={setQuantidade}
                keyboardType="numeric"
                placeholder="0"
                editable={!isEditMode}
              />
            </View>
            <View style={{ width: 118 }}>
              <Text style={styles.label}>Unidade</Text>
              <View style={styles.pickerWrapper}>
                <Picker selectedValue={unidade} onValueChange={(value) => setUnidade(value as UnidadeVenda)} style={styles.picker} enabled={!isEditMode}>
                  <Picker.Item label="CX" value="caixas" />
                  <Picker.Item label="KG" value="kg" />
                  <Picker.Item label="UN" value="un" />
                  <Picker.Item label="MAÇO" value="maços" />
                </Picker>
              </View>
            </View>
          </View>

          <Text style={styles.label}>Preço unitário (R$)</Text>
          <TextInput
            style={styles.input}
            value={precoUnitario}
            onChangeText={setPrecoUnitario}
            keyboardType="numeric"
            placeholder="0,00"
            editable={!isEditMode}
          />

          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>TOTAL DA VENDA</Text>
            <Text style={styles.totalValue}>R$ {valorTotal.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Pagamento</Text>
          <Text style={styles.label}>Método de pagamento</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={metodoPagamento}
              onValueChange={(value) => { setMetodoPagamento(value as MetodoPagamento); if (value === 'prazo') setPagamentoPara(null); }}
              style={styles.picker}
            >
              <Picker.Item label="Pix" value="pix" />
              <Picker.Item label="Dinheiro" value="dinheiro" />
              <Picker.Item label="Boleto" value="boleto" />
              <Picker.Item label="A Prazo" value="prazo" />
              <Picker.Item label="Cartão" value="cartao" />
              <Picker.Item label="Cheque" value="cheque" />
              <Picker.Item label="Outro" value="outro" />
            </Picker>
          </View>
          {metodoPagamento !== 'prazo' ? (
            <>
              <Text style={[styles.label, { marginTop: 14 }]}>Recebido por (Caixa)</Text>
              <View style={styles.rowAlign}>
                <View style={styles.pickerWrapper}>
                  <Picker selectedValue={pagamentoPara} onValueChange={setPagamentoPara} style={styles.picker}>
                    <Picker.Item label="Selecione uma pessoa..." value={null} />
                    {caixaPessoas.map((pessoa) => (
                      <Picker.Item key={pessoa.id} label={pessoa.nome} value={pessoa.id} />
                    ))}
                  </Picker>
                </View>
                <TouchableOpacity style={styles.addBtn} onPress={() => setModalCaixaVisible(true)}>
                  <MaterialCommunityIcons name="account-plus" size={22} color={COLORS.textLight} />
                </TouchableOpacity>
              </View>
            </>
          ) : null}

          <Text style={[styles.label, { marginTop: 14 }]}>Observações</Text>
          <TextInput
            style={[styles.input, { minHeight: 74, textAlignVertical: 'top' }]}
            value={observacoes}
            onChangeText={setObservacoes}
            placeholder="Opcional"
            multiline
          />
        </View>

        {!isEditMode || hasEditChanges ? (
          <TouchableOpacity style={styles.saveBtn} onPress={() => void handleSave()} disabled={saving}>
            {saving ? (
              <ActivityIndicator color={COLORS.textLight} />
            ) : (
              <Text style={styles.saveText}>{isEditMode ? 'Salvar Alteracoes' : 'Confirmar Venda'}</Text>
            )}
          </TouchableOpacity>
        ) : (
          <Text style={[styles.infoText, { textAlign: 'center', marginTop: 8 }]}>Sem alteracoes para salvar.</Text>
        )}
      </ScrollView>

      <Modal animationType="fade" transparent visible={modalClienteVisible} onRequestClose={() => setModalClienteVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Novo Cliente</Text>
            <TextInput
              style={styles.input}
              value={novoClienteNome}
              onChangeText={setNovoClienteNome}
              placeholder="Nome do cliente"
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setModalClienteVisible(false)}>
                <Text style={{ color: COLORS.textSecondary }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtn} onPress={handleSalvarNovoCliente} disabled={salvandoCliente}>
                {salvandoCliente ? (
                  <ActivityIndicator color={COLORS.textLight} />
                ) : (
                  <Text style={{ color: COLORS.textLight, fontWeight: '700' }}>Salvar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal animationType="fade" transparent visible={modalCaixaVisible} onRequestClose={() => setModalCaixaVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nova Pessoa do Caixa</Text>
            <TextInput
              style={styles.input}
              value={novoCaixaNome}
              onChangeText={setNovoCaixaNome}
              placeholder="Nome da pessoa"
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setModalCaixaVisible(false)}>
                <Text style={{ color: COLORS.textSecondary }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtn} onPress={handleSalvarNovaPessoaCaixa} disabled={salvandoCaixaPessoa}>
                {salvandoCaixaPessoa ? (
                  <ActivityIndicator color={COLORS.textLight} />
                ) : (
                  <Text style={{ color: COLORS.textLight, fontWeight: '700' }}>Salvar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal animationType="fade" transparent visible={editAuthModalVisible} onRequestClose={() => setEditAuthModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirmar edição da venda</Text>
            <Text style={[styles.infoText, { marginBottom: 10 }]}>Digite a senha do app para autorizar a alteração.</Text>
            <TextInput
              style={styles.input}
              value={editPassword}
              onChangeText={setEditPassword}
              secureTextEntry
              autoCapitalize="none"
              placeholder="Senha"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setEditAuthModalVisible(false)} disabled={editAuthorizing}>
                <Text style={{ color: COLORS.textSecondary }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtn}
                disabled={editAuthorizing}
                onPress={async () => {
                  if (!editPassword.trim()) {
                    Alert.alert('Atenção', 'Digite a senha para continuar.');
                    return;
                  }
                  setEditAuthorizing(true);
                  try {
                    const ok = await verifyCurrentUserPassword(editPassword.trim());
                    if (!ok) {
                      Alert.alert('Senha inválida', 'A senha informada está incorreta.');
                      return;
                    }
                    setIsEditAuthorized(true);
                    setEditAuthModalVisible(false);
                    await continueSave();
                  } finally {
                    setEditAuthorizing(false);
                  }
                }}
              >
                {editAuthorizing ? <ActivityIndicator color={COLORS.textLight} /> : <Text style={{ color: COLORS.textLight, fontWeight: '700' }}>Autorizar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: 20, paddingBottom: 34 },
  draftBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.infoSoft,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.info,
    padding: 12,
    marginBottom: 14,
  },
  draftBannerTitle: { color: COLORS.info, fontSize: 13, fontWeight: '800', marginBottom: 2 },
  draftBannerText: { color: COLORS.textPrimary, fontSize: 12, fontWeight: '600' },
  draftBannerAction: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftBannerActionText: { color: COLORS.info, fontWeight: '800', fontSize: 12 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  label: { fontSize: 12, color: COLORS.textPrimary, fontWeight: '600', marginBottom: 5 },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  pickerWrapper: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 50,
    justifyContent: 'center',
  },
  picker: { color: COLORS.textPrimary },
  row: { flexDirection: 'row' },
  rowAlign: { flexDirection: 'row', alignItems: 'center' },
  addBtn: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    marginLeft: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
  },
  dateText: { marginLeft: 10, color: COLORS.textPrimary, fontWeight: '700' },
  infoBox: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 2,
  },
  infoTitle: { color: COLORS.primary, fontWeight: '800', fontSize: 12, marginBottom: 3 },
  infoText: { color: COLORS.textSecondary, fontSize: 12 },
  totalContainer: {
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingTop: 12,
    alignItems: 'center',
  },
  totalLabel: { fontSize: 11, color: COLORS.textPrimary, fontWeight: '700' },
  totalValue: { marginTop: 3, fontSize: 24, color: COLORS.primary, fontWeight: '900' },
  saveBtn: {
    height: 54,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  saveText: { color: COLORS.textLight, fontSize: 16, fontWeight: '800' },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.rgba00005,
    justifyContent: 'center',
    padding: 30,
  },
  modalContent: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 18 },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 12, color: COLORS.textPrimary },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 20 },
  modalBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
});

export default HidroponiaVendaFormScreen;
