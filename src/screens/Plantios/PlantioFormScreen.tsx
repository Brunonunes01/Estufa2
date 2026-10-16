import React, { useState, useEffect, useLayoutEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import {
  createPlantio,
  updatePlantio,
  getPlantioById,
  deletePlantioSafely,
  removeFieldCycle,
} from '../../services/plantioService';
import {
  COLORS,
  RADIUS,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from '../../constants/theme';
import { Timestamp } from '../../lib/timestamp';
import { invalidatePlantioQueries } from '../../lib/queryInvalidation';
import { verifyCurrentUserPassword } from '../../services/securityService';
import { resolveServiceErrorMessage } from '../../services/securityUiHelpers';
import { useMutation } from '@tanstack/react-query';
import { useAppSettings } from '../../hooks/useAppSettings';
import { useTalhoesListData } from '../../hooks/queries/useTalhoesListData';
import {
  sanitizeDecimalInput,
  sanitizeIntegerInput,
} from '../../utils/numericFields';
import { PlantioCaixaPerfil } from '../../types/domain';

type UnidadeQuantidadePlantio =
  | 'Mudas'
  | 'Sementes'
  | 'Bandejas'
  | 'Gramas'
  | 'Kg';

const UNIDADE_QUANTIDADE_OPTIONS: UnidadeQuantidadePlantio[] = [
  'Mudas',
  'Sementes',
  'Bandejas',
  'Gramas',
  'Kg',
];
const MUDAS_POR_BANDEJA_OPTIONS = [128, 200, 288];

const FormSectionHeader = ({
  icon,
  eyebrow,
  title,
  description,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  eyebrow: string;
  title: string;
  description?: string;
}) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionIcon}>
      <MaterialCommunityIcons name={icon} size={20} color={COLORS.primary} />
    </View>
    <View style={styles.sectionHeaderText}>
      <Text style={styles.sectionEyebrow}>{eyebrow}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
      {description ? (
        <Text style={styles.sectionDescription}>{description}</Text>
      ) : null}
    </View>
  </View>
);

const normalizeUnidadeQuantidade = (
  value?: string | null
): UnidadeQuantidadePlantio => {
  const raw = (value || '').trim().toLowerCase();
  if (raw === 'sementes') return 'Sementes';
  if (raw === 'bandejas') return 'Bandejas';
  if (raw === 'gramas') return 'Gramas';
  if (raw === 'kg' || raw === 'quilo' || raw === 'quilos') return 'Kg';
  return 'Mudas';
};

const PlantioFormScreen = ({ route, navigation }: any) => {
  const { user, selectedTenantId, isOwner } = useAuth();
  const { settings } = useAppSettings();
  const insets = useSafeAreaInsets();
  const targetId = selectedTenantId || user?.uid;

  const estufaId = route.params?.estufaId;
  const talhaoId = route.params?.talhaoId;
  const editingId = route.params?.plantioId;
  const isEditMode = !!editingId;
  const [loadedEstufaId, setLoadedEstufaId] = useState<string | undefined>(
    estufaId
  );
  const resolvedEstufaId = estufaId || loadedEstufaId;
  const [selectedTalhaoId, setSelectedTalhaoId] = useState<string>(
    talhaoId || ''
  );
  const { data: talhoesData = [], isLoading: isLoadingTalhoes } =
    useTalhoesListData(targetId);
  const activeTalhoes = useMemo(
    () => talhoesData.filter((talhao) => talhao.status !== 'inativo'),
    [talhoesData]
  );
  const selectedTalhao = talhoesData.find(
    (talhao) => talhao.id === selectedTalhaoId
  );
  const selectableTalhoes =
    selectedTalhao?.status === 'inativo'
      ? [selectedTalhao, ...activeTalhoes]
      : activeTalhoes;
  const isFieldFlow = !resolvedEstufaId;

  const [codigoLote, setCodigoLote] = useState('');
  const [cultura, setCultura] = useState('');
  const [variedade, setVariedade] = useState('');
  const [origemSemente, setOrigemSemente] = useState('');

  const [quantidadePlantada, setQuantidadePlantada] = useState('');
  const [unidadeQuantidade, setUnidadeQuantidade] =
    useState<UnidadeQuantidadePlantio>('Mudas');
  const [quantidadeBandejas, setQuantidadeBandejas] = useState('');
  const [mudasPorBandeja, setMudasPorBandeja] = useState('');
  const [precoUnidade, setPrecoUnidade] = useState('');
  const [omitPlantingQuantity, setOmitPlantingQuantity] = useState(false);

  const [cicloDias, setCicloDias] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [caixaPerfis, setCaixaPerfis] = useState<PlantioCaixaPerfil[]>([]);
  const [caixaPerfilNome, setCaixaPerfilNome] = useState('');
  const [caixaPerfilPesoBruto, setCaixaPerfilPesoBruto] = useState('');
  const [caixaPerfilPesoLiquido, setCaixaPerfilPesoLiquido] = useState('');
  const [editingCaixaPerfilId, setEditingCaixaPerfilId] = useState<
    string | null
  >(null);

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const invalidateQueries = async () => {
    if (!targetId) return;
    await invalidatePlantioQueries(targetId, resolvedEstufaId);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!resolvedEstufaId && !selectedTalhaoId) {
      newErrors.talhao = 'Selecione em qual talhão este ciclo será plantado.';
    }
    if (!cultura.trim()) {
      newErrors.cultura = 'Informe a cultura.';
    }
    const requiresPlantingQuantity = !(
      isFieldFlow && omitPlantingQuantity
    );
    if (
      requiresPlantingQuantity &&
      !quantidadePlantada.trim() &&
      unidadeQuantidade !== 'Bandejas'
    ) {
      newErrors.quantidade = 'Informe a quantidade plantada.';
    }
    if (requiresPlantingQuantity && unidadeQuantidade === 'Bandejas') {
      const bandejas = parseFloat(quantidadeBandejas.replace(',', '.')) || 0;
      const mudas = parseFloat(mudasPorBandeja.replace(',', '.')) || 0;
      if (bandejas <= 0 || mudas <= 0) {
        newErrors.bandejas = 'Informe a qtd de bandejas e mudas por bandeja.';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const mutation = useMutation({
    mutationFn: async (plantioData: any) => {
      if (!targetId) {
        throw new Error('Sua sessão expirou. Entre novamente.');
      }
      if (isEditMode && editingId) {
        await updatePlantio(editingId as string, plantioData, targetId);
      } else {
        await createPlantio(plantioData, targetId);
      }
    },
    onSuccess: async (_data, variables) => {
      await invalidateQueries();
      const custoEstimadoValue = variables.custoEstimadoInicial || 0;
      const plantingSummary =
        variables.quantidadePlantada == null
          ? 'Quantidade plantada não informada'
          : `${variables.quantidadePlantada} ${variables.unidadeQuantidade}`;
      Alert.alert(
        isEditMode ? 'Ciclo atualizado' : 'Ciclo criado',
        `${variables.cultura} • ${plantingSummary}${custoEstimadoValue > 0 ? `\nCusto inicial: R$ ${custoEstimadoValue.toFixed(2)}` : ''}`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    },
    onError: (error: unknown) => {
      Alert.alert(
        'Erro',
        resolveServiceErrorMessage(
          error,
          'Não consegui salvar o ciclo. Tente novamente.'
        )
      );
    },
  });

  useLayoutEffect(() => {
    navigation.setOptions({
      title: isEditMode ? 'Editar ciclo' : 'Novo ciclo',
      headerRight: () =>
        isEditMode ? (
          <TouchableOpacity onPress={handleDelete} style={{ marginRight: 15 }}>
            <MaterialCommunityIcons
              name="trash-can-outline"
              size={24}
              color={COLORS.textLight}
            />
          </TouchableOpacity>
        ) : null,
    });
  }, [navigation, isEditMode, isOwner]);

  useEffect(() => {
    if (isEditMode && editingId) {
      loadPlantio(editingId as string);
    } else {
      gerarCodigoLote();
    }
  }, [editingId, targetId]);

  const gerarCodigoLote = () => {
    const dataAtual = new Date();
    const ano = dataAtual.getFullYear();
    const mes = String(dataAtual.getMonth() + 1).padStart(2, '0');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    setCodigoLote(`LT-${ano}${mes}-${randomSuffix}`);
  };

  const loadPlantio = async (id: string) => {
    if (!targetId) return;

    try {
      const data = await getPlantioById(id, targetId);
      if (data) {
        setLoadedEstufaId(data.estufaId);
        setSelectedTalhaoId(data.talhaoId || '');
        setCodigoLote(data.codigoLote || '');
        setCultura(data.cultura || '');
        setVariedade(data.variedade || '');
        setOrigemSemente(data.origemSemente || '');
        setQuantidadePlantada(data.quantidadePlantada?.toString() || '');
        setUnidadeQuantidade(
          normalizeUnidadeQuantidade(data.unidadeQuantidade)
        );
        setQuantidadeBandejas(data.quantidadeBandejas?.toString() || '');
        setMudasPorBandeja(data.mudasPorBandeja?.toString() || '');
        setPrecoUnidade(data.precoEstimadoUnidade?.toString() || '');
        setOmitPlantingQuantity(
          !!data.talhaoId &&
            !(Number(data.quantidadePlantada || 0) > 0) &&
            !(Number(data.quantidadeBandejas || 0) > 0)
        );
        setCicloDias(data.cicloDias?.toString() || '');
        setObservacoes(data.observacoes || '');
        setCaixaPerfis(data.caixaPerfis || []);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Não foi possível carregar os dados do plantio.');
    }
  };

  const handleCancelPlantio = async () => {
    if (!targetId || !editingId) return;
    try {
      await updatePlantio(
        editingId as string,
        { status: 'cancelado' },
        targetId
      );
      await invalidateQueries();
      navigation.goBack();
    } catch {
      Alert.alert('Erro', 'Falha ao cancelar o lote.');
    }
  };

  const handleDelete = () => {
    if (!targetId) return;

    if (!isOwner) {
      Alert.alert(
        'Exclusão restrita',
        'Somente o proprietário pode excluir um ciclo permanentemente. Você ainda pode cancelar o lote e preservar o histórico.',
        [
          { text: 'Voltar', style: 'cancel' },
          {
            text: 'Cancelar Lote',
            style: 'destructive',
            onPress: handleCancelPlantio,
          },
        ]
      );
      return;
    }

    Alert.alert(
      'Ações do Ciclo',
      'A exclusão permanente também apaga vendas, colheitas, aplicações, manejos, tarefas e despesas deste ciclo. A senha do proprietário será solicitada.',
      [
        { text: 'Voltar', style: 'cancel' },
        {
          text: 'Cancelar Lote',
          style: 'destructive',
          onPress: handleCancelPlantio,
        },
        {
          text: 'Excluir Definitivamente',
          style: 'destructive',
          onPress: () => {
            setAdminPassword('');
            setDeleteModalVisible(true);
          },
        },
      ]
    );
  };

  const handleConfirmHardDelete = async () => {
    if (!targetId || !editingId) return;
    if (!isOwner) {
      Alert.alert(
        'Ação restrita',
        'Somente o proprietário pode excluir ciclos permanentemente.'
      );
      return;
    }
    if (!adminPassword.trim()) {
      Alert.alert('Atenção', 'Digite a senha do proprietário.');
      return;
    }

    setDeleting(true);
    try {
      const valid = await verifyCurrentUserPassword(adminPassword.trim());
      if (!valid) {
        Alert.alert(
          'Senha inválida',
          'A senha do proprietário está incorreta.'
        );
        return;
      }

      let successMessage = 'O ciclo foi excluído definitivamente.';
      if (selectedTalhaoId) {
        const result = await removeFieldCycle(editingId, targetId);
        const deletedOperationalRecords =
          result.deletedVendas +
          result.deletedColheitas +
          result.deletedAplicacoes +
          result.deletedManejos +
          result.deletedTarefas +
          result.deletedOperationalDespesas;
        successMessage = result.hadHistory
          ? `O ciclo e ${deletedOperationalRecords} registro(s) do histórico foram excluídos permanentemente.${
              result.restoredInsumos > 0
                ? ` O estoque de ${result.restoredInsumos} insumo(s) foi recomposto.`
                : ''
            }`
          : 'O ciclo vazio foi excluído definitivamente.';
      } else {
        await deletePlantioSafely(editingId, targetId);
      }

      setDeleteModalVisible(false);
      setAdminPassword('');
      await invalidateQueries();
      navigation.goBack();
      Alert.alert('Ciclo excluído', successMessage);
    } catch (error: unknown) {
      Alert.alert(
        'Falha na remoção',
        error instanceof Error
          ? error.message
          : 'Não foi possível excluir o ciclo.'
      );
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    if (omitPlantingQuantity || unidadeQuantidade !== 'Bandejas') return;

    const bandejas = parseFloat(quantidadeBandejas.replace(',', '.'));
    const mudas = parseFloat(mudasPorBandeja.replace(',', '.'));
    if (!isNaN(bandejas) && bandejas > 0 && !isNaN(mudas) && mudas > 0) {
      setQuantidadePlantada(String(bandejas * mudas));
    }
  }, [
    omitPlantingQuantity,
    unidadeQuantidade,
    quantidadeBandejas,
    mudasPorBandeja,
  ]);

  const custoEstimado = useMemo(() => {
    if (isFieldFlow && omitPlantingQuantity) return 0;
    const preco = parseFloat(precoUnidade.replace(',', '.')) || 0;
    if (preco <= 0) return 0;

    if (unidadeQuantidade === 'Bandejas') {
      const bandejas = parseFloat(quantidadeBandejas.replace(',', '.')) || 0;
      return bandejas * preco;
    }

    const qtd = parseFloat(quantidadePlantada.replace(',', '.')) || 0;
    return qtd * preco;
  }, [
    isFieldFlow,
    omitPlantingQuantity,
    precoUnidade,
    unidadeQuantidade,
    quantidadeBandejas,
    quantidadePlantada,
  ]);

  const resetCaixaPerfilForm = () => {
    setCaixaPerfilNome('');
    setCaixaPerfilPesoBruto('');
    setCaixaPerfilPesoLiquido('');
    setEditingCaixaPerfilId(null);
  };

  const handleSaveCaixaPerfil = () => {
    const nome = caixaPerfilNome.trim();
    const pesoBruto = parseFloat(caixaPerfilPesoBruto.replace(',', '.')) || 0;
    const pesoLiquido =
      parseFloat(caixaPerfilPesoLiquido.replace(',', '.')) || 0;

    if (!nome) {
      Alert.alert('Atenção', 'Informe o nome do tipo de caixa.');
      return;
    }
    if (pesoBruto <= 0 || pesoLiquido <= 0) {
      Alert.alert('Atenção', 'Informe pesos válidos para bruto e líquido.');
      return;
    }
    if (pesoLiquido > pesoBruto) {
      Alert.alert(
        'Atenção',
        'O peso líquido não pode ser maior que o peso bruto.'
      );
      return;
    }

    const nextPerfil: PlantioCaixaPerfil = {
      id: editingCaixaPerfilId || `cx_${Date.now()}`,
      nome,
      pesoBruto,
      pesoLiquido,
    };

    setCaixaPerfis((current) => {
      const filtered = current.filter((item) => item.id !== nextPerfil.id);
      return [...filtered, nextPerfil].sort((a, b) =>
        a.nome.localeCompare(b.nome)
      );
    });
    resetCaixaPerfilForm();
  };

  const handleEditCaixaPerfil = (perfil: PlantioCaixaPerfil) => {
    setEditingCaixaPerfilId(perfil.id);
    setCaixaPerfilNome(perfil.nome);
    setCaixaPerfilPesoBruto(String(perfil.pesoBruto));
    setCaixaPerfilPesoLiquido(String(perfil.pesoLiquido));
  };

  const handleDeleteCaixaPerfil = (perfilId: string) => {
    setCaixaPerfis((current) => current.filter((item) => item.id !== perfilId));
    if (editingCaixaPerfilId === perfilId) {
      resetCaixaPerfilForm();
    }
  };

  const handleSave = () => {
    if (!targetId)
      return Alert.alert('Atenção', 'Sua sessão expirou. Entre novamente.');

    if (!validateForm()) {
      return;
    }

    const qtdNum = parseFloat(quantidadePlantada.replace(',', '.')) || 0;
    const precoUnidadeNum = parseFloat(precoUnidade.replace(',', '.')) || 0;
    const quantidadeBandejasNum =
      unidadeQuantidade === 'Bandejas'
        ? parseFloat(quantidadeBandejas.replace(',', '.')) || null
        : null;
    const mudasPorBandejaNum =
      unidadeQuantidade === 'Bandejas'
        ? parseFloat(mudasPorBandeja.replace(',', '.')) || null
        : null;
    const cicloNum = parseInt(cicloDias) || 0;
    const shouldOmitPlantingQuantity =
      isFieldFlow && omitPlantingQuantity;

    let previsaoData = null;
    const dataPlantioTimestamp = Timestamp.now();

    if (cicloNum > 0 && !isEditMode) {
      const dataPrevista = new Date();
      dataPrevista.setDate(dataPrevista.getDate() + cicloNum);
      previsaoData = Timestamp.fromDate(dataPrevista);
    }

    const plantioData = {
      estufaId: resolvedEstufaId,
      talhaoId: selectedTalhaoId || undefined,
      codigoLote,
      cultura,
      variedade,
      origemSemente,
      quantidadePlantada: shouldOmitPlantingQuantity ? null : qtdNum,
      quantidadeBandejas: shouldOmitPlantingQuantity
        ? null
        : quantidadeBandejasNum,
      mudasPorBandeja: shouldOmitPlantingQuantity
        ? null
        : mudasPorBandejaNum,
      unidadeQuantidade: shouldOmitPlantingQuantity
        ? null
        : unidadeQuantidade,
      precoEstimadoUnidade: shouldOmitPlantingQuantity
        ? null
        : precoUnidadeNum > 0
          ? precoUnidadeNum
          : null,
      unidadePrecoEstimado: shouldOmitPlantingQuantity
        ? null
        : precoUnidadeNum > 0
          ? unidadeQuantidade
          : null,
      custoEstimadoInicial: shouldOmitPlantingQuantity
        ? null
        : precoUnidadeNum > 0
          ? custoEstimado
          : null,
      cicloDias: cicloNum > 0 ? cicloNum : null,
      observacoes,
      caixaPerfis,
      ...(!isEditMode && {
        dataPlantio: dataPlantioTimestamp,
        dataInicio: dataPlantioTimestamp,
        status: 'em_desenvolvimento' as const,
        previsaoColheita: previsaoData,
        dataPrevisaoColheita: previsaoData,
      }),
    };

    mutation.mutate(plantioData);
  };

  if (
    isFieldFlow &&
    !isEditMode &&
    !talhaoId &&
    !isLoadingTalhoes &&
    activeTalhoes.length === 0
  ) {
    return (
      <View style={styles.prerequisiteContainer}>
        <View style={styles.prerequisiteIcon}>
          <MaterialCommunityIcons
            name="map-marker-plus-outline"
            size={38}
            color={COLORS.primary}
          />
        </View>
        <Text style={styles.prerequisiteEyebrow}>ANTES DO PRIMEIRO CICLO</Text>
        <Text style={styles.prerequisiteTitle}>Crie um talhão primeiro</Text>
        <Text style={styles.prerequisiteText}>
          O talhão identifica onde a cultura será plantada e mantém todo o
          histórico do ciclo organizado.
        </Text>
        <View style={styles.prerequisiteFlow}>
          <View style={styles.prerequisiteStepActive}>
            <Text style={styles.prerequisiteStepNumberActive}>1</Text>
            <Text style={styles.prerequisiteStepTextActive}>Talhão</Text>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={22}
            color={COLORS.textSecondary}
          />
          <View style={styles.prerequisiteStep}>
            <Text style={styles.prerequisiteStepNumber}>2</Text>
            <Text style={styles.prerequisiteStepText}>Ciclo</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.prerequisiteButton}
          onPress={() => navigation.replace('TalhaoForm')}
        >
          <MaterialCommunityIcons
            name="plus-circle-outline"
            size={21}
            color={COLORS.textLight}
          />
          <Text style={styles.prerequisiteButtonText}>Criar meu talhão</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.padding,
          {
            paddingBottom:
              (settings.uiV2Enabled ? 138 : SPACING.xl) + insets.bottom,
          },
        ]}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroIcon}>
              <MaterialCommunityIcons
                name="sprout-outline"
                size={28}
                color={COLORS.textLight}
              />
            </View>
            <View style={styles.heroContent}>
              <Text style={styles.heroEyebrow}>
                {isEditMode
                  ? 'EDIÇÃO DO CICLO'
                  : isFieldFlow
                    ? 'ETAPA 2 DE 2'
                    : 'NOVO CICLO'}
              </Text>
              <Text style={styles.heroTitle}>
                {isEditMode
                  ? 'Atualize o ciclo'
                  : isFieldFlow
                    ? 'Agora crie o ciclo'
                    : 'Novo ciclo da estufa'}
              </Text>
              <Text style={styles.heroSubtitle}>
                {isFieldFlow
                  ? selectedTalhao?.nome
                    ? `Plantio vinculado ao talhão ${selectedTalhao.nome}`
                    : 'Escolha o talhão e informe os dados do plantio.'
                  : 'Informe a cultura, a quantidade e a previsão do ciclo.'}
              </Text>
            </View>
          </View>

          {isFieldFlow ? (
            <View style={styles.flowRow}>
              <View style={styles.flowStepDone}>
                <MaterialCommunityIcons
                  name="check"
                  size={14}
                  color={COLORS.primary}
                />
                <Text style={styles.flowStepDoneText}>1. Talhão</Text>
              </View>
              <View style={styles.flowLine} />
              <View style={styles.flowStepActive}>
                <Text style={styles.flowStepActiveNumber}>2</Text>
                <Text style={styles.flowStepActiveText}>Ciclo</Text>
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.formCard}>
          <FormSectionHeader
            icon="leaf-circle-outline"
            eyebrow="IDENTIFICAÇÃO"
            title="Onde e o que será plantado"
            description="Os campos com * são obrigatórios."
          />

          {isFieldFlow ? (
            <View style={styles.originBlock}>
              <View style={styles.originLabelRow}>
                <Text style={styles.label}>Talhão do ciclo *</Text>
                <TouchableOpacity
                  style={styles.inlineAction}
                  onPress={() => navigation.navigate('TalhaoForm')}
                >
                  <MaterialCommunityIcons
                    name="plus"
                    size={16}
                    color={COLORS.primary}
                  />
                  <Text style={styles.inlineActionText}>Novo talhão</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.pickerWrapperRequired}>
                <MaterialCommunityIcons
                  name="map-marker-outline"
                  size={20}
                  color={COLORS.primary}
                  style={styles.pickerLeadingIcon}
                />
                <Picker
                  selectedValue={selectedTalhaoId}
                  onValueChange={(value) => {
                    setSelectedTalhaoId(String(value || ''));
                    if (errors.talhao) setErrors((e) => ({ ...e, talhao: '' }));
                  }}
                  style={styles.pickerWithIcon}
                >
                  <Picker.Item label="Selecione um talhão" value="" />
                  {selectableTalhoes.map((talhao) => (
                    <Picker.Item
                      key={talhao.id}
                      label={talhao.nome}
                      value={talhao.id}
                    />
                  ))}
                </Picker>
              </View>
              {errors.talhao ? <Text style={styles.errorText}>{errors.talhao}</Text> : null}
              <Text style={styles.originHint}>
                O histórico deste ciclo ficará organizado dentro do talhão
                selecionado.
              </Text>
            </View>
          ) : (
            <View style={styles.originSummary}>
              <View style={styles.originSummaryIcon}>
                <MaterialCommunityIcons
                  name="greenhouse"
                  size={22}
                  color={COLORS.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.originSummaryLabel}>LOCAL DO CICLO</Text>
                <Text style={styles.originSummaryTitle}>
                  Estufa selecionada
                </Text>
              </View>
              <MaterialCommunityIcons
                name="check-circle"
                size={22}
                color={COLORS.success}
              />
            </View>
          )}

          <View style={styles.loteContainer}>
            <Text style={styles.loteLabel}>
              CÓDIGO DO LOTE • GERADO AUTOMATICAMENTE
            </Text>
            <TextInput
              style={styles.loteInput}
              value={codigoLote}
              editable={false}
              selectTextOnFocus={false}
            />
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 5 }}>
              <Text style={styles.label}>Cultura *</Text>
              <TextInput
                style={[styles.input, errors.cultura ? styles.inputError : null]}
                value={cultura}
                onChangeText={(val) => {
                  setCultura(val);
                  if (errors.cultura) setErrors((e) => ({ ...e, cultura: '' }));
                }}
                placeholder="Ex: Tomate"
                placeholderTextColor={COLORS.textPlaceholder}
              />
              {errors.cultura ? <Text style={styles.errorText}>{errors.cultura}</Text> : null}
            </View>
            <View style={{ flex: 1, marginLeft: 5 }}>
              <Text style={styles.label}>Variedade</Text>
              <TextInput
                style={styles.input}
                value={variedade}
                onChangeText={setVariedade}
                placeholder="Ex: Italiano"
                placeholderTextColor={COLORS.textPlaceholder}
              />
            </View>
          </View>

          <Text style={styles.label}>Origem da Semente / Muda</Text>
          <TextInput
            style={styles.input}
            value={origemSemente}
            onChangeText={setOrigemSemente}
            placeholder="Ex: Viveiro X, Lote Fornecedor Y"
            placeholderTextColor={COLORS.textPlaceholder}
          />
        </View>

        <View style={styles.formCard}>
          <FormSectionHeader
            icon="sprout"
            eyebrow="PLANTIO"
            title="Quantidade, custo e duração"
            description="Defina como este ciclo começa e a previsão de conclusão."
          />

          {isFieldFlow ? (
            <TouchableOpacity
              style={[
                styles.omitQuantityOption,
                omitPlantingQuantity && styles.omitQuantityOptionActive,
              ]}
              onPress={() => {
                setOmitPlantingQuantity((current) => !current);
                setErrors((current) => ({
                  ...current,
                  quantidade: '',
                  bandejas: '',
                }));
              }}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: omitPlantingQuantity }}
            >
              <MaterialCommunityIcons
                name={
                  omitPlantingQuantity
                    ? 'checkbox-marked-circle'
                    : 'checkbox-blank-circle-outline'
                }
                size={24}
                color={
                  omitPlantingQuantity
                    ? COLORS.primary
                    : COLORS.textSecondary
                }
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.omitQuantityTitle}>
                  Não informar quantidade plantada
                </Text>
                <Text style={styles.omitQuantityDescription}>
                  Use quando ainda não souber a quantidade de pés, mudas,
                  sementes ou bandejas deste ciclo.
                </Text>
              </View>
            </TouchableOpacity>
          ) : null}

          {isFieldFlow && omitPlantingQuantity ? (
            <View style={styles.omittedQuantityBox}>
              <MaterialCommunityIcons
                name="information-outline"
                size={20}
                color={COLORS.info}
              />
              <Text style={styles.omittedQuantityText}>
                A quantidade ficará como não informada. Indicadores por
                pé/muda serão exibidos somente depois que o ciclo for editado
                e a quantidade preenchida.
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 5 }}>
              <Text style={styles.label}>Quantidade *</Text>
              <TextInput
                style={[styles.input, errors.quantidade ? styles.inputError : null]}
                value={quantidadePlantada}
                onChangeText={(value) => {
                  setQuantidadePlantada(sanitizeIntegerInput(value));
                  if (errors.quantidade) setErrors((e) => ({ ...e, quantidade: '' }));
                }}
                placeholder="Ex: 500"
                placeholderTextColor={COLORS.textPlaceholder}
                keyboardType="numeric"
                editable={unidadeQuantidade !== 'Bandejas'}
              />
              {errors.quantidade ? <Text style={styles.errorText}>{errors.quantidade}</Text> : null}
            </View>
            <View style={{ flex: 1, marginLeft: 5 }}>
              <Text style={styles.label}>Unidade</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={unidadeQuantidade}
                  onValueChange={(value) =>
                    setUnidadeQuantidade(value as UnidadeQuantidadePlantio)
                  }
                  style={styles.picker}
                >
                  {UNIDADE_QUANTIDADE_OPTIONS.map((option) => (
                    <Picker.Item key={option} label={option} value={option} />
                  ))}
                </Picker>
              </View>
              {errors.bandejas ? (
                <Text style={styles.errorText}>{errors.bandejas}</Text>
              ) : null}
            </View>
              </View>

              {unidadeQuantidade === 'Bandejas' && (
                <View style={styles.bandejaBox}>
              <Text style={styles.bandejaHint}>
                Informe quantas bandejas foram usadas e quantas células/mudas
                existem em cada bandeja.
              </Text>

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 5 }}>
                  <Text style={styles.label}>Quantidade de Bandejas *</Text>
                  <TextInput
                    style={[styles.input, errors.bandejas ? styles.inputError : null]}
                    value={quantidadeBandejas}
                    onChangeText={(value) => {
                      setQuantidadeBandejas(sanitizeIntegerInput(value));
                      if (errors.bandejas) setErrors((e) => ({ ...e, bandejas: '' }));
                    }}
                    placeholder="Ex: 10 bandejas"
                    placeholderTextColor={COLORS.textPlaceholder}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 5 }}>
                  <Text style={styles.label}>Células/Mudas por Bandeja *</Text>
                  <TextInput
                    style={[styles.input, errors.bandejas ? styles.inputError : null]}
                    value={mudasPorBandeja}
                    onChangeText={(value) => {
                      setMudasPorBandeja(sanitizeIntegerInput(value));
                      if (errors.bandejas) setErrors((e) => ({ ...e, bandejas: '' }));
                    }}
                    placeholder="Ex: 128"
                    placeholderTextColor={COLORS.textPlaceholder}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <Text style={styles.label}>Sugestões de células por bandeja</Text>
              <View style={styles.chipRow}>
                {MUDAS_POR_BANDEJA_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={styles.chip}
                    onPress={() => setMudasPorBandeja(String(option))}
                  >
                    <Text style={styles.chipText}>{option}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.bandejaHintStrong}>
                Quantidade total de mudas = bandejas × células por bandeja
                (calculado automaticamente).
              </Text>
                </View>
              )}

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
              <Text style={styles.label}>
                {unidadeQuantidade === 'Bandejas'
                  ? 'Preço por Bandeja (R$)'
                  : unidadeQuantidade === 'Mudas'
                    ? 'Preço por Muda (R$)'
                    : 'Preço por Unidade (R$)'}
              </Text>
              <TextInput
                style={styles.input}
                value={precoUnidade}
                onChangeText={(value) =>
                  setPrecoUnidade(sanitizeDecimalInput(value))
                }
                placeholder="Ex: 1,50"
                placeholderTextColor={COLORS.textPlaceholder}
                keyboardType="numeric"
              />
              <Text style={styles.costText}>
                Custo estimado inicial: R$ {custoEstimado.toFixed(2)}
              </Text>
                </View>
              </View>
            </>
          )}

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Ciclo Est. (Dias)</Text>
              <TextInput
                style={styles.input}
                value={cicloDias}
                onChangeText={(value) =>
                  setCicloDias(sanitizeIntegerInput(value))
                }
                placeholder="Ex: 90"
                placeholderTextColor={COLORS.textPlaceholder}
                keyboardType="numeric"
              />
            </View>
          </View>
          <Text style={styles.hint}>
            Além deste custo inicial de mudas/bandejas, os demais custos do
            ciclo vêm de aplicações e despesas vinculadas.
          </Text>
        </View>

        {settings.useCycleBoxWeightProfiles && !isFieldFlow ? (
          <View style={styles.formCard}>
            <FormSectionHeader
              icon="package-variant-closed"
              eyebrow="COLHEITA E VENDA"
              title="Perfis de caixa"
            />
            <Text style={styles.hint}>
              Cadastre um ou mais tipos de caixa com peso bruto e líquido por
              caixa. Na venda, o vendedor escolhe o perfil e o app calcula os
              pesos automaticamente.
            </Text>

            <Text style={styles.label}>Nome do tipo de caixa</Text>
            <TextInput
              style={styles.input}
              value={caixaPerfilNome}
              onChangeText={setCaixaPerfilNome}
              placeholder="Ex: Caixa 22 kg"
              placeholderTextColor={COLORS.textPlaceholder}
            />

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 5 }}>
                <Text style={styles.label}>Peso Bruto por Caixa (kg)</Text>
                <TextInput
                  style={styles.input}
                  value={caixaPerfilPesoBruto}
                  onChangeText={(value) =>
                    setCaixaPerfilPesoBruto(sanitizeDecimalInput(value))
                  }
                  placeholder="Ex: 23,5"
                  placeholderTextColor={COLORS.textPlaceholder}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1, marginLeft: 5 }}>
                <Text style={styles.label}>Peso Líquido por Caixa (kg)</Text>
                <TextInput
                  style={styles.input}
                  value={caixaPerfilPesoLiquido}
                  onChangeText={(value) =>
                    setCaixaPerfilPesoLiquido(sanitizeDecimalInput(value))
                  }
                  placeholder="Ex: 22"
                  placeholderTextColor={COLORS.textPlaceholder}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.profileActionsRow}>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={handleSaveCaixaPerfil}
              >
                <MaterialCommunityIcons
                  name={
                    editingCaixaPerfilId
                      ? 'content-save-edit-outline'
                      : 'plus-circle-outline'
                  }
                  size={18}
                  color={COLORS.primary}
                />
                <Text style={styles.secondaryBtnText}>
                  {editingCaixaPerfilId
                    ? 'Atualizar Perfil'
                    : 'Adicionar Perfil'}
                </Text>
              </TouchableOpacity>
              {editingCaixaPerfilId ? (
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={resetCaixaPerfilForm}
                >
                  <MaterialCommunityIcons
                    name="close-circle-outline"
                    size={18}
                    color={COLORS.primary}
                  />
                  <Text style={styles.secondaryBtnText}>Cancelar Edicao</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {caixaPerfis.length > 0 ? (
              <View style={styles.profileList}>
                {caixaPerfis.map((perfil) => (
                  <View key={perfil.id} style={styles.profileCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.profileTitle}>{perfil.nome}</Text>
                      <Text style={styles.profileMeta}>
                        Bruto: {perfil.pesoBruto.toFixed(2)} kg • Líquido:{' '}
                        {perfil.pesoLiquido.toFixed(2)} kg
                      </Text>
                    </View>
                    <View style={styles.profileActionButtons}>
                      <TouchableOpacity
                        onPress={() => handleEditCaixaPerfil(perfil)}
                      >
                        <MaterialCommunityIcons
                          name="pencil-outline"
                          size={20}
                          color={COLORS.primary}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteCaixaPerfil(perfil.id)}
                      >
                        <MaterialCommunityIcons
                          name="trash-can-outline"
                          size={20}
                          color={COLORS.danger}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.hint}>
                Nenhum perfil de caixa cadastrado neste ciclo.
              </Text>
            )}
          </View>
        ) : null}

        <View style={styles.formCard}>
          <FormSectionHeader
            icon="text-box-outline"
            eyebrow="DETALHES FINAIS"
            title="Observações"
          />

          <Text style={styles.label}>Anotações sobre este ciclo</Text>
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
            value={observacoes}
            onChangeText={setObservacoes}
            placeholder="Condições climáticas no dia, tipo de adubação de base..."
            placeholderTextColor={COLORS.textPlaceholder}
            multiline
          />
        </View>

        <TouchableOpacity
          style={styles.btn}
          onPress={handleSave}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <ActivityIndicator color={COLORS.textLight} />
          ) : (
            <View style={styles.btnContent}>
              <MaterialCommunityIcons
                name={
                  isEditMode ? 'content-save-outline' : 'check-circle-outline'
                }
                size={22}
                color={COLORS.textLight}
              />
              <Text style={styles.btnText}>
                {isEditMode ? 'Salvar alterações' : 'Criar ciclo'}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {isEditMode ? (
          <TouchableOpacity
            style={styles.secondaryDangerBtn}
            onPress={handleDelete}
            disabled={mutation.isPending || deleting}
          >
            <MaterialCommunityIcons
              name="trash-can-outline"
              size={18}
              color={COLORS.danger}
            />
            <Text style={styles.secondaryDangerText}>
              Ações do ciclo (cancelar/excluir)
            </Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Excluir Ciclo Definitivamente</Text>
            <Text style={styles.modalText}>
              Esta ação é irreversível e apagará o ciclo e todo o histórico
              vinculado. Digite a senha do proprietário para confirmar.
            </Text>
            <TextInput
              style={styles.modalInput}
              value={adminPassword}
              onChangeText={setAdminPassword}
              placeholder="Senha do proprietário"
              placeholderTextColor={COLORS.textPlaceholder}
              secureTextEntry
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => setDeleteModalVisible(false)}
                disabled={deleting}
              >
                <Text style={styles.modalBtnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtnDelete}
                onPress={handleConfirmHardDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator color={COLORS.textLight} />
                ) : (
                  <Text style={styles.modalBtnDeleteText}>
                    Excluir permanentemente
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  padding: { padding: SPACING.md },

  prerequisiteContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prerequisiteIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryLight,
    marginBottom: SPACING.md,
  },
  prerequisiteEyebrow: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.1,
    marginBottom: 8,
  },
  prerequisiteTitle: {
    color: COLORS.textDark,
    fontSize: 25,
    fontWeight: '900',
    textAlign: 'center',
  },
  prerequisiteText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    maxWidth: 360,
    marginTop: 8,
  },
  prerequisiteFlow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: SPACING.xl,
  },
  prerequisiteStepActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.pill,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  prerequisiteStepNumberActive: {
    color: COLORS.textLight,
    backgroundColor: COLORS.primary,
    width: 21,
    height: 21,
    borderRadius: 11,
    textAlign: 'center',
    lineHeight: 21,
    fontSize: 11,
    fontWeight: '900',
  },
  prerequisiteStepTextActive: { color: COLORS.primary, fontWeight: '900' },
  prerequisiteStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.pill,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  prerequisiteStepNumber: {
    color: COLORS.textSecondary,
    fontWeight: '900',
    fontSize: 12,
  },
  prerequisiteStepText: { color: COLORS.textSecondary, fontWeight: '800' },
  prerequisiteButton: {
    minHeight: 54,
    minWidth: 240,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    ...SHADOWS.card,
  },
  prerequisiteButtonText: {
    color: COLORS.textLight,
    fontSize: 16,
    fontWeight: '900',
  },

  heroCard: {
    backgroundColor: COLORS.secondary,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContent: { flex: 1 },
  heroEyebrow: {
    color: COLORS.primaryLight,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 3,
  },
  heroTitle: {
    color: COLORS.textLight,
    fontSize: 21,
    fontWeight: '900',
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  flowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  flowStepDone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.pill,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  flowStepDoneText: { color: COLORS.primary, fontSize: 11, fontWeight: '900' },
  flowLine: {
    flex: 1,
    height: 2,
    marginHorizontal: 8,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  flowStepActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  flowStepActiveNumber: {
    width: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 19,
    fontSize: 10,
    fontWeight: '900',
  },
  flowStepActiveText: {
    color: COLORS.textLight,
    fontSize: 11,
    fontWeight: '900',
  },

  formCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  omitQuantityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceMuted,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  omitQuantityOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  omitQuantityTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  omitQuantityDescription: {
    color: COLORS.textSecondary,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  omittedQuantityBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.infoSoft,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.infoSoft,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  omittedQuantityText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    marginBottom: SPACING.md,
  },
  sectionIcon: {
    width: 39,
    height: 39,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryLight,
  },
  sectionHeaderText: { flex: 1 },
  sectionEyebrow: {
    color: COLORS.primary,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.9,
    marginBottom: 2,
  },

  loteContainer: {
    backgroundColor: COLORS.infoSoft,
    padding: 15,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.info,
    marginBottom: 12,
  },
  loteLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 5,
    textAlign: 'center',
  },
  loteInput: {
    fontSize: TYPOGRAPHY.h3,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    letterSpacing: 1,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.textDark,
  },
  sectionDescription: {
    color: COLORS.textSecondary,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  originBlock: {
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    padding: 12,
    marginBottom: SPACING.md,
  },
  originLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inlineAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingBottom: 5,
  },
  inlineActionText: { color: COLORS.primary, fontSize: 12, fontWeight: '900' },
  pickerWrapperRequired: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
  },
  pickerLeadingIcon: { marginLeft: 12 },
  pickerWithIcon: { flex: 1, color: COLORS.textDark },
  originHint: {
    color: COLORS.textSecondary,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 7,
  },
  originSummary: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    padding: 12,
    marginBottom: SPACING.md,
  },
  originSummaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  originSummaryLabel: {
    color: COLORS.primary,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  originSummaryTitle: {
    color: COLORS.textDark,
    fontSize: 14,
    fontWeight: '900',
    marginTop: 2,
  },
  label: {
    fontWeight: 'bold',
    marginBottom: 5,
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  input: {
    backgroundColor: COLORS.surfaceMuted,
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 15,
    color: COLORS.textDark,
    fontWeight: '600',
  },
  inputError: {
    borderColor: COLORS.danger,
    backgroundColor: COLORS.dangerSoft || '#fef2f2',
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 11,
    fontWeight: '700',
    marginTop: -10,
    marginBottom: 12,
  },
  pickerWrapper: {
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 15,
    height: 54,
    justifyContent: 'center',
  },
  picker: { color: COLORS.textDark },
  bandejaBox: {
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 15,
  },
  bandejaHint: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 10 },
  bandejaHintStrong: {
    fontSize: 12,
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginTop: 4,
  },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  chipText: { color: COLORS.textPrimary, fontWeight: '700', fontSize: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  hint: {
    fontSize: 12,
    color: COLORS.textPrimary,
    marginTop: -10,
    marginBottom: 15,
    fontStyle: 'italic',
  },
  costText: {
    fontSize: 13,
    color: COLORS.success,
    fontWeight: '700',
    marginTop: -8,
    marginBottom: 15,
  },
  secondaryBtn: {
    minHeight: 44,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
  },
  secondaryBtnText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  profileActionsRow: { gap: 10 },
  profileList: { marginTop: 12, gap: 8 },
  profileCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.md,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  profileTitle: { color: COLORS.textPrimary, fontWeight: '800', fontSize: 13 },
  profileMeta: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  profileActionButtons: { flexDirection: 'row', alignItems: 'center', gap: 12 },

  btn: {
    backgroundColor: COLORS.primary,
    height: 58,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 20,
    ...SHADOWS.card,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  btnText: { color: COLORS.textLight, fontWeight: '800', fontSize: 17 },
  secondaryDangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.danger,
    backgroundColor: COLORS.dangerBg,
    marginBottom: 20,
  },
  secondaryDangerText: { color: COLORS.danger, fontWeight: '800' },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.rgba00006,
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    ...SHADOWS.card,
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.h3,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  modalText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginBottom: SPACING.md,
  },
  modalInput: {
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 12,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surfaceMuted,
    marginBottom: SPACING.md,
  },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalBtnCancel: {
    flex: 1,
    height: 44,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBtnCancelText: { color: COLORS.textSecondary, fontWeight: '700' },
  modalBtnDelete: {
    flex: 1,
    height: 44,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.danger,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBtnDeleteText: { color: COLORS.textLight, fontWeight: '800' },
});

export default PlantioFormScreen;
