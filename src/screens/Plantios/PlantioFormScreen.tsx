import React, { useState, useEffect, useLayoutEffect, useMemo } from 'react';
import { 
  View, Text, TextInput, ScrollView, StyleSheet, 
  TouchableOpacity, Alert, ActivityIndicator, Modal
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { createPlantio, updatePlantio, getPlantioById, deletePlantioSafely } from '../../services/plantioService';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/theme';
import { Timestamp } from '../../lib/timestamp'; 
import { invalidatePlantioQueries } from '../../lib/queryInvalidation';
import { verifyCurrentUserPassword } from '../../services/securityService';
import { useMutation } from '@tanstack/react-query';
import { useAppSettings } from '../../hooks/useAppSettings';
import { useTalhoesListData } from '../../hooks/queries/useTalhoesListData';
import { sanitizeDecimalInput, sanitizeIntegerInput } from '../../utils/numericFields';
import { PlantioCaixaPerfil } from '../../types/domain';

type UnidadeQuantidadePlantio = 'Mudas' | 'Sementes' | 'Bandejas' | 'Gramas' | 'Kg';

const UNIDADE_QUANTIDADE_OPTIONS: UnidadeQuantidadePlantio[] = ['Mudas', 'Sementes', 'Bandejas', 'Gramas', 'Kg'];
const MUDAS_POR_BANDEJA_OPTIONS = [128, 200, 288];

const normalizeUnidadeQuantidade = (value?: string | null): UnidadeQuantidadePlantio => {
  const raw = (value || '').trim().toLowerCase();
  if (raw === 'sementes') return 'Sementes';
  if (raw === 'bandejas') return 'Bandejas';
  if (raw === 'gramas') return 'Gramas';
  if (raw === 'kg' || raw === 'quilo' || raw === 'quilos') return 'Kg';
  return 'Mudas';
};

const PlantioFormScreen = ({ route, navigation }: any) => {
  const { user, selectedTenantId, canDeleteEstufa } = useAuth();
  const { settings } = useAppSettings();
  const insets = useSafeAreaInsets();
  const targetId = selectedTenantId || user?.uid;
  
  const estufaId = route.params?.estufaId; 
  const talhaoId = route.params?.talhaoId;
  const editingId = route.params?.plantioId;
  const isEditMode = !!editingId;
  const [loadedEstufaId, setLoadedEstufaId] = useState<string | undefined>(estufaId);
  const resolvedEstufaId = estufaId || loadedEstufaId;
  const [selectedTalhaoId, setSelectedTalhaoId] = useState<string>(talhaoId || '');
  const { data: talhoesData = [] } = useTalhoesListData(targetId);

  const [codigoLote, setCodigoLote] = useState('');
  const [cultura, setCultura] = useState('');
  const [variedade, setVariedade] = useState('');
  const [origemSemente, setOrigemSemente] = useState('');
  
  const [quantidadePlantada, setQuantidadePlantada] = useState('');
  const [unidadeQuantidade, setUnidadeQuantidade] = useState<UnidadeQuantidadePlantio>('Mudas');
  const [quantidadeBandejas, setQuantidadeBandejas] = useState('');
  const [mudasPorBandeja, setMudasPorBandeja] = useState('');
  const [precoUnidade, setPrecoUnidade] = useState('');
  
  const [cicloDias, setCicloDias] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [caixaPerfis, setCaixaPerfis] = useState<PlantioCaixaPerfil[]>([]);
  const [caixaPerfilNome, setCaixaPerfilNome] = useState('');
  const [caixaPerfilPesoBruto, setCaixaPerfilPesoBruto] = useState('');
  const [caixaPerfilPesoLiquido, setCaixaPerfilPesoLiquido] = useState('');
  const [editingCaixaPerfilId, setEditingCaixaPerfilId] = useState<string | null>(null);
  
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  const invalidateQueries = async () => {
    if (!targetId) return;
    await invalidatePlantioQueries(targetId, resolvedEstufaId);
  };

  const mutation = useMutation({
    mutationFn: async (plantioData: any) => {
      if (!targetId) {
        throw new Error("Sua sessão expirou. Entre novamente.");
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
      Alert.alert(
        isEditMode ? "Ciclo atualizado" : "Ciclo criado",
        `${variables.cultura} • ${variables.quantidadePlantada} ${variables.unidadeQuantidade}${custoEstimadoValue > 0 ? `\nCusto inicial: R$ ${custoEstimadoValue.toFixed(2)}` : ''}`,
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    },
    onError: (error: any) => {
      Alert.alert("Erro", error.message || "Não consegui salvar o ciclo. Tente novamente.");
    },
  });

  useLayoutEffect(() => {
    navigation.setOptions({
      title: isEditMode ? 'Editar Lote (Plantio)' : 'Novo Lote',
      headerRight: () => isEditMode ? (
        <TouchableOpacity onPress={handleDelete} style={{marginRight: 15}}>
          <MaterialCommunityIcons name="trash-can-outline" size={24} color={COLORS.textLight} />
        </TouchableOpacity>
      ) : null,
    });
  }, [navigation, isEditMode, canDeleteEstufa]);

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
        setUnidadeQuantidade(normalizeUnidadeQuantidade(data.unidadeQuantidade));
        setQuantidadeBandejas(data.quantidadeBandejas?.toString() || '');
        setMudasPorBandeja(data.mudasPorBandeja?.toString() || '');
        setPrecoUnidade(data.precoEstimadoUnidade?.toString() || '');
        setCicloDias(data.cicloDias?.toString() || '');
        setObservacoes(data.observacoes || '');
        setCaixaPerfis(data.caixaPerfis || []);
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Erro", "Não foi possível carregar os dados do plantio.");
    }
  };

  const handleCancelPlantio = async () => {
    if (!targetId || !editingId) return;
    try {
      await updatePlantio(editingId as string, { status: 'cancelado' }, targetId);
      await invalidateQueries();
      navigation.goBack();
    } catch (e) {
      Alert.alert("Erro", "Falha ao cancelar o lote.");
    }
  };

  const handleDelete = () => {
    if (!targetId) return;

    if (!canDeleteEstufa) {
      Alert.alert(
        "Cancelar Lote",
        "Tem certeza? O lote será cancelado e mantido no histórico financeiro.",
        [
          { text: "Voltar", style: "cancel" },
          {
            text: "Cancelar Lote",
            style: "destructive",
            onPress: handleCancelPlantio,
          }
        ]
      );
      return;
    }

    Alert.alert(
      "Ações do Ciclo",
      "Escolha entre cancelar o ciclo (mantém histórico) ou excluir definitivamente.",
      [
        { text: "Voltar", style: "cancel" },
        { 
          text: "Cancelar Lote", 
          style: "destructive", 
          onPress: handleCancelPlantio, 
        },
        {
          text: "Excluir Definitivamente",
          style: "destructive",
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
    if (!adminPassword.trim()) {
      Alert.alert('Atenção', 'Digite a senha de administrador.');
      return;
    }

    setDeleting(true);
    try {
      const valid = await verifyCurrentUserPassword(adminPassword.trim());
      if (!valid) {
        Alert.alert('Senha inválida', 'A senha de administrador está incorreta.');
        return;
      }
      await deletePlantioSafely(editingId, targetId);
      setDeleteModalVisible(false);
      setAdminPassword('');
      await invalidateQueries();
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Exclusão bloqueada', e?.message || 'Não foi possível excluir o ciclo.');
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    if (unidadeQuantidade !== 'Bandejas') return;

    const bandejas = parseFloat(quantidadeBandejas.replace(',', '.'));
    const mudas = parseFloat(mudasPorBandeja.replace(',', '.'));
    if (!isNaN(bandejas) && bandejas > 0 && !isNaN(mudas) && mudas > 0) {
      setQuantidadePlantada(String(bandejas * mudas));
    }
  }, [unidadeQuantidade, quantidadeBandejas, mudasPorBandeja]);

  const custoEstimado = useMemo(() => {
    const preco = parseFloat(precoUnidade.replace(',', '.')) || 0;
    if (preco <= 0) return 0;

    if (unidadeQuantidade === 'Bandejas') {
      const bandejas = parseFloat(quantidadeBandejas.replace(',', '.')) || 0;
      return bandejas * preco;
    }

    const qtd = parseFloat(quantidadePlantada.replace(',', '.')) || 0;
    return qtd * preco;
  }, [precoUnidade, unidadeQuantidade, quantidadeBandejas, quantidadePlantada]);

  const resetCaixaPerfilForm = () => {
    setCaixaPerfilNome('');
    setCaixaPerfilPesoBruto('');
    setCaixaPerfilPesoLiquido('');
    setEditingCaixaPerfilId(null);
  };

  const handleSaveCaixaPerfil = () => {
    const nome = caixaPerfilNome.trim();
    const pesoBruto = parseFloat(caixaPerfilPesoBruto.replace(',', '.')) || 0;
    const pesoLiquido = parseFloat(caixaPerfilPesoLiquido.replace(',', '.')) || 0;

    if (!nome) {
      Alert.alert('Atenção', 'Informe o nome do tipo de caixa.');
      return;
    }
    if (pesoBruto <= 0 || pesoLiquido <= 0) {
      Alert.alert('Atenção', 'Informe pesos válidos para bruto e líquido.');
      return;
    }
    if (pesoLiquido > pesoBruto) {
      Alert.alert('Atenção', 'O peso líquido não pode ser maior que o peso bruto.');
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
      return [...filtered, nextPerfil].sort((a, b) => a.nome.localeCompare(b.nome));
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
    if (!targetId) return Alert.alert("Atenção", "Sua sessão expirou. Entre novamente.");
    
    if (!resolvedEstufaId && !selectedTalhaoId && !isEditMode) {
      return Alert.alert("Atenção", "Escolha um talhao ou uma estufa para continuar.");
    }
    if (!cultura || !quantidadePlantada) {
      return Alert.alert("Atenção", "Informe a cultura e a quantidade.");
    }
    if (unidadeQuantidade === 'Bandejas') {
      const bandejas = parseFloat(quantidadeBandejas.replace(',', '.')) || 0;
      const mudas = parseFloat(mudasPorBandeja.replace(',', '.')) || 0;
      if (bandejas <= 0 || mudas <= 0) {
        return Alert.alert("Atenção", "Para bandejas, informe quantidade de bandejas e mudas por bandeja.");
      }
    }
    
    const qtdNum = parseFloat(quantidadePlantada.replace(',', '.')) || 0;
    const precoUnidadeNum = parseFloat(precoUnidade.replace(',', '.')) || 0;
    const quantidadeBandejasNum = unidadeQuantidade === 'Bandejas' ? (parseFloat(quantidadeBandejas.replace(',', '.')) || null) : null;
    const mudasPorBandejaNum = unidadeQuantidade === 'Bandejas' ? (parseFloat(mudasPorBandeja.replace(',', '.')) || null) : null;
    const cicloNum = parseInt(cicloDias) || 0;
    
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
      quantidadePlantada: qtdNum,
      quantidadeBandejas: quantidadeBandejasNum,
      mudasPorBandeja: mudasPorBandejaNum,
      unidadeQuantidade,
      precoEstimadoUnidade: precoUnidadeNum > 0 ? precoUnidadeNum : null,
      unidadePrecoEstimado: precoUnidadeNum > 0 ? unidadeQuantidade : null,
      custoEstimadoInicial: precoUnidadeNum > 0 ? custoEstimado : null,
      cicloDias: cicloNum > 0 ? cicloNum : null,
      observacoes,
      caixaPerfis,
      ...(!isEditMode && { 
        dataPlantio: dataPlantioTimestamp,
        dataInicio: dataPlantioTimestamp,
        status: 'em_desenvolvimento' as const,
        previsaoColheita: previsaoData,
        dataPrevisaoColheita: previsaoData,
      })
    };

    mutation.mutate(plantioData);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.padding,
          { paddingBottom: (settings.uiV2Enabled ? 138 : SPACING.xl) + insets.bottom },
        ]}
      >
        <View style={styles.heroBanner}>
          <MaterialCommunityIcons name="sprout-outline" size={20} color={COLORS.textLight} />
          <Text style={styles.heroBannerText}>Configure o ciclo com dados tecnicos e custo inicial</Text>
        </View>

        <View style={styles.formCard}>
        <View style={styles.loteContainer}>
          <Text style={styles.loteLabel}>CODIGO DO LOTE (GERADO AUTOMATICAMENTE)</Text>
          <TextInput 
            style={styles.loteInput} 
            value={codigoLote} 
            editable={false} 
            selectTextOnFocus={false}
          />
        </View>

        <Text style={styles.sectionTitle}>Identificação da Cultura</Text>

        <Text style={styles.label}>Talhão (opcional)</Text>
        <View style={styles.pickerWrapper}>
          <Picker selectedValue={selectedTalhaoId} onValueChange={(value) => setSelectedTalhaoId(String(value || ''))} style={styles.picker}>
            <Picker.Item label="Sem talhão vinculado" value="" />
            {talhoesData.map((talhao) => (
              <Picker.Item key={talhao.id} label={talhao.nome} value={talhao.id} />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>Estufa (opcional)</Text>
        <TextInput
          style={[styles.input, styles.inputDisabled]}
          value={resolvedEstufaId || 'Sem estufa vinculada (modo campo)'}
          editable={false}
        />

        <View style={styles.row}>
          <View style={{flex: 1, marginRight: 5}}>
            <Text style={styles.label}>Cultura *</Text>
            <TextInput 
              style={styles.input} 
              value={cultura} 
              onChangeText={setCultura} 
              placeholder="Ex: Tomate" 
              placeholderTextColor={COLORS.textPlaceholder} 
            />
          </View>
          <View style={{flex: 1, marginLeft: 5}}>
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
        <Text style={styles.sectionTitle}>Dados de Plantio e Custos</Text>

        <View style={styles.row}>
          <View style={{flex: 1, marginRight: 5}}>
            <Text style={styles.label}>Quantidade *</Text>
            <TextInput 
              style={styles.input} 
              value={quantidadePlantada} 
              onChangeText={(value) => setQuantidadePlantada(sanitizeIntegerInput(value))} 
              placeholder="Ex: 500" 
              placeholderTextColor={COLORS.textPlaceholder} 
              keyboardType="numeric"
              editable={unidadeQuantidade !== 'Bandejas'}
            />
          </View>
          <View style={{flex: 1, marginLeft: 5}}>
            <Text style={styles.label}>Unidade</Text>
            <View style={styles.pickerWrapper}>
              <Picker selectedValue={unidadeQuantidade} onValueChange={(value) => setUnidadeQuantidade(value as UnidadeQuantidadePlantio)} style={styles.picker}>
                {UNIDADE_QUANTIDADE_OPTIONS.map((option) => (
                  <Picker.Item key={option} label={option} value={option} />
                ))}
              </Picker>
            </View>
          </View>
        </View>

        {unidadeQuantidade === 'Bandejas' && (
          <View style={styles.bandejaBox}>
            <Text style={styles.bandejaHint}>
              Informe quantas bandejas foram usadas e quantas células/mudas existem em cada bandeja.
            </Text>

            <View style={styles.row}>
              <View style={{flex: 1, marginRight: 5}}>
                <Text style={styles.label}>Quantidade de Bandejas *</Text>
                <TextInput
                  style={styles.input}
                  value={quantidadeBandejas}
                  onChangeText={(value) => setQuantidadeBandejas(sanitizeIntegerInput(value))}
                  placeholder="Ex: 10 bandejas"
                  placeholderTextColor={COLORS.textPlaceholder}
                  keyboardType="numeric"
                />
              </View>
              <View style={{flex: 1, marginLeft: 5}}>
                <Text style={styles.label}>Células/Mudas por Bandeja *</Text>
                <TextInput
                  style={styles.input}
                  value={mudasPorBandeja}
                  onChangeText={(value) => setMudasPorBandeja(sanitizeIntegerInput(value))}
                  placeholder="Ex: 128"
                  placeholderTextColor={COLORS.textPlaceholder}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <Text style={styles.label}>Sugestões de células por bandeja</Text>
            <View style={styles.chipRow}>
              {MUDAS_POR_BANDEJA_OPTIONS.map((option) => (
                <TouchableOpacity key={option} style={styles.chip} onPress={() => setMudasPorBandeja(String(option))}>
                  <Text style={styles.chipText}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.bandejaHintStrong}>
              Quantidade total de mudas = bandejas × células por bandeja (calculado automaticamente).
            </Text>
          </View>
        )}

        <View style={styles.row}>
          <View style={{flex: 1}}>
            <Text style={styles.label}>
              {unidadeQuantidade === 'Bandejas' ? 'Preço por Bandeja (R$)' : unidadeQuantidade === 'Mudas' ? 'Preço por Muda (R$)' : 'Preço por Unidade (R$)'}
            </Text>
            <TextInput
              style={styles.input}
              value={precoUnidade}
              onChangeText={(value) => setPrecoUnidade(sanitizeDecimalInput(value))}
              placeholder="Ex: 1,50"
              placeholderTextColor={COLORS.textPlaceholder}
              keyboardType="numeric"
            />
            <Text style={styles.costText}>Custo estimado inicial: R$ {custoEstimado.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={{flex: 1}}>
            <Text style={styles.label}>Ciclo Est. (Dias)</Text>
            <TextInput 
              style={styles.input} 
              value={cicloDias} 
              onChangeText={(value) => setCicloDias(sanitizeIntegerInput(value))} 
              placeholder="Ex: 90" 
              placeholderTextColor={COLORS.textPlaceholder} 
              keyboardType="numeric" 
            />
          </View>
        </View>
        <Text style={styles.hint}>Além deste custo inicial de mudas/bandejas, os demais custos do ciclo vêm de aplicações e despesas vinculadas.</Text>
        </View>

        {settings.useCycleBoxWeightProfiles ? (
          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Perfis de Caixa do Ciclo</Text>
            <Text style={styles.hint}>
              Cadastre um ou mais tipos de caixa com peso bruto e líquido por caixa. Na venda, o vendedor escolhe o perfil e o app calcula os pesos automaticamente.
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
              <View style={{flex: 1, marginRight: 5}}>
                <Text style={styles.label}>Peso Bruto por Caixa (kg)</Text>
                <TextInput
                  style={styles.input}
                  value={caixaPerfilPesoBruto}
                  onChangeText={(value) => setCaixaPerfilPesoBruto(sanitizeDecimalInput(value))}
                  placeholder="Ex: 23,5"
                  placeholderTextColor={COLORS.textPlaceholder}
                  keyboardType="numeric"
                />
              </View>
              <View style={{flex: 1, marginLeft: 5}}>
                <Text style={styles.label}>Peso Líquido por Caixa (kg)</Text>
                <TextInput
                  style={styles.input}
                  value={caixaPerfilPesoLiquido}
                  onChangeText={(value) => setCaixaPerfilPesoLiquido(sanitizeDecimalInput(value))}
                  placeholder="Ex: 22"
                  placeholderTextColor={COLORS.textPlaceholder}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.profileActionsRow}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={handleSaveCaixaPerfil}>
                <MaterialCommunityIcons
                  name={editingCaixaPerfilId ? 'content-save-edit-outline' : 'plus-circle-outline'}
                  size={18}
                  color={COLORS.primary}
                />
                <Text style={styles.secondaryBtnText}>{editingCaixaPerfilId ? 'Atualizar Perfil' : 'Adicionar Perfil'}</Text>
              </TouchableOpacity>
              {editingCaixaPerfilId ? (
                <TouchableOpacity style={styles.secondaryBtn} onPress={resetCaixaPerfilForm}>
                  <MaterialCommunityIcons name="close-circle-outline" size={18} color={COLORS.primary} />
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
                        Bruto: {perfil.pesoBruto.toFixed(2)} kg • Líquido: {perfil.pesoLiquido.toFixed(2)} kg
                      </Text>
                    </View>
                    <View style={styles.profileActionButtons}>
                      <TouchableOpacity onPress={() => handleEditCaixaPerfil(perfil)}>
                        <MaterialCommunityIcons name="pencil-outline" size={20} color={COLORS.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteCaixaPerfil(perfil.id)}>
                        <MaterialCommunityIcons name="trash-can-outline" size={20} color={COLORS.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.hint}>Nenhum perfil de caixa cadastrado neste ciclo.</Text>
            )}
          </View>
        ) : null}

        <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>Outros</Text>

        <Text style={styles.label}>Observações do Lote</Text>
        <TextInput 
          style={[styles.input, { height: 80, textAlignVertical: 'top' }]} 
          value={observacoes} 
          onChangeText={setObservacoes} 
          placeholder="Condições climáticas no dia, tipo de adubação de base..." 
          placeholderTextColor={COLORS.textPlaceholder} 
          multiline
        />
        </View>

        <TouchableOpacity style={styles.btn} onPress={handleSave} disabled={mutation.isPending}>
          {mutation.isPending ? (
            <ActivityIndicator color={COLORS.textLight} />
          ) : (
            <Text style={styles.btnText}>Guardar Lote de Plantio</Text>
          )}
        </TouchableOpacity>

        {isEditMode ? (
          <TouchableOpacity style={styles.secondaryDangerBtn} onPress={handleDelete} disabled={mutation.isPending || deleting}>
            <MaterialCommunityIcons name="trash-can-outline" size={18} color={COLORS.danger} />
            <Text style={styles.secondaryDangerText}>Ações do ciclo (cancelar/excluir)</Text>
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
              Esta ação só é permitida sem movimentações financeiras/operacionais. Digite a senha admin para confirmar.
            </Text>
            <TextInput
              style={styles.modalInput}
              value={adminPassword}
              onChangeText={setAdminPassword}
              placeholder="Senha de administrador"
              placeholderTextColor={COLORS.textPlaceholder}
              secureTextEntry
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setDeleteModalVisible(false)} disabled={deleting}>
                <Text style={styles.modalBtnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnDelete} onPress={handleConfirmHardDelete} disabled={deleting}>
                {deleting ? <ActivityIndicator color={COLORS.textLight} /> : <Text style={styles.modalBtnDeleteText}>Excluir</Text>}
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
  padding: { padding: SPACING.xl },

  heroBanner: {
    backgroundColor: COLORS.secondary,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    ...SHADOWS.card,
  },
  heroBannerText: {
    color: COLORS.textLight,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
    flex: 1,
  },

  formCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 12,
    ...SHADOWS.card,
  },
  
  loteContainer: { backgroundColor: COLORS.infoSoft, padding: 15, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.info, marginBottom: 12 },
  loteLabel: { fontSize: 11, fontWeight: 'bold', color: COLORS.primary, marginBottom: 5, textAlign: 'center' },
  loteInput: { fontSize: TYPOGRAPHY.h3, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center', letterSpacing: 1 },

  sectionTitle: { fontSize: TYPOGRAPHY.h3, fontWeight: '900', color: COLORS.secondary, marginTop: 6, marginBottom: 14 },
  label: { fontWeight: 'bold', marginBottom: 5, color: COLORS.textSecondary, fontSize: 13 },
  input: { backgroundColor: COLORS.surfaceMuted, padding: 15, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, marginBottom: 15, color: COLORS.textDark, fontWeight: '600' },
  inputDisabled: { opacity: 0.7 },
  pickerWrapper: { backgroundColor: COLORS.surfaceMuted, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, marginBottom: 15, height: 54, justifyContent: 'center' },
  picker: { color: COLORS.textDark },
  bandejaBox: { backgroundColor: COLORS.surfaceMuted, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: 12, marginBottom: 15 },
  bandejaHint: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 10 },
  bandejaHintStrong: { fontSize: 12, color: COLORS.textPrimary, fontWeight: '600', marginTop: 4 },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background },
  chipText: { color: COLORS.textPrimary, fontWeight: '700', fontSize: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  hint: { fontSize: 12, color: COLORS.textPrimary, marginTop: -10, marginBottom: 15, fontStyle: 'italic' },
  costText: { fontSize: 13, color: COLORS.success, fontWeight: '700', marginTop: -8, marginBottom: 15 },
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
  secondaryBtnText: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '800' },
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
  
  btn: { backgroundColor: COLORS.primary, height: 58, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', marginTop: 8, marginBottom: 20, ...SHADOWS.card },
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
  modalOverlay: { flex: 1, backgroundColor: COLORS.rgba00006, justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.xl, ...SHADOWS.card },
  modalTitle: { fontSize: TYPOGRAPHY.h3, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 8 },
  modalText: { color: COLORS.textSecondary, fontSize: 13, marginBottom: SPACING.md },
  modalInput: { height: 48, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, paddingHorizontal: 12, color: COLORS.textPrimary, backgroundColor: COLORS.surfaceMuted, marginBottom: SPACING.md },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalBtnCancel: { flex: 1, height: 44, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.borderDark, justifyContent: 'center', alignItems: 'center' },
  modalBtnCancelText: { color: COLORS.textSecondary, fontWeight: '700' },
  modalBtnDelete: { flex: 1, height: 44, borderRadius: RADIUS.sm, backgroundColor: COLORS.danger, justifyContent: 'center', alignItems: 'center' },
  modalBtnDeleteText: { color: COLORS.textLight, fontWeight: '800' }
});

export default PlantioFormScreen;

