import React, { useState, useMemo, useEffect, useLayoutEffect, useRef } from 'react';
import {
  View, Text, TextInput, ScrollView, Alert, StyleSheet,
  TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Modal, Switch
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { createColheita, updateColheita, getColheitaById, deleteColheita, ColheitaFormData } from '../../services/colheitaService';
import { getVendaById } from '../../services/vendaService';
import { listAllPlantios, unlockPlantioCycleForEarlySale, updatePlantio } from '../../services/plantioService';
import { listEstufas } from '../../services/estufaService';
import { listClientes, createCliente } from '../../services/clienteService';
import { createCaixaPessoa, listCaixaPessoas, CaixaPessoa } from '../../services/caixaPessoaService';
import { useAuth } from '../../hooks/useAuth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Plantio, Cliente, PlantioCaixaPerfil } from '../../types/domain';
import { COLORS } from '../../constants/theme';
import { invalidateClientesQuery, invalidateVendasQueries } from '../../lib/queryInvalidation';
import { verifyCurrentUserPassword } from '../../services/securityService';
import { useAppSettings } from '../../hooks/useAppSettings';
import { sanitizeDecimalInput, sanitizeIntegerInput } from '../../utils/numericFields';
import {
  buildColheitaEditSnapshot,
  loadColheitaFormBootstrap,
  MetodoPagamento,
  UnidadeColheita,
} from './colheitaFormUtils';

const ColheitaFormScreen = ({ route, navigation }: any) => {
  const { user, selectedTenantId, canDeleteEstufa } = useAuth();
  const { settings } = useAppSettings();
  const insets = useSafeAreaInsets();
  const targetId = selectedTenantId || user?.uid;
  const params = route.params || {};
  const vendaIdParam = params.vendaId as string | undefined;
  const colheitaIdParam = params.colheitaId as string | undefined;
  const isEditMode = !!(colheitaIdParam || vendaIdParam);
  const [editingColheitaId, setEditingColheitaId] = useState<string | null>(colheitaIdParam || null);

  const [plantiosDisponiveis, setPlantiosDisponiveis] = useState<Plantio[]>([]);
  const [clientesList, setClientesList] = useState<Cliente[]>([]);
  const [caixaPessoas, setCaixaPessoas] = useState<CaixaPessoa[]>([]);
  const [estufasMap, setEstufasMap] = useState<Record<string, string>>({});
  const [loadingData, setLoadingData] = useState(false);

  const [selectedPlantioId, setSelectedPlantioId] = useState<string>(params.plantioId || '');
  const [quantidade, setQuantidade] = useState('');
  const [unidade, setUnidade] = useState<UnidadeColheita>('caixas');
  const [preco, setPreco] = useState('');
  const [pesoBruto, setPesoBruto] = useState('');
  const [pesoLiquido, setPesoLiquido] = useState('');
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null);
  const [metodoPagamento, setMetodoPagamento] = useState<MetodoPagamento>('pix');
  const [pagamentoPara, setPagamentoPara] = useState<string | null>(null);
  const [dataVenda, setDataVenda] = useState(new Date());
  const [isFinalHarvest, setIsFinalHarvest] = useState(false);
  const [observacoes, setObservacoes] = useState('');
  const [showObservacoes, setShowObservacoes] = useState(false);
  const [selectedCaixaPerfilId, setSelectedCaixaPerfilId] = useState('');

  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [novoClienteNome, setNovoClienteNome] = useState('');
  const [salvandoNovoCliente, setSalvandoNovoCliente] = useState(false);
  const [modalCaixaVisible, setModalCaixaVisible] = useState(false);
  const [novoCaixaNome, setNovoCaixaNome] = useState('');
  const [salvandoNovaPessoaCaixa, setSalvandoNovaPessoaCaixa] = useState(false);
  const [perfilCaixaModalVisible, setPerfilCaixaModalVisible] = useState(false);
  const [perfilCaixaNome, setPerfilCaixaNome] = useState('');
  const [perfilCaixaPesoBruto, setPerfilCaixaPesoBruto] = useState('');
  const [perfilCaixaPesoLiquido, setPerfilCaixaPesoLiquido] = useState('');
  const [editingPerfilCaixaId, setEditingPerfilCaixaId] = useState<string | null>(null);
  const [salvandoPerfilCaixa, setSalvandoPerfilCaixa] = useState(false);
  const [unlockModalVisible, setUnlockModalVisible] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [unlockReason, setUnlockReason] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [saleUnlockedByAdmin, setSaleUnlockedByAdmin] = useState(false);
  const [editAuthModalVisible, setEditAuthModalVisible] = useState(false);
  const [editPassword, setEditPassword] = useState('');
  const [editAuthorizing, setEditAuthorizing] = useState(false);
  const [isEditAuthorized, setIsEditAuthorized] = useState(false);
  const initialEditSnapshotRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: isEditMode ? 'Editar Venda' : 'Registrar Venda',
      headerRight: () => isEditMode ? (
        <TouchableOpacity onPress={handleDelete} style={{marginRight: 15}}>
          <MaterialCommunityIcons name="trash-can-outline" size={24} color={COLORS.textLight} />
        </TouchableOpacity>
      ) : null,
    });
  }, [navigation, isEditMode]);

  useEffect(() => {
    const carregarTudo = async () => {
        if (!targetId) return;

        setLoadingData(true);
        try {
            const [clientes, pessoasCaixa, plantios, estufas] = await Promise.all([
                listClientes(targetId),
                listCaixaPessoas(targetId),
                listAllPlantios(targetId),
                listEstufas(targetId)
            ]);

            setClientesList(clientes);
            setCaixaPessoas(pessoasCaixa);
            if (!pagamentoPara && pessoasCaixa.length > 0) {
              setPagamentoPara(pessoasCaixa[0].id);
            }
            const mapE: any = {};
            estufas.forEach((e: any) => mapE[e.id] = e.nome);
            setEstufasMap(mapE);

            const ativos = plantios.filter((p: any) => isEditMode || (p.status !== 'finalizado' && p.status !== 'cancelado'));
            setPlantiosDisponiveis(ativos);

            if (!selectedPlantioId && ativos.length > 0 && !isEditMode) {
                setSelectedPlantioId(ativos[0].id);
            }

            if (isEditMode) {
                let resolvedColheitaId = colheitaIdParam;
                if (!resolvedColheitaId && vendaIdParam) {
                    const vendaOrigem = await getVendaById(vendaIdParam, targetId);
                    if (!vendaOrigem) {
                      throw new Error('Venda não encontrada para edição.');
                    }
                    const isHydroSale =
                      (vendaOrigem as any).originType === 'hydro_lote' || !!(vendaOrigem as any).hydroLoteId;
                    if (isHydroSale) {
                      throw new Error('Esta venda é hidropônica e deve ser editada na tela de vendas hidropônicas.');
                    }
                    resolvedColheitaId = vendaOrigem.colheitaId || null;
                }
                if (!resolvedColheitaId) {
                  throw new Error('Venda sem colheita vinculada para edição nesta tela.');
                }

                const venda = await getColheitaById(resolvedColheitaId, targetId);
                if (venda) {
                    setEditingColheitaId(resolvedColheitaId);
                    setQuantidade(String(venda.quantidade));
                    setUnidade(venda.unidade as UnidadeColheita);
                    setPreco(venda.precoUnitario ? String(venda.precoUnitario) : '');
                    setSelectedClienteId(venda.clienteId || null);
                    const metodoVenda = (venda.metodoPagamento as MetodoPagamento) || 'pix';
                    setMetodoPagamento(metodoVenda);
                    setPagamentoPara(metodoVenda === 'prazo' ? null : (venda.pagamentoPara as string) || pessoasCaixa[0]?.id || null);
                    setSelectedPlantioId(venda.plantioId);
                    setPesoBruto(venda.pesoBruto ? String(venda.pesoBruto) : '');
                    setPesoLiquido(venda.pesoLiquido ? String(venda.pesoLiquido) : '');
                    setObservacoes(venda.observacoes || '');
                    if (venda.dataColheita) {
                        const dc = venda.dataColheita;
                        setDataVenda(dc.toDate ? dc.toDate() : new Date(dc.seconds * 1000));
                    }
                    initialEditSnapshotRef.current = buildColheitaEditSnapshot({
                      selectedPlantioId: venda.plantioId,
                      quantidade: String(venda.quantidade),
                      unidade: venda.unidade as UnidadeColheita,
                      preco: venda.precoUnitario ? String(venda.precoUnitario) : '',
                      pesoBruto: venda.pesoBruto ? String(venda.pesoBruto) : '',
                      pesoLiquido: venda.pesoLiquido ? String(venda.pesoLiquido) : '',
                      selectedClienteId: venda.clienteId || null,
                      metodoPagamento: metodoVenda,
                      pagamentoPara:
                        metodoVenda === 'prazo'
                          ? null
                          : (venda.pagamentoPara as string) || pessoasCaixa[0]?.id || null,
                      dataVenda: venda.dataColheita
                        ? venda.dataColheita.toDate
                          ? venda.dataColheita.toDate()
                          : new Date(venda.dataColheita.seconds * 1000)
                        : new Date(),
                      observacoes: venda.observacoes || '',
                    });
                } else {
                    throw new Error('Colheita vinculada à venda não encontrada.');
                }
            }
        } catch (e: any) {
            Alert.alert("Erro", e?.message || "Falha ao carregar dados.");
        } finally {
            setLoadingData(false);
        }
    };
    carregarTudo();
  }, [targetId, isEditMode, colheitaIdParam, vendaIdParam]);

  const valorTotal = useMemo(() => {
    const qtd = parseFloat(quantidade.replace(',','.')) || 0;
    const prc = parseFloat(preco.replace(',','.')) || 0;
    return qtd * prc;
  }, [quantidade, preco]);

  const precoPorKg = useMemo(() => {
    const pLiq = parseFloat(pesoLiquido.replace(',','.')) || 0;
    const prc = parseFloat(preco.replace(',','.')) || 0;
    return (unidade === 'caixas' && pLiq > 0) ? prc / pLiq : 0;
  }, [unidade, pesoLiquido, preco]);

  const loteSelecionado = useMemo(() => {
    return plantiosDisponiveis.find(p => p.id === selectedPlantioId);
  }, [selectedPlantioId, plantiosDisponiveis]);

  const caixaPerfisDisponiveis = useMemo(() => loteSelecionado?.caixaPerfis || [], [loteSelecionado]);
  const useCycleBoxProfiles = settings.useCycleBoxWeightProfiles && unidade === 'caixas' && caixaPerfisDisponiveis.length > 0;
  const selectedCaixaPerfil = useMemo(
    () => caixaPerfisDisponiveis.find((item) => item.id === selectedCaixaPerfilId) || null,
    [caixaPerfisDisponiveis, selectedCaixaPerfilId]
  );

  const hasEditChanges = useMemo(() => {
    if (!isEditMode) return true;
    if (!initialEditSnapshotRef.current) return false;
    const current = buildColheitaEditSnapshot({
      selectedPlantioId,
      quantidade,
      unidade,
      preco,
      pesoBruto,
      pesoLiquido,
      selectedClienteId,
      metodoPagamento,
      pagamentoPara,
      dataVenda,
      observacoes,
    });
    return current !== initialEditSnapshotRef.current;
  }, [
    isEditMode,
    selectedPlantioId,
    quantidade,
    unidade,
    preco,
    pesoBruto,
    pesoLiquido,
    selectedClienteId,
    metodoPagamento,
    pagamentoPara,
    dataVenda,
    observacoes,
  ]);

  const minSaleDate = useMemo(() => {
    if (!loteSelecionado?.cicloDias || loteSelecionado.cicloDias <= 0) return null;
    const base = loteSelecionado.dataPlantio || loteSelecionado.dataInicio;
    if (!base || typeof (base as any).toDate !== 'function') return null;
    const min = (base as any).toDate() as Date;
    min.setDate(min.getDate() + Number(loteSelecionado.cicloDias));
    return min;
  }, [loteSelecionado]);

  const isBeforeMinimumSaleDate = useMemo(() => {
    if (!minSaleDate) return false;
    const saleDate = new Date(dataVenda);
    saleDate.setHours(0, 0, 0, 0);
    const minDate = new Date(minSaleDate);
    minDate.setHours(0, 0, 0, 0);
    return saleDate.getTime() < minDate.getTime();
  }, [dataVenda, minSaleDate]);
  const hasPermanentCycleUnlock = !!loteSelecionado?.cicloDesbloqueadoPorAdmin;
  const isCycleUnlockedForSale = saleUnlockedByAdmin || hasPermanentCycleUnlock;
  const isCycleLockedForSale = isBeforeMinimumSaleDate && !isCycleUnlockedForSale;
  const cycleUnlockReason = saleUnlockedByAdmin ? unlockReason : loteSelecionado?.desbloqueioAdminReason || '';

  useEffect(() => {
    setSaleUnlockedByAdmin(false);
    setAdminPassword('');
    setUnlockReason('');
  }, [selectedPlantioId, dataVenda.getTime()]);

  useEffect(() => {
    if (!useCycleBoxProfiles) {
      setSelectedCaixaPerfilId((current) => (current ? '' : current));
      return;
    }

    if (!selectedCaixaPerfilId || !caixaPerfisDisponiveis.some((item) => item.id === selectedCaixaPerfilId)) {
      const nextPerfilId = caixaPerfisDisponiveis[0]?.id || '';
      setSelectedCaixaPerfilId((current) => (current === nextPerfilId ? current : nextPerfilId));
    }
  }, [useCycleBoxProfiles, caixaPerfisDisponiveis, selectedCaixaPerfilId]);

  useEffect(() => {
    if (!useCycleBoxProfiles || !selectedCaixaPerfil) return;

    const qtd = parseFloat(quantidade.replace(',', '.')) || 0;
    if (qtd <= 0) {
      setPesoBruto((current) => (current === '' ? current : ''));
      setPesoLiquido((current) => (current === '' ? current : ''));
      return;
    }

    const nextPesoBruto = String(Number((qtd * selectedCaixaPerfil.pesoBruto).toFixed(3)));
    const nextPesoLiquido = String(Number((qtd * selectedCaixaPerfil.pesoLiquido).toFixed(3)));
    setPesoBruto((current) => (current === nextPesoBruto ? current : nextPesoBruto));
    setPesoLiquido((current) => (current === nextPesoLiquido ? current : nextPesoLiquido));
  }, [useCycleBoxProfiles, selectedCaixaPerfil, quantidade]);

  useEffect(() => {
    if (!isEditMode || !settings.useCycleBoxWeightProfiles || unidade !== 'caixas') return;
    if (!caixaPerfisDisponiveis.length) return;

    const qtd = parseFloat(quantidade.replace(',', '.')) || 0;
    const bruto = parseFloat(pesoBruto.replace(',', '.')) || 0;
    const liquido = parseFloat(pesoLiquido.replace(',', '.')) || 0;
    if (qtd <= 0) return;

    const matched = caixaPerfisDisponiveis.find((perfil) => {
      const expectedBruto = Number((perfil.pesoBruto * qtd).toFixed(3));
      const expectedLiquido = Number((perfil.pesoLiquido * qtd).toFixed(3));
      return Math.abs(expectedBruto - bruto) < 0.01 && Math.abs(expectedLiquido - liquido) < 0.01;
    });

    if (matched) {
      setSelectedCaixaPerfilId((current) => (current === matched.id ? current : matched.id));
    }
  }, [isEditMode, settings.useCycleBoxWeightProfiles, unidade, caixaPerfisDisponiveis, quantidade, pesoBruto, pesoLiquido]);

  const invalidateQueries = async () => {
    if (!targetId) return;
    await invalidateVendasQueries(targetId);
  };

  const resetPerfilCaixaForm = () => {
    setPerfilCaixaNome('');
    setPerfilCaixaPesoBruto('');
    setPerfilCaixaPesoLiquido('');
    setEditingPerfilCaixaId(null);
  };

  const handleEditPerfilCaixa = (perfil: PlantioCaixaPerfil) => {
    setEditingPerfilCaixaId(perfil.id);
    setPerfilCaixaNome(perfil.nome);
    setPerfilCaixaPesoBruto(String(perfil.pesoBruto));
    setPerfilCaixaPesoLiquido(String(perfil.pesoLiquido));
  };

  const syncPlantioPerfis = (plantioId: string, nextProfiles: PlantioCaixaPerfil[]) => {
    setPlantiosDisponiveis((prev) =>
      prev.map((plantio) =>
        plantio.id === plantioId ? { ...plantio, caixaPerfis: nextProfiles } : plantio
      )
    );
  };

  const handleSavePerfilCaixa = async () => {
    if (!targetId) return;
    if (!selectedPlantioId) {
      Alert.alert('Atenção', 'Selecione o ciclo antes de cadastrar perfis de caixa.');
      return;
    }

    const nome = perfilCaixaNome.trim();
    const pesoBrutoNum = parseFloat(perfilCaixaPesoBruto.replace(',', '.'));
    const pesoLiquidoNum = parseFloat(perfilCaixaPesoLiquido.replace(',', '.'));

    if (!nome) {
      Alert.alert('Atenção', 'Digite o nome do tipo de caixa.');
      return;
    }
    if (!pesoBrutoNum || pesoBrutoNum <= 0) {
      Alert.alert('Atenção', 'Informe um peso bruto válido.');
      return;
    }
    if (!pesoLiquidoNum || pesoLiquidoNum <= 0) {
      Alert.alert('Atenção', 'Informe um peso líquido válido.');
      return;
    }

    const perfisAtuais = loteSelecionado?.caixaPerfis || [];
    const nextProfiles: PlantioCaixaPerfil[] = editingPerfilCaixaId
      ? perfisAtuais.map((perfil) =>
          perfil.id === editingPerfilCaixaId
            ? { ...perfil, nome, pesoBruto: pesoBrutoNum, pesoLiquido: pesoLiquidoNum }
            : perfil
        )
      : [
          ...perfisAtuais,
          {
            id: `perfil-${Date.now()}`,
            nome,
            pesoBruto: pesoBrutoNum,
            pesoLiquido: pesoLiquidoNum,
          },
        ];

    setSalvandoPerfilCaixa(true);
    try {
      await updatePlantio(selectedPlantioId, { caixaPerfis: nextProfiles }, targetId);
      syncPlantioPerfis(selectedPlantioId, nextProfiles);
      if (!editingPerfilCaixaId) {
        setSelectedCaixaPerfilId(nextProfiles[nextProfiles.length - 1]?.id || '');
      } else if (editingPerfilCaixaId === selectedCaixaPerfilId) {
        setSelectedCaixaPerfilId(editingPerfilCaixaId);
      }
      resetPerfilCaixaForm();
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Não foi possível salvar o perfil de caixa.');
    } finally {
      setSalvandoPerfilCaixa(false);
    }
  };

  const handleDeletePerfilCaixa = async (perfilId: string) => {
    if (!targetId || !selectedPlantioId) return;

    const perfisAtuais = loteSelecionado?.caixaPerfis || [];
    const nextProfiles = perfisAtuais.filter((perfil) => perfil.id !== perfilId);

    setSalvandoPerfilCaixa(true);
    try {
      await updatePlantio(selectedPlantioId, { caixaPerfis: nextProfiles }, targetId);
      syncPlantioPerfis(selectedPlantioId, nextProfiles);
      if (selectedCaixaPerfilId === perfilId) {
        setSelectedCaixaPerfilId(nextProfiles[0]?.id || '');
      }
      if (editingPerfilCaixaId === perfilId) {
        resetPerfilCaixaForm();
      }
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Não foi possível excluir o perfil de caixa.');
    } finally {
      setSalvandoPerfilCaixa(false);
    }
  };

  const handleDelete = () => {
    if (!targetId) return;
    if (!editingColheitaId) {
      Alert.alert('Erro', 'Não foi possível identificar a colheita desta venda.');
      return;
    }

    Alert.alert("Excluir Venda", "Deseja remover este registro permanentemente?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: async () => {
          try {
            await deleteColheita(editingColheitaId, targetId);
            await invalidateQueries();
            navigation.goBack();
          } catch (e: any) { Alert.alert("Erro", e?.message || "Falha ao excluir."); }
      }}
    ]);
  };

  const handleQuickRegisterClient = async () => {
    if (!novoClienteNome.trim()) return Alert.alert("Atenção", "Digite o nome");
    if (!targetId) return;

    setSalvandoNovoCliente(true);
    try {
        const novoId = await createCliente({
            nome: novoClienteNome.trim(),
            tipo: 'Consumidor'
        }, targetId);

        const novoCliente = { id: novoId, nome: novoClienteNome.trim() } as Cliente;
        setClientesList(prev => [...prev, novoCliente].sort((a,b) => a.nome.localeCompare(b.nome)));
        setSelectedClienteId(novoId);
        setModalVisible(false);
        setNovoClienteNome('');
        await invalidateClientesQuery(targetId);
    } catch (error) { Alert.alert("Erro", "Falha ao cadastrar."); } finally { setSalvandoNovoCliente(false); }
  };

  const handleQuickRegisterCaixaPessoa = async () => {
    if (!novoCaixaNome.trim()) return Alert.alert("Atenção", "Digite o nome");
    if (!targetId) return;

    setSalvandoNovaPessoaCaixa(true);
    try {
      const novoId = await createCaixaPessoa({ nome: novoCaixaNome.trim() }, targetId);
      const novaPessoa = { id: novoId, nome: novoCaixaNome.trim(), ativo: true } as CaixaPessoa;
      setCaixaPessoas((prev) => [...prev, novaPessoa].sort((a, b) => a.nome.localeCompare(b.nome)));
      setPagamentoPara(novoId);
      setModalCaixaVisible(false);
      setNovoCaixaNome('');
    } catch {
      Alert.alert("Erro", "Falha ao cadastrar pessoa do caixa.");
    } finally {
      setSalvandoNovaPessoaCaixa(false);
    }
  };

  const persistColheita = async (allowBeforeCycleDays = false, reason?: string) => {
      if (!targetId) return Alert.alert("Atenção", "Sua sessão expirou. Entre novamente.");
      if (!selectedPlantioId) return Alert.alert("Atenção", "Escolha o ciclo para registrar a venda.");
      if (!quantidade) return Alert.alert("Atenção", "Digite a quantidade da venda.");
      if (metodoPagamento !== 'prazo' && caixaPessoas.length > 0 && !pagamentoPara) return Alert.alert("Atenção", "Selecione quem recebeu no caixa.");

      setLoading(true);
      try {
          const plantioObj = plantiosDisponiveis.find(p => p.id === selectedPlantioId);
          const qtdNum = parseFloat(quantidade.replace(',', '.'));
          const precoNum = parseFloat(preco.replace(',', '.')) || 0;
          if (!qtdNum || qtdNum <= 0) {
            Alert.alert("Atenção", "A quantidade precisa ser maior que zero.");
            return;
          }

          const data: ColheitaFormData = {
              quantidade: qtdNum,
              unidade,
              precoUnitario: precoNum,
              clienteId: selectedClienteId,
              destino: 'venda_direta',
              metodoPagamento,
              pagamentoPara,
              registradoPor: user?.name || 'App',
              observacoes: observacoes.trim(),
              dataVenda,
              pesoBruto: parseFloat(pesoBruto.replace(',', '.')) || 0,
              pesoLiquido: parseFloat(pesoLiquido.replace(',', '.')) || 0,
              isFinalHarvest,
          };
          const shouldSaveWithCycleUnlock = isBeforeMinimumSaleDate && isCycleUnlockedForSale;

          if (isEditMode) {
              if (!editingColheitaId) {
                throw new Error('Não foi possível identificar a colheita vinculada para edição.');
              }
              await updateColheita(editingColheitaId, data, targetId, {
                allowBeforeCycleDays: allowBeforeCycleDays || shouldSaveWithCycleUnlock,
                overrideAudit: allowBeforeCycleDays
                  ? {
                      byUid: user?.uid || targetId,
                      byName: user?.name || user?.displayName || null,
                      reason: reason || null,
                    }
                  : null,
              });
          } else {
              await createColheita(data, targetId, selectedPlantioId, plantioObj!.estufaId, {
                allowBeforeCycleDays: allowBeforeCycleDays || shouldSaveWithCycleUnlock,
                overrideAudit: allowBeforeCycleDays
                  ? {
                      byUid: user?.uid || targetId,
                      byName: user?.name || user?.displayName || null,
                      reason: reason || null,
                    }
                  : null,
              });
          }

          await invalidateQueries();
          const totalVenda = (qtdNum || 0) * (precoNum || 0);
          Alert.alert(
            isEditMode ? "Venda atualizada" : "Venda registrada",
            `${qtdNum} ${unidade} • R$ ${totalVenda.toFixed(2)}${plantioObj?.codigoLote ? `\nLote: ${plantioObj.codigoLote}` : ''}`,
            [{ text: "OK", onPress: () => navigation.goBack() }]
          );
      } catch (e: any) { Alert.alert("Erro", e.message || "Não consegui salvar a venda. Tente novamente."); } finally { setLoading(false); }
  };

  const handleUnlockWithAdmin = async () => {
    if (!adminPassword.trim()) {
      Alert.alert('Atenção', 'Digite a senha de administrador.');
      return;
    }
    if (!unlockReason.trim()) {
      Alert.alert('Atenção', 'Informe o motivo do desbloqueio.');
      return;
    }
    if (!targetId || !selectedPlantioId) {
      Alert.alert('Atenção', 'Escolha o ciclo para desbloquear.');
      return;
    }

    setUnlocking(true);
    try {
      const valid = await verifyCurrentUserPassword(adminPassword.trim());
      if (!valid) {
        Alert.alert('Senha inválida', 'A senha de administrador está incorreta.');
        return;
      }
      const reason = unlockReason.trim();
      const unlockPayload = await unlockPlantioCycleForEarlySale(selectedPlantioId, targetId, {
        byUid: user?.uid || targetId,
        byName: user?.name || user?.displayName || null,
        reason,
      });
      setPlantiosDisponiveis(prev =>
        prev.map(plantio =>
          plantio.id === selectedPlantioId
            ? { ...plantio, ...unlockPayload }
            : plantio
        )
      );
      
      // Ao desbloquear com admin, ja autorizamos a edicao tambem para evitar segundo prompt
      setIsEditAuthorized(true);
      setSaleUnlockedByAdmin(true);
      setUnlockModalVisible(false);
      setAdminPassword('');
      setUnlockReason(reason);
      
      // Salva direto apos autorizacao de admin
      await persistColheita(true, reason);
    } catch {
      Alert.alert('Erro', 'Não foi possível desbloquear o ciclo.');
    } finally {
      setUnlocking(false);
    }
  };

  const handleSave = async () => {
    // 1. Prioridade: Se o ciclo esta bloqueado, usamos o modal de desbloqueio (pede senha + motivo)
    // Esse modal agora tambem autoriza a edicao se for o caso.
    if (isCycleLockedForSale) {
      if (!canDeleteEstufa) {
        Alert.alert(
          'Venda bloqueada',
          `Este ciclo só permite venda a partir de ${minSaleDate?.toLocaleDateString('pt-BR')}.`
        );
        return;
      }
      setAdminPassword('');
      setUnlockReason('');
      setUnlockModalVisible(true);
      return;
    }

    // 2. Se nao esta bloqueado pelo ciclo, mas eh edicao e ainda nao autorizou
    if (isEditMode && !isEditAuthorized) {
      if (!hasEditChanges) {
        Alert.alert('Sem alteracoes', 'Altere algum campo para salvar a venda.');
        return;
      }
      setEditPassword('');
      setEditAuthModalVisible(true);
      return;
    }

    // 3. Se ja passou pelas autorizacoes necessarias
    await persistColheita(isBeforeMinimumSaleDate && saleUnlockedByAdmin, unlockReason);
  };

  if (loadingData) return <ActivityIndicator size="large" color={COLORS.primary} style={{flex:1}} />;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: (settings.uiV2Enabled ? 138 : 30) + insets.bottom },
        ]}
      >

        <View style={styles.card}>
            <Text style={styles.sectionHeader}>Origem e Destino</Text>

            <Text style={styles.label}>Produto (Lote de Plantio)</Text>
            <View style={[styles.pickerWrapper, isEditMode && styles.disabledPicker]}>
                <Picker selectedValue={selectedPlantioId} onValueChange={setSelectedPlantioId} enabled={!isEditMode} style={styles.picker}>
                    {plantiosDisponiveis.map(p => (
                        <Picker.Item
                          key={p.id}
                          label={`[${p.codigoLote || 'S/ LOTE'}] ${p.cultura} - Estufa: ${estufasMap[p.estufaId] || '?'}`}
                          value={p.id}
                        />
                    ))}
                </Picker>
            </View>

            {loteSelecionado && (
              <View style={styles.rastreioBox}>
                <MaterialCommunityIcons name="shield-check" size={20} color={COLORS.textLight} />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={styles.rastreioTitle}>Lote de Origem Rastreado</Text>
                  <Text style={styles.rastreioText}>Código: {loteSelecionado.codigoLote || 'Não informado'}</Text>
                  <Text style={styles.rastreioText}>Variedade: {loteSelecionado.variedade || 'Padrão'}</Text>
                </View>
              </View>
            )}

            <Text style={[styles.label, {marginTop: 15}]}>Cliente / Destino</Text>
            <View style={styles.rowAlign}>
                <View style={styles.pickerWrapper}>
                    <Picker selectedValue={selectedClienteId} onValueChange={setSelectedClienteId} style={styles.picker}>
                        <Picker.Item label="Venda Avulsa / Consumidor Final" value={null} />
                        {clientesList.map(c => <Picker.Item key={c.id} label={c.nome} value={c.id} />)}
                    </Picker>
                </View>
                <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
                    <MaterialCommunityIcons name="account-plus" size={24} color={COLORS.textLight} />
                </TouchableOpacity>
            </View>

            <Text style={[styles.label, {marginTop: 15}]}>Data da Colheita/Venda</Text>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
                <MaterialCommunityIcons name="calendar" size={24} color={COLORS.primary} />
                <Text style={styles.dateText}>{dataVenda.toLocaleDateString('pt-BR')}</Text>
            </TouchableOpacity>
            {minSaleDate ? (
              <Text style={styles.infoText}>
                Data mínima para venda deste ciclo: {minSaleDate.toLocaleDateString('pt-BR')}
              </Text>
            ) : null}
            {showDatePicker && (
              <DateTimePicker
                value={dataVenda}
                mode="date"
                display="default"
                minimumDate={!canDeleteEstufa ? minSaleDate || undefined : undefined}
                onChange={(e, d) => { setShowDatePicker(false); if(d) setDataVenda(d); }}
              />
            )}
            {isCycleLockedForSale ? (
              <View style={styles.lockBox}>
                <Text style={styles.lockTitle}>Venda bloqueada por ciclo mínimo</Text>
                <Text style={styles.lockText}>
                  Defina uma data igual ou superior a {minSaleDate?.toLocaleDateString('pt-BR')} ou solicite desbloqueio.
                </Text>
                {canDeleteEstufa ? (
                  <TouchableOpacity
                    style={styles.unlockBtn}
                    onPress={() => {
                      setAdminPassword('');
                      setUnlockReason('');
                      setUnlockModalVisible(true);
                    }}
                  >
                    <Text style={styles.unlockBtnText}>Desbloquear ciclo permanente</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.lockText}>Somente administrador pode desbloquear.</Text>
                )}
              </View>
            ) : null}
            {isBeforeMinimumSaleDate && isCycleUnlockedForSale ? (
              <View style={styles.unlockOkBox}>
                <Text style={styles.unlockOkText}>
                  Ciclo desbloqueado permanentemente para venda antecipada.
                  {cycleUnlockReason ? ` Motivo: ${cycleUnlockReason}` : ''}
                </Text>
              </View>
            ) : null}
        </View>

        <View style={[styles.card, isCycleLockedForSale && styles.lockedCard]}>
            <Text style={styles.sectionHeader}>Quantidade e Pesagem</Text>
            <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={styles.label}>Quantidade</Text>
                    <TextInput style={styles.input} keyboardType="numeric" value={quantidade} onChangeText={(value) => setQuantidade(sanitizeDecimalInput(value))} placeholder="0" editable={!isCycleLockedForSale} />
                </View>
                <View style={{ width: 110 }}>
                    <Text style={styles.label}>Unidade</Text>
                    <View style={styles.pickerWrapper}>
                        <Picker selectedValue={unidade} onValueChange={(val: any) => setUnidade(val)} style={styles.picker} enabled={!isCycleLockedForSale}>
                            <Picker.Item label="CX" value="caixas" />
                            <Picker.Item label="KG" value="kg" />
                            <Picker.Item label="UN" value="un" />
                        </Picker>
                    </View>
                </View>
            </View>

            {unidade === 'caixas' && (
                <>
                    {useCycleBoxProfiles ? (
                      <>
                        <Text style={styles.label}>Tipo de Caixa do Ciclo</Text>
                        <View style={styles.pickerWrapper}>
                          <Picker selectedValue={selectedCaixaPerfilId} onValueChange={(val: any) => setSelectedCaixaPerfilId(String(val || ''))} style={styles.picker} enabled={!isCycleLockedForSale}>
                            {caixaPerfisDisponiveis.map((perfil) => (
                              <Picker.Item key={perfil.id} label={`${perfil.nome} - B ${perfil.pesoBruto}kg - L ${perfil.pesoLiquido}kg`} value={perfil.id} />
                            ))}
                          </Picker>
                        </View>
                        {selectedCaixaPerfil ? (
                          <View style={styles.infoRow}>
                            <MaterialCommunityIcons name="archive-outline" size={20} color={COLORS.primary} />
                            <Text style={styles.infoText}>Perfil: {selectedCaixaPerfil.nome}. Pesos calculados automaticamente pela quantidade.</Text>
                          </View>
                        ) : null}
                        <TouchableOpacity
                          style={styles.secondaryBtn}
                          onPress={() => setPerfilCaixaModalVisible(true)}
                          disabled={!selectedPlantioId}
                        >
                          <MaterialCommunityIcons name="archive-cog-outline" size={18} color={COLORS.primary} />
                          <Text style={styles.secondaryBtnText}>Gerenciar perfis deste ciclo</Text>
                        </TouchableOpacity>
                      </>
                    ) : null}
                    {settings.useCycleBoxWeightProfiles && !caixaPerfisDisponiveis.length ? (
                      <>
                        <View style={styles.infoRow}>
                          <MaterialCommunityIcons name="information-outline" size={20} color={COLORS.primary} />
                          <Text style={styles.infoText}>Este ciclo ainda não tem perfis de caixa. Cadastre aqui para calcular os pesos automaticamente.</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.secondaryBtn}
                          onPress={() => setPerfilCaixaModalVisible(true)}
                          disabled={!selectedPlantioId}
                        >
                          <MaterialCommunityIcons name="plus-circle-outline" size={18} color={COLORS.primary} />
                          <Text style={styles.secondaryBtnText}>Cadastrar perfis deste ciclo</Text>
                        </TouchableOpacity>
                      </>
                    ) : null}
                    <View style={[styles.row, useCycleBoxProfiles && styles.hiddenRow]}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={styles.label}>P. Bruto (kg)</Text>
                        <TextInput style={[styles.input, useCycleBoxProfiles && styles.inputAuto]} keyboardType="numeric" value={pesoBruto} onChangeText={(value) => setPesoBruto(sanitizeDecimalInput(value))} placeholder="0.00" editable={!isCycleLockedForSale && !useCycleBoxProfiles} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.label}>P. Líquido (kg)</Text>
                        <TextInput style={[styles.input, useCycleBoxProfiles && styles.inputAuto]} keyboardType="numeric" value={pesoLiquido} onChangeText={(value) => setPesoLiquido(sanitizeDecimalInput(value))} placeholder="0.00" editable={!isCycleLockedForSale && !useCycleBoxProfiles} />
                    </View>
                </View>
                {useCycleBoxProfiles ? (
                  <View style={styles.weightSummaryCard}>
                    <View style={styles.weightSummaryItem}>
                      <Text style={styles.weightSummaryLabel}>Peso bruto total</Text>
                      <Text style={styles.weightSummaryValue}>{pesoBruto || '0'} kg</Text>
                    </View>
                    <View style={styles.weightSummaryDivider} />
                    <View style={styles.weightSummaryItem}>
                      <Text style={styles.weightSummaryLabel}>Peso liquido total</Text>
                      <Text style={styles.weightSummaryValue}>{pesoLiquido || '0'} kg</Text>
                    </View>
                  </View>
                ) : null}
                </>
            )}

            <Text style={styles.label}>Preço Unitário (R$)</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={preco} onChangeText={(value) => setPreco(sanitizeDecimalInput(value))} placeholder="0.00" editable={!isCycleLockedForSale} />

            {unidade === 'caixas' && precoPorKg > 0 && (
                <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="scale" size={20} color={COLORS.primary} />
                    <Text style={styles.infoText}>Preço p/ Kg: R$ {precoPorKg.toFixed(2)}</Text>
                </View>
            )}

            <View style={styles.totalContainer}>
                <Text style={styles.totalLabel}>TOTAL DA VENDA</Text>
                <Text style={styles.totalValue}>R$ {valorTotal.toFixed(2)}</Text>
            </View>

            <TouchableOpacity
              style={styles.observacoesToggle}
              onPress={() => setShowObservacoes((current) => !current)}
              activeOpacity={0.85}
            >
              <View style={styles.observacoesToggleLeft}>
                <MaterialCommunityIcons
                  name={observacoes.trim() ? 'text-box-check-outline' : 'text-box-plus-outline'}
                  size={18}
                  color={COLORS.primary}
                />
                <Text style={styles.observacoesToggleText}>
                  {showObservacoes
                    ? 'Ocultar observação'
                    : observacoes.trim()
                      ? 'Ver observação'
                      : 'Adicionar observação'}
                </Text>
              </View>
              <MaterialCommunityIcons
                name={showObservacoes ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>

            {showObservacoes ? (
              <>
                <Text style={[styles.label, {marginTop: 12}]}>Observações (Ex: Pepino Torto, Qualidade B, etc)</Text>
                <TextInput
                  style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]}
                  value={observacoes}
                  onChangeText={setObservacoes}
                  placeholder="Descreva o motivo da variação de preço ou observação do lote..."
                  editable={!isCycleLockedForSale}
                  multiline
                />
              </>
            ) : null}
        </View>

        <View style={[styles.card, isCycleLockedForSale && styles.lockedCard]}>
            <Text style={styles.sectionHeader}>Pagamento</Text>
            <View style={styles.pickerWrapper}>
                <Picker selectedValue={metodoPagamento} onValueChange={(val: any) => { setMetodoPagamento(val); if (val === 'prazo') setPagamentoPara(null); }} style={styles.picker} enabled={!isCycleLockedForSale}>
                    <Picker.Item label="Pix" value="pix" />
                    <Picker.Item label="Dinheiro" value="dinheiro" />
                    <Picker.Item label="Boleto" value="boleto" />
                    <Picker.Item label="A Prazo" value="prazo" />
                    <Picker.Item label="Cartão" value="cartao" />
                    <Picker.Item label="Outro" value="outro" />
                </Picker>
            </View>

            {metodoPagamento !== 'prazo' ? (
              <>
                <Text style={[styles.label, {marginTop: 15}]}>Recebido por (Caixa)</Text>
                <View style={styles.rowAlign}>
                    <View style={styles.pickerWrapper}>
                        <Picker selectedValue={pagamentoPara} onValueChange={setPagamentoPara} style={styles.picker} enabled={!isCycleLockedForSale}>
                            <Picker.Item label="Selecione uma pessoa..." value={null} />
                            {caixaPessoas.map((pessoa) => <Picker.Item key={pessoa.id} label={pessoa.nome} value={pessoa.id} />)}
                        </Picker>
                    </View>
                    <TouchableOpacity style={styles.addBtn} onPress={() => setModalCaixaVisible(true)}>
                        <MaterialCommunityIcons name="account-plus" size={24} color={COLORS.textLight} />
                    </TouchableOpacity>
                </View>
              </>
            ) : null}

            {!isEditMode && (
              <View style={styles.finalHarvestRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Esta é a colheita final (encerrar ciclo)?</Text>
                  <Text style={styles.finalHarvestHint}>
                    Se desligado, o plantio permanece em colheita para novos lançamentos.
                  </Text>
                </View>
                <Switch
                  value={isFinalHarvest}
                  onValueChange={setIsFinalHarvest}
                  disabled={isCycleLockedForSale}
                  trackColor={{ false: COLORS.border, true: COLORS.primary }}
                  thumbColor={COLORS.textLight}
                />
              </View>
            )}
        </View>

        {!isEditMode || hasEditChanges ? (
          <TouchableOpacity style={[styles.saveBtn, isCycleLockedForSale && styles.saveBtnDisabled]} onPress={handleSave} disabled={loading || isCycleLockedForSale}>
              {loading ? <ActivityIndicator color={COLORS.textLight} /> : <Text style={styles.saveText}>{isCycleLockedForSale ? 'Desbloqueie para continuar' : isEditMode ? 'Salvar Alteracoes' : 'Confirmar Venda'}</Text>}
          </TouchableOpacity>
        ) : (
          <Text style={[styles.finalHarvestHint, { textAlign: 'center', marginBottom: 20 }]}>Sem alteracoes para salvar.</Text>
        )}

      </ScrollView>

      <Modal animationType="fade" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Novo Cliente</Text>
            <TextInput style={styles.input} placeholder="Nome do Cliente (Destino)" value={novoClienteNome} onChangeText={setNovoClienteNome} autoFocus />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={{color: COLORS.textSecondary}}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleQuickRegisterClient} style={styles.modalBtn}>
                {salvandoNovoCliente ? <ActivityIndicator color={COLORS.textLight} /> : <Text style={{color: COLORS.textLight, fontWeight: 'bold'}}>Salvar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal animationType="fade" transparent visible={modalCaixaVisible} onRequestClose={() => setModalCaixaVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nova Pessoa do Caixa</Text>
            <TextInput style={styles.input} placeholder="Nome da pessoa" value={novoCaixaNome} onChangeText={setNovoCaixaNome} autoFocus />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setModalCaixaVisible(false)}><Text style={{color: COLORS.textSecondary}}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleQuickRegisterCaixaPessoa} style={styles.modalBtn}>
                {salvandoNovaPessoaCaixa ? <ActivityIndicator color={COLORS.textLight} /> : <Text style={{color: COLORS.textLight, fontWeight: 'bold'}}>Salvar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent
        visible={perfilCaixaModalVisible}
        onRequestClose={() => {
          setPerfilCaixaModalVisible(false);
          resetPerfilCaixaForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.largeModalContent]}>
            <Text style={styles.modalTitle}>Perfis de Caixa do Ciclo</Text>
            <Text style={styles.unlockText}>
              Cadastre aqui os pesos por tipo de caixa para este ciclo. A venda pode continuar manual quando essa opção estiver desligada nas configurações.
            </Text>

            <Text style={styles.label}>Nome do tipo de caixa</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Caixa 22kg"
              value={perfilCaixaNome}
              onChangeText={setPerfilCaixaNome}
            />

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.label}>Peso Bruto por Caixa</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  keyboardType="numeric"
                  value={perfilCaixaPesoBruto}
                  onChangeText={(value) => setPerfilCaixaPesoBruto(sanitizeDecimalInput(value))}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Peso Líquido por Caixa</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  keyboardType="numeric"
                  value={perfilCaixaPesoLiquido}
                  onChangeText={(value) => setPerfilCaixaPesoLiquido(sanitizeDecimalInput(value))}
                />
              </View>
            </View>

            <View style={styles.profileModalActions}>
              <TouchableOpacity
                style={styles.modalBtn}
                onPress={handleSavePerfilCaixa}
                disabled={salvandoPerfilCaixa}
              >
                {salvandoPerfilCaixa ? (
                  <ActivityIndicator color={COLORS.textLight} />
                ) : (
                  <Text style={{ color: COLORS.textLight, fontWeight: 'bold' }}>
                    {editingPerfilCaixaId ? 'Atualizar' : 'Salvar Perfil'}
                  </Text>
                )}
              </TouchableOpacity>
              {editingPerfilCaixaId ? (
                <TouchableOpacity onPress={resetPerfilCaixaForm} disabled={salvandoPerfilCaixa}>
                  <Text style={{ color: COLORS.textSecondary }}>Cancelar edição</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <ScrollView style={styles.profileList} showsVerticalScrollIndicator={false}>
              {caixaPerfisDisponiveis.map((perfil) => (
                <View key={perfil.id} style={styles.profileCard}>
                  <Text style={styles.profileTitle}>{perfil.nome}</Text>
                  <Text style={styles.profileMeta}>
                    Bruto: {perfil.pesoBruto} kg • Líquido: {perfil.pesoLiquido} kg
                  </Text>
                  <View style={styles.profileActionsRow}>
                    <TouchableOpacity onPress={() => handleEditPerfilCaixa(perfil)} disabled={salvandoPerfilCaixa}>
                      <Text style={styles.profileActionText}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() =>
                        Alert.alert('Excluir perfil', 'Deseja remover este perfil de caixa?', [
                          { text: 'Cancelar', style: 'cancel' },
                          { text: 'Excluir', style: 'destructive', onPress: () => handleDeletePerfilCaixa(perfil.id) },
                        ])
                      }
                      disabled={salvandoPerfilCaixa}
                    >
                      <Text style={[styles.profileActionText, styles.profileDeleteText]}>Excluir</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              {!caixaPerfisDisponiveis.length ? (
                <Text style={styles.emptyProfilesText}>Nenhum perfil cadastrado para este ciclo.</Text>
              ) : null}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => {
                  setPerfilCaixaModalVisible(false);
                  resetPerfilCaixaForm();
                }}
                disabled={salvandoPerfilCaixa}
              >
                <Text style={{ color: COLORS.textSecondary }}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal animationType="fade" transparent visible={unlockModalVisible} onRequestClose={() => setUnlockModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Desbloquear Ciclo Permanentemente</Text>
            <Text style={styles.unlockText}>
              A data escolhida é anterior ao ciclo mínimo. Confirme com senha de administrador para liberar vendas antecipadas neste ciclo.
            </Text>
            <TextInput
              style={[styles.input, { minHeight: 72, textAlignVertical: 'top' }]}
              placeholder="Motivo do desbloqueio (obrigatório)"
              value={unlockReason}
              onChangeText={setUnlockReason}
              multiline
            />
            <TextInput
              style={styles.input}
              placeholder="Senha de administrador"
              value={adminPassword}
              onChangeText={setAdminPassword}
              secureTextEntry
              autoCapitalize="none"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => {
                  setUnlockModalVisible(false);
                  setAdminPassword('');
                  setUnlockReason('');
                }}
                disabled={unlocking}
              >
                <Text style={{color: COLORS.textSecondary}}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleUnlockWithAdmin} style={styles.modalBtn} disabled={unlocking}>
                {unlocking ? <ActivityIndicator color={COLORS.textLight} /> : <Text style={{color: COLORS.textLight, fontWeight: 'bold'}}>Desbloquear</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal animationType="fade" transparent visible={editAuthModalVisible} onRequestClose={() => setEditAuthModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirmar edição da venda</Text>
            <Text style={styles.unlockText}>Digite a senha do app para autorizar a alteração desta venda.</Text>
            <TextInput
              style={styles.input}
              placeholder="Senha"
              value={editPassword}
              onChangeText={setEditPassword}
              secureTextEntry
              autoCapitalize="none"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setEditAuthModalVisible(false)} disabled={editAuthorizing}>
                <Text style={{color: COLORS.textSecondary}}>Cancelar</Text>
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
                      Alert.alert('Senha invalida', 'A senha informada esta incorreta.');
                      return;
                    }
                    setIsEditAuthorized(true);
                    setEditAuthModalVisible(false);
                    // Salva direto para evitar o delay do estado assincrono que faria o handleSave abrir o modal de novo
                    await persistColheita(isCycleUnlockedForSale, cycleUnlockReason);
                  } finally {
                    setEditAuthorizing(false);
                  }
                }}
              >
                {editAuthorizing ? <ActivityIndicator color={COLORS.textLight} /> : <Text style={{color: COLORS.textLight, fontWeight: 'bold'}}>Autorizar</Text>}
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
  scrollContent: { padding: 20 },
  card: { backgroundColor: COLORS.surface, borderRadius: 15, padding: 18, marginBottom: 15, elevation: 2 },
  sectionHeader: { fontSize: 14, fontWeight: 'bold', color: COLORS.primary, marginBottom: 12, textTransform: 'uppercase' },
  label: { fontSize: 12, color: COLORS.textPrimary, marginBottom: 5, fontWeight: '600' },
  input: { backgroundColor: COLORS.surface, borderRadius: 8, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border, color: COLORS.textPrimary, fontWeight: 'bold' },
  inputAuto: { backgroundColor: COLORS.surfaceMuted, opacity: 0.9 },
  dateButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, padding: 12, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  dateText: { marginLeft: 10, fontWeight: 'bold', color: COLORS.textPrimary },
  row: { flexDirection: 'row' },
  rowAlign: { flexDirection: 'row', alignItems: 'center' },
  pickerWrapper: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, height: 50, justifyContent: 'center' },
  disabledPicker: { opacity: 0.6, backgroundColor: COLORS.disabledBg },
  picker: { color: COLORS.textPrimary },
  addBtn: { width: 50, height: 50, backgroundColor: COLORS.primary, borderRadius: 8, marginLeft: 10, justifyContent: 'center', alignItems: 'center' },
  secondaryBtn: { minHeight: 44, borderRadius: 10, borderWidth: 1, borderColor: COLORS.primary, backgroundColor: COLORS.surface, paddingHorizontal: 12, marginBottom: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  secondaryBtnText: { color: COLORS.primary, fontWeight: '800', fontSize: 13 },
  rastreioBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, padding: 10, borderRadius: 8, marginTop: 10, borderWidth: 1, borderColor: COLORS.c86EFAC },
  rastreioTitle: { fontSize: 12, fontWeight: 'bold', color: COLORS.primary },
  rastreioText: { fontSize: 11, color: COLORS.c15803D },
  infoRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cF0FDF4, padding: 12, borderRadius: 8, marginBottom: 15 },
  infoText: { marginLeft: 8, color: COLORS.primary, fontWeight: 'bold' },
  hiddenRow: { display: 'none' },
  weightSummaryCard: { flexDirection: 'row', alignItems: 'stretch', backgroundColor: COLORS.surfaceMuted, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 },
  weightSummaryItem: { flex: 1, paddingHorizontal: 12, paddingVertical: 14 },
  weightSummaryLabel: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700', marginBottom: 4 },
  weightSummaryValue: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '800' },
  weightSummaryDivider: { width: 1, backgroundColor: COLORS.border },
  observacoesToggle: {
    marginTop: 18,
    marginBottom: 4,
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  observacoesToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  observacoesToggleText: { color: COLORS.primary, fontWeight: '800', fontSize: 13 },
  lockBox: { backgroundColor: COLORS.alertSoft, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: COLORS.warning, marginBottom: 12 },
  lockTitle: { color: COLORS.alertText, fontWeight: '800', marginBottom: 4 },
  lockText: { color: COLORS.alertText, fontSize: 12, marginBottom: 6 },
  unlockBtn: { alignSelf: 'flex-start', backgroundColor: COLORS.warning, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  unlockBtnText: { color: COLORS.textLight, fontWeight: '800', fontSize: 12 },
  unlockOkBox: { backgroundColor: COLORS.successSoft, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: COLORS.success, marginBottom: 12 },
  unlockOkText: { color: COLORS.success, fontWeight: '700', fontSize: 12 },
  lockedCard: { opacity: 0.55 },
  totalContainer: { alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.divider, paddingTop: 15 },
  totalLabel: { fontSize: 11, color: COLORS.textPrimary, fontWeight: 'bold' },
  totalValue: { fontSize: 24, fontWeight: 'bold', color: COLORS.primary },
  finalHarvestRow: { marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: COLORS.border, flexDirection: 'row', alignItems: 'center', gap: 12 },
  finalHarvestHint: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  saveBtn: { backgroundColor: COLORS.primary, height: 58, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 30 },
  saveBtnDisabled: { backgroundColor: COLORS.disabledBg },
  saveText: { color: COLORS.textLight, fontWeight: 'bold', fontSize: 17 },
  modalOverlay: { flex: 1, backgroundColor: COLORS.rgba00005, justifyContent: 'center', padding: 30 },
  modalContent: { backgroundColor: COLORS.surface, borderRadius: 15, padding: 20 },
  largeModalContent: { maxHeight: '85%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  unlockText: { color: COLORS.textSecondary, marginBottom: 12, lineHeight: 18 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20, alignItems: 'center' },
  modalBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  profileModalActions: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12 },
  profileList: { marginTop: 6, marginBottom: 12 },
  profileCard: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, marginBottom: 10, backgroundColor: COLORS.surface },
  profileTitle: { fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
  profileMeta: { color: COLORS.textSecondary, fontSize: 12, marginBottom: 8 },
  profileActionsRow: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  profileActionText: { color: COLORS.primary, fontWeight: '700' },
  profileDeleteText: { color: COLORS.danger },
  emptyProfilesText: { color: COLORS.textSecondary, textAlign: 'center', marginVertical: 12 }
});

export default ColheitaFormScreen;
