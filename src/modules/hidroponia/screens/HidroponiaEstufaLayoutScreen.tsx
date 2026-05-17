import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../../hooks/useAuth';
import { getEstufaById } from '../../../services/estufaService';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../../constants/theme';
import { Estufa, HydroEstrutura, HydroSetor } from '../../../types/domain';
import { RootStackParamList } from '../../../navigation/types';
import {
  addHydroEstrutura,
  addHydroSetor,
  deleteHydroEstrutura,
  deleteHydroSetor,
  updateHydroEstrutura,
  updateHydroSetor,
} from '../services/hidroponiaLayoutService';
import { encerrarHydroOcupacao, listHydroOcupacoesByEstufa } from '../services/hidroponiaOcupacaoService';
import { HydroOcupacao } from '../types';
import { toNumber } from '../utils';

type Props = NativeStackScreenProps<RootStackParamList, 'HidroponiaEstufaLayout'>;
type BenchFilter = 'todas' | 'ocupadas' | 'vazias';

const ESTRUTURA_TYPES: Array<{ value: HydroEstrutura['tipo']; label: string }> = [
  { value: 'bercario', label: 'Bancada bercario' },
  { value: 'perfil', label: 'Perfil/canal' },
  { value: 'bancada', label: 'Bancada' },
  { value: 'mesa', label: 'Mesa' },
  { value: 'outro', label: 'Outro' },
];

const ESTRUTURA_TYPE_LABEL: Record<HydroEstrutura['tipo'], string> = {
  bercario: 'Bercario',
  perfil: 'Perfil',
  bancada: 'Bancada',
  mesa: 'Mesa',
  canal: 'Canal',
  outro: 'Outro',
};

const STAGE_LABEL: Record<string, string> = {
  semeadura: 'Semeadura',
  germinacao: 'Germinacao',
  bercario: 'Bercario',
  crescimento_final: 'Producao final',
  pronto_colheita: 'Pronto',
  colhido: 'Colhido',
  cancelado: 'Cancelado',
};

const getEstruturaOcupacoesAtivas = (estruturaId: string, ocupacoes: HydroOcupacao[]) =>
  ocupacoes.filter((o) => o.estruturaId === estruturaId && o.status === 'ativa');

const getTimestampMillis = (value?: any) => {
  if (!value || typeof value?.toMillis !== 'function') return 0;
  return Number(value.toMillis() || 0);
};

const getCycleDays = (value?: any) => {
  const start = getTimestampMillis(value);
  if (!start) return 0;
  return Math.max(0, Math.floor((Date.now() - start) / (1000 * 60 * 60 * 24)));
};

const HidroponiaEstufaLayoutScreen = ({ navigation, route }: Props) => {
  const { user, selectedTenantId } = useAuth();
  const targetId = selectedTenantId || user?.uid;
  const estufaId = route.params.estufaId;

  const [estufa, setEstufa] = useState<Estufa | null>(null);
  const [ocupacoes, setOcupacoes] = useState<HydroOcupacao[]>([]);
  const [selectedSetorId, setSelectedSetorId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [benchFilter, setBenchFilter] = useState<BenchFilter>('todas');

  const [setorModalVisible, setSetorModalVisible] = useState(false);
  const [estruturaModalVisible, setEstruturaModalVisible] = useState(false);
  const [editingSetor, setEditingSetor] = useState<HydroSetor | null>(null);
  const [editingEstrutura, setEditingEstrutura] = useState<HydroEstrutura | null>(null);
  const [movingFromOcupacao, setMovingFromOcupacao] = useState<HydroOcupacao | null>(null);

  const [newSetorName, setNewSetorName] = useState('');
  const [newSetorMotorId, setNewSetorMotorId] = useState('');
  const [newEstruturaName, setNewEstruturaName] = useState('');
  const [newEstruturaType, setNewEstruturaType] = useState<HydroEstrutura['tipo']>('perfil');
  const [newEstruturaCapacity, setNewEstruturaCapacity] = useState('256');

  const load = useCallback(async () => {
    if (!targetId) return;
    setLoading(true);
    try {
      const [estufaRes, ocupacoesRes] = await Promise.all([
        getEstufaById(estufaId, targetId),
        listHydroOcupacoesByEstufa(targetId, estufaId),
      ]);
      setEstufa(estufaRes);
      setOcupacoes(ocupacoesRes);

      if (estufaRes?.setores && estufaRes.setores.length > 0) {
        const validIds = new Set(estufaRes.setores.map((setor) => setor.id));
        setSelectedSetorId((current) =>
          current && validIds.has(current) ? current : estufaRes.setores![0].id
        );
      } else {
        setSelectedSetorId('');
      }
    } finally {
      setLoading(false);
    }
  }, [estufaId, targetId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const setores = estufa?.setores || [];
  const motores = estufa?.motores || [];
  const motorById = useMemo(
    () => new Map(motores.map((motor) => [motor.id, motor])),
    [motores]
  );
  const selectedSetor = useMemo(
    () => setores.find((setor) => setor.id === selectedSetorId) || null,
    [setores, selectedSetorId]
  );

  const allEstruturas = useMemo(() => setores.flatMap((setor) => setor.estruturas || []), [setores]);

  const estruturaById = useMemo(
    () => new Map(allEstruturas.map((estrutura) => [estrutura.id, estrutura])),
    [allEstruturas]
  );

  const selectedEstruturas = selectedSetor?.estruturas || [];

  const selectedSetorSummary = useMemo(() => {
    const total = selectedEstruturas.length;
    const ocupadas = selectedEstruturas.filter(
      (estrutura) => getEstruturaOcupacoesAtivas(estrutura.id, ocupacoes).length > 0
    ).length;
    const capacidade = selectedEstruturas.reduce(
      (acc, estrutura) => acc + Number(estrutura.capacidadePlantas || 0),
      0
    );
    const ocupado = selectedEstruturas.reduce((acc, estrutura) => {
      const ativas = getEstruturaOcupacoesAtivas(estrutura.id, ocupacoes);
      return acc + ativas.reduce((sum, ocupacao) => sum + Number(ocupacao.quantidadeAlocada || 0), 0);
    }, 0);
    return {
      total,
      ocupadas,
      vazias: Math.max(0, total - ocupadas),
      capacidade,
      ocupado,
      livre: Math.max(0, capacidade - ocupado),
    };
  }, [ocupacoes, selectedEstruturas]);

  const filteredEstruturas = useMemo(() => {
    if (benchFilter === 'todas') return selectedEstruturas;
    return selectedEstruturas.filter((estrutura) => {
      const isOcupada = getEstruturaOcupacoesAtivas(estrutura.id, ocupacoes).length > 0;
      return benchFilter === 'ocupadas' ? isOcupada : !isOcupada;
    });
  }, [benchFilter, ocupacoes, selectedEstruturas]);

  const layoutSummary = useMemo(() => {
    const capacidade = allEstruturas.reduce(
      (acc, estrutura) => acc + Number(estrutura.capacidadePlantas || 0),
      0
    );
    const ocupado = allEstruturas.reduce((acc, estrutura) => {
      const ativas = getEstruturaOcupacoesAtivas(estrutura.id, ocupacoes);
      return acc + ativas.reduce((sum, ocupacao) => sum + Number(ocupacao.quantidadeAlocada || 0), 0);
    }, 0);
    return {
      setores: setores.length,
      estruturas: allEstruturas.length,
      ocupadas: allEstruturas.filter((estrutura) => getEstruturaOcupacoesAtivas(estrutura.id, ocupacoes).length > 0)
        .length,
      capacidade,
      ocupado,
      livre: Math.max(0, capacidade - ocupado),
    };
  }, [allEstruturas, ocupacoes, setores.length]);

  const movingSourceName = useMemo(() => {
    if (!movingFromOcupacao) return '';
    return estruturaById.get(movingFromOcupacao.estruturaId)?.nome || movingFromOcupacao.estruturaId;
  }, [estruturaById, movingFromOcupacao]);

  const openMotorManager = () => {
    navigation.navigate('HidroponiaMotores', { estufaId });
  };

  const openCreateSetorModal = () => {
    setEditingSetor(null);
    setNewSetorName('');
    setNewSetorMotorId(motores[0]?.id || '');
    setSetorModalVisible(true);
  };

  const openEditSetorModal = (setor: HydroSetor) => {
    setEditingSetor(setor);
    setNewSetorName(setor.nome);
    setNewSetorMotorId(setor.motorId || motores[0]?.id || '');
    setSetorModalVisible(true);
  };

  const openCreateEstruturaModal = () => {
    if (!selectedSetor) return;
    setEditingEstrutura(null);
    setNewEstruturaName('');
    setNewEstruturaType('perfil');
    setNewEstruturaCapacity('256');
    setEstruturaModalVisible(true);
  };

  const openEditEstruturaModal = (estrutura: HydroEstrutura) => {
    setEditingEstrutura(estrutura);
    setNewEstruturaName(estrutura.nome);
    setNewEstruturaType(estrutura.tipo);
    setNewEstruturaCapacity(String(estrutura.capacidadePlantas || ''));
    setEstruturaModalVisible(true);
  };

  const handleSaveSetor = async () => {
    if (!targetId) {
      Alert.alert('Erro', 'Sessao expirada. Entre novamente.');
      return;
    }
    if (!newSetorName.trim()) {
      Alert.alert('Campo obrigatorio', 'Informe o nome do setor.');
      return;
    }
    if (motores.length === 0) {
      Alert.alert('Sem motores', 'Cadastre ao menos um motor antes de criar setores.');
      return;
    }
    if (!newSetorMotorId) {
      Alert.alert('Campo obrigatorio', 'Selecione o motor responsável por este setor.');
      return;
    }

    setSaving(true);
    try {
      if (editingSetor) {
        await updateHydroSetor(
          estufaId,
          editingSetor.id,
          { nome: newSetorName.trim(), motorId: newSetorMotorId },
          targetId
        );
      } else {
        await addHydroSetor(
          estufaId,
          { nome: newSetorName.trim(), motorId: newSetorMotorId },
          targetId
        );
      }
      setSetorModalVisible(false);
      setEditingSetor(null);
      setNewSetorName('');
      await load();
    } catch (error) {
      Alert.alert('Erro', 'Falha ao salvar setor.');
    } finally {
      setSaving(false);
    }
  };


  const handleSaveEstrutura = async () => {
    if (!targetId) {
      Alert.alert('Erro', 'Sessao expirada. Entre novamente.');
      return;
    }
    if (!selectedSetor) {
      Alert.alert('Sem setor', 'Selecione um setor para cadastrar a bancada.');
      return;
    }
    if (!newEstruturaName.trim()) {
      Alert.alert('Campo obrigatorio', 'Informe o nome da bancada.');
      return;
    }

    const capacidade = Math.max(0, toNumber(newEstruturaCapacity));
    setSaving(true);
    try {
      if (editingEstrutura) {
        await updateHydroEstrutura(
          estufaId,
          editingEstrutura.id,
          {
            nome: newEstruturaName.trim(),
            tipo: newEstruturaType,
            capacidadePlantas: capacidade,
            quantidadeFuros: capacidade,
          },
          targetId
        );
      } else {
        await addHydroEstrutura(
          estufaId,
          {
            setorId: selectedSetor.id,
            nome: newEstruturaName.trim(),
            tipo: newEstruturaType,
            capacidadePlantas: capacidade,
          },
          targetId
        );
      }
      setEstruturaModalVisible(false);
      setEditingEstrutura(null);
      setNewEstruturaName('');
      await load();
    } catch (error) {
      Alert.alert('Erro', 'Falha ao salvar bancada.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSetor = (setor: HydroSetor) => {
    if (!targetId) {
      Alert.alert('Erro', 'Sessao expirada. Entre novamente.');
      return;
    }

    Alert.alert('Excluir setor', `Deseja excluir "${setor.nome}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteHydroSetor(estufaId, setor.id, targetId);
            setSelectedSetorId('');
            await load();
          } catch (error) {
            Alert.alert('Erro', 'Falha ao excluir setor.');
          }
        },
      },
    ]);
  };

  const handleDeleteEstrutura = (estrutura: HydroEstrutura, hasAtiva: boolean) => {
    if (hasAtiva) {
      Alert.alert(
        'Bancada ocupada',
        'Nao e possivel excluir uma bancada com produção ativa. Movimente ou encerre antes.'
      );
      return;
    }
    if (!targetId) {
      Alert.alert('Erro', 'Sessao expirada. Entre novamente.');
      return;
    }

    Alert.alert('Excluir bancada', `Deseja excluir "${estrutura.nome}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteHydroEstrutura(estufaId, estrutura.id, targetId);
            await load();
          } catch (error) {
            Alert.alert('Erro', 'Falha ao excluir bancada.');
          }
        },
      },
    ]);
  };

  const handleEncerrarOcupacao = (ocupacao: HydroOcupacao) => {
    if (!targetId) {
      Alert.alert('Erro', 'Sessao expirada. Entre novamente.');
      return;
    }

    Alert.alert(
      'Encerrar ocupacao',
      `Encerrar "${ocupacao.cultura}" nesta bancada agora?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Encerrar',
          style: 'destructive',
          onPress: async () => {
            try {
              await encerrarHydroOcupacao(ocupacao.id, targetId);
              if (movingFromOcupacao?.id === ocupacao.id) {
                setMovingFromOcupacao(null);
              }
              await load();
            } catch (error) {
              Alert.alert('Erro', 'Falha ao encerrar ocupacao.');
            }
          },
        },
      ]
    );
  };

  const handleSelectDestination = (toEstrutura: HydroEstrutura) => {
    if (!movingFromOcupacao) return;
    if (movingFromOcupacao.estruturaId === toEstrutura.id) {
      Alert.alert('Destino invalido', 'A bancada de destino deve ser diferente da origem.');
      return;
    }

    navigation.navigate('HidroponiaMovimentarLote', {
      loteId: movingFromOcupacao.loteId,
      fromOcupacaoId: movingFromOcupacao.id,
      toSetorId: selectedSetor?.id,
      toEstruturaId: toEstrutura.id,
    });
    setMovingFromOcupacao(null);
  };

  if (loading && !estufa) {
    return <ActivityIndicator size="large" color={COLORS.primary} style={styles.centered} />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} colors={[COLORS.primary]} />}
    >
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.title}>Layout da Estufa</Text>
            <Text style={styles.subtitle}>{estufa?.nome || '-'}</Text>
          </View>
          <View style={styles.headerActionsWrap}>
            <TouchableOpacity style={styles.headerActionBtn} onPress={openMotorManager}>
              <MaterialCommunityIcons name="engine-outline" size={18} color={COLORS.textLight} />
              <Text style={styles.headerActionBtnText}>Motores</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerActionBtn} onPress={openCreateSetorModal}>
              <MaterialCommunityIcons name="plus" size={18} color={COLORS.textLight} />
              <Text style={styles.headerActionBtnText}>Novo setor</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{layoutSummary.setores}</Text>
            <Text style={styles.statLabel}>Setores</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{layoutSummary.estruturas}</Text>
            <Text style={styles.statLabel}>Bancadas</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{layoutSummary.ocupadas}</Text>
            <Text style={styles.statLabel}>Ocupadas</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{layoutSummary.livre}</Text>
            <Text style={styles.statLabel}>Mudas livres</Text>
          </View>
        </View>

        <Text style={styles.capacityText}>
          {layoutSummary.ocupado}/{layoutSummary.capacidade} mudas alocadas
        </Text>
      </View>

      {movingFromOcupacao && (
        <View style={styles.moveAlert}>
          <MaterialCommunityIcons name="swap-horizontal" size={22} color={COLORS.primary} />
          <Text style={styles.moveAlertText}>
            Origem: {movingSourceName}. Escolha a bancada de destino.
          </Text>
          <TouchableOpacity onPress={() => setMovingFromOcupacao(null)} style={styles.moveCancelBtn}>
            <MaterialCommunityIcons name="close" size={18} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      )}

      {setores.length === 0 ? (
        <View style={styles.emptyBox}>
          <MaterialCommunityIcons name="view-grid-plus-outline" size={28} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>Nenhum setor cadastrado</Text>
          <Text style={styles.emptyText}>Crie o primeiro setor para organizar as bancadas.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={openCreateSetorModal}>
            <MaterialCommunityIcons name="plus" size={18} color={COLORS.textLight} />
            <Text style={styles.primaryBtnText}>Criar setor</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
            {setores.map((setor) => {
              const estruturas = setor.estruturas || [];
              const ocupadas = estruturas.filter(
                (estrutura) => getEstruturaOcupacoesAtivas(estrutura.id, ocupacoes).length > 0
              ).length;

              return (
                <TouchableOpacity
                  key={setor.id}
                  style={[styles.tab, selectedSetorId === setor.id && styles.tabActive]}
                  onPress={() => setSelectedSetorId(setor.id)}
                >
                  <Text style={[styles.tabTitle, selectedSetorId === setor.id && styles.tabTitleActive]}>
                    {setor.nome}
                  </Text>
                  <Text style={[styles.tabSubtitle, selectedSetorId === setor.id && styles.tabSubtitleActive]}>
                    {motorById.get(setor.motorId)?.nome || 'Sem motor'} • {ocupadas}/{estruturas.length}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {selectedSetor && (
            <View style={styles.setorPanel}>
              <View style={styles.setorPanelHeader}>
                <View>
                  <Text style={styles.setorTitle}>{selectedSetor.nome}</Text>
                  <Text style={styles.setorSubtitle}>
                    {selectedSetorSummary.ocupadas} ocupadas • {selectedSetorSummary.vazias} vazias
                  </Text>
                </View>
                <View style={styles.setorActions}>
                  <TouchableOpacity style={styles.iconBtn} onPress={() => openEditSetorModal(selectedSetor)}>
                    <MaterialCommunityIcons name="pencil-outline" size={18} color={COLORS.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.iconBtn, styles.iconBtnDanger]}
                    onPress={() => handleDeleteSetor(selectedSetor)}
                  >
                    <MaterialCommunityIcons name="delete-outline" size={18} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.setorMetaRow}>
                <Text style={styles.setorMetaText}>
                  Capacidade: {selectedSetorSummary.capacidade} mudas
                </Text>
                <Text style={styles.setorMetaText}>
                  Livres: {selectedSetorSummary.livre}
                </Text>
                <Text style={styles.setorMetaText}>
                  Motor: {motorById.get(selectedSetor.motorId)?.nome || 'Não vinculado'}
                </Text>
              </View>

              <View style={styles.filterRow}>
                <TouchableOpacity
                  style={[styles.filterChip, benchFilter === 'todas' && styles.filterChipActive]}
                  onPress={() => setBenchFilter('todas')}
                >
                  <Text style={[styles.filterChipText, benchFilter === 'todas' && styles.filterChipTextActive]}>
                    Todas ({selectedSetorSummary.total})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterChip, benchFilter === 'ocupadas' && styles.filterChipActive]}
                  onPress={() => setBenchFilter('ocupadas')}
                >
                  <Text style={[styles.filterChipText, benchFilter === 'ocupadas' && styles.filterChipTextActive]}>
                    Ocupadas ({selectedSetorSummary.ocupadas})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterChip, benchFilter === 'vazias' && styles.filterChipActive]}
                  onPress={() => setBenchFilter('vazias')}
                >
                  <Text style={[styles.filterChipText, benchFilter === 'vazias' && styles.filterChipTextActive]}>
                    Vazias ({selectedSetorSummary.vazias})
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.addBenchBtn} onPress={openCreateEstruturaModal}>
                <MaterialCommunityIcons name="plus" size={18} color={COLORS.textLight} />
                <Text style={styles.addBenchBtnText}>Adicionar bancada no setor</Text>
              </TouchableOpacity>
            </View>
          )}

          {filteredEstruturas.length === 0 ? (
            <View style={styles.emptyBoxSmall}>
              <Text style={styles.emptyText}>Nenhuma bancada encontrada para este filtro.</Text>
            </View>
          ) : (
            <View style={styles.structureList}>
              {filteredEstruturas.map((estrutura) => {
                const ocupsAtivas = getEstruturaOcupacoesAtivas(estrutura.id, ocupacoes);
                const ocupacao = ocupsAtivas[0] || null;
                const ocupado = ocupsAtivas.reduce(
                  (sum, item) => sum + Number(item.quantidadeAlocada || 0),
                  0
                );
                const capacidade = Number(estrutura.capacidadePlantas || 0);
                const percentual = capacidade > 0 ? Math.min(100, Math.round((ocupado / capacidade) * 100)) : 0;
                const isOcupada = ocupado > 0;
                const isSource = movingFromOcupacao?.estruturaId === estrutura.id;
                const statusColor = isOcupada ? COLORS.success : COLORS.textMuted;
                const statusBg = isOcupada ? COLORS.successSoft : COLORS.surfaceMuted;

                return (
                  <View
                    key={estrutura.id}
                    style={[
                      styles.structureCard,
                      isSource && styles.structureCardSource,
                    ]}
                  >
                    <View style={styles.structureHeader}>
                      <View style={styles.structureHeaderLeft}>
                        <Text style={styles.structureName}>{estrutura.nome}</Text>
                        <Text style={styles.structureType}>
                          {ESTRUTURA_TYPE_LABEL[estrutura.tipo]} • Capacidade {capacidade} mudas
                        </Text>
                      </View>
                      <View style={[styles.statusPill, { backgroundColor: statusBg }]}>
                        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                        <Text style={[styles.statusText, { color: statusColor }]}>
                          {isOcupada ? 'Ocupada' : 'Vazia'}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.structureNumbers}>
                      {ocupado}/{capacidade} mudas
                    </Text>

                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${percentual}%`,
                            backgroundColor: isOcupada ? COLORS.success : COLORS.textMuted,
                          },
                        ]}
                      />
                    </View>

                    {ocupsAtivas.length > 0 ? (
                      <View style={styles.occupancyList}>
                        {ocupsAtivas.map((ocupacao) => (
                          <View key={ocupacao.id} style={styles.occupancyItem}>
                            <View style={styles.occupancyHeader}>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.occupancyTitle}>{ocupacao.cultura}</Text>
                                <Text style={styles.occupancyMeta}>
                                  {ocupacao.variedade || 'Variedade não informada'} •{' '}
                                  {STAGE_LABEL[ocupacao.fase] || ocupacao.fase} •{' '}
                                  {getCycleDays(ocupacao.dataInicio)} dias
                                </Text>
                                <Text style={styles.occupancyQty}>
                                  {ocupacao.quantidadeAlocada} un alocadas
                                </Text>
                              </View>
                            </View>

                            {!movingFromOcupacao && (
                              <View style={styles.cardActionsRow}>
                                <TouchableOpacity
                                  style={[
                                    styles.cardActionBtn,
                                    { backgroundColor: COLORS.successSoft, borderColor: COLORS.success },
                                  ]}
                                  onPress={() =>
                                    navigation.navigate('HidroponiaColheitaForm', {
                                      ocupacaoId: ocupacao.id,
                                      isSeedlingResale: estrutura.tipo === 'bercario',
                                    })
                                  }
                                >
                                  <MaterialCommunityIcons
                                    name={estrutura.tipo === 'bercario' ? 'cart-outline' : 'check-decagram'}
                                    size={18}
                                    color={COLORS.success}
                                  />
                                  <Text style={[styles.cardActionText, { color: COLORS.success }]}>
                                    {estrutura.tipo === 'bercario' ? 'Vender' : 'Colher'}
                                  </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  style={styles.cardActionBtn}
                                  onPress={() => setMovingFromOcupacao(ocupacao)}
                                >
                                  <MaterialCommunityIcons
                                    name="swap-horizontal"
                                    size={18}
                                    color={COLORS.primary}
                                  />
                                  <Text style={styles.cardActionText}>Mover</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  style={[styles.cardActionBtn, styles.cardActionDanger]}
                                  onPress={() => handleEncerrarOcupacao(ocupacao)}
                                >
                                  <MaterialCommunityIcons
                                    name="stop-circle-outline"
                                    size={18}
                                    color={COLORS.danger}
                                  />
                                  <Text style={[styles.cardActionText, styles.cardActionDangerText]}>
                                    Encerrar
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            )}
                          </View>
                        ))}
                      </View>
                    ) : (
                      <View style={styles.occupancyBox}>
                        <Text style={styles.occupancyEmpty}>Bancada vazia para nova produção.</Text>
                      </View>
                    )}

                    {movingFromOcupacao ? (
                      <TouchableOpacity
                        style={[styles.destinationBtn, isSource && styles.destinationBtnDisabled]}
                        onPress={() => handleSelectDestination(estrutura)}
                        disabled={isSource}
                      >
                        <MaterialCommunityIcons
                          name="arrow-right-bold-circle-outline"
                          size={18}
                          color={COLORS.textLight}
                        />
                        <Text style={styles.destinationBtnText}>
                          {isSource ? 'Origem selecionada' : 'Escolher como destino'}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={[styles.cardActionsRow, { marginTop: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10 }]}>
                        <TouchableOpacity
                          style={[styles.cardActionBtn, { flex: 1 }]}
                          onPress={() => openEditEstruturaModal(estrutura)}
                        >
                          <MaterialCommunityIcons name="pencil-outline" size={18} color={COLORS.primary} />
                          <Text style={styles.cardActionText}>Configurar Bancada</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.cardActionBtn, styles.cardActionDanger, { flex: 1 }]}
                          onPress={() => handleDeleteEstrutura(estrutura, ocupsAtivas.length > 0)}
                        >
                          <MaterialCommunityIcons name="delete-outline" size={18} color={COLORS.danger} />
                          <Text style={[styles.cardActionText, styles.cardActionDangerText]}>
                            Excluir Bancada
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </>
      )}

      <Modal visible={setorModalVisible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{editingSetor ? 'Editar setor' : 'Novo setor'}</Text>
            <Text style={styles.inputLabel}>Nome do setor</Text>
            <TextInput
              style={styles.input}
              value={newSetorName}
              onChangeText={setNewSetorName}
              placeholder="Ex.: Setor 1"
            />

            <Text style={styles.inputLabel}>Motor responsável</Text>
            {motores.length === 0 ? (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>Cadastre um motor antes de salvar o setor.</Text>
                <TouchableOpacity style={styles.warningBtn} onPress={openMotorManager}>
                  <Text style={styles.warningBtnText}>Cadastrar motor</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.optionWrap}>
                {motores.map((motor) => (
                  <TouchableOpacity
                    key={motor.id}
                    style={[
                      styles.optionChip,
                      newSetorMotorId === motor.id && styles.optionChipActive,
                    ]}
                    onPress={() => setNewSetorMotorId(motor.id)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        newSetorMotorId === motor.id && styles.optionTextActive,
                      ]}
                    >
                      {motor.nome}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setSetorModalVisible(false)} disabled={saving}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleSaveSetor} disabled={saving}>
                <Text style={styles.confirmText}>{saving ? 'Salvando...' : 'Salvar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={estruturaModalVisible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{editingEstrutura ? 'Editar bancada' : 'Nova bancada'}</Text>

            <Text style={styles.inputLabel}>Nome da bancada</Text>
            <TextInput
              style={styles.input}
              value={newEstruturaName}
              onChangeText={setNewEstruturaName}
              placeholder="Ex.: Perfil A1"
            />

            <Text style={styles.inputLabel}>Capacidade de mudas</Text>
            <TextInput
              style={styles.input}
              value={newEstruturaCapacity}
              onChangeText={setNewEstruturaCapacity}
              keyboardType="numeric"
              placeholder="Ex.: 256"
            />

            <Text style={styles.inputLabel}>Tipo de estrutura</Text>
            <View style={styles.optionWrap}>
              {ESTRUTURA_TYPES.map((tipo) => (
                <TouchableOpacity
                  key={tipo.value}
                  style={[
                    styles.optionChip,
                    newEstruturaType === tipo.value && styles.optionChipActive,
                  ]}
                  onPress={() => setNewEstruturaType(tipo.value)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      newEstruturaType === tipo.value && styles.optionTextActive,
                    ]}
                  >
                    {tipo.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEstruturaModalVisible(false)} disabled={saving}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleSaveEstrutura} disabled={saving}>
                <Text style={styles.confirmText}>{saving ? 'Salvando...' : 'Salvar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },

  header: {
    backgroundColor: COLORS.secondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  headerTitleWrap: { flex: 1 },
  headerActionsWrap: { flexDirection: 'column', gap: 8, alignItems: 'flex-end' },
  title: { color: COLORS.textLight, fontSize: 22, fontWeight: '900' },
  subtitle: { color: COLORS.whiteAlpha80, fontSize: 13, marginTop: 2 },
  headerActionBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerActionBtnText: { color: COLORS.textLight, fontWeight: '800', fontSize: 12 },
  statsGrid: {
    marginTop: SPACING.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  statBox: {
    width: '48%',
    backgroundColor: COLORS.whiteAlpha10,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  statValue: { color: COLORS.textLight, fontSize: 18, fontWeight: '900' },
  statLabel: { color: COLORS.whiteAlpha80, fontSize: 11, marginTop: 2 },
  capacityText: { color: COLORS.whiteAlpha80, fontSize: 12, marginTop: SPACING.sm },

  moveAlert: {
    backgroundColor: COLORS.primarySoft,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    padding: 12,
    marginBottom: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  moveAlertText: { flex: 1, color: COLORS.primary, fontSize: 13, fontWeight: '700' },
  moveCancelBtn: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tabs: { gap: 8, marginBottom: SPACING.md, paddingRight: SPACING.md },
  tab: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minWidth: 140,
  },
  tabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabTitle: { color: COLORS.textPrimary, fontWeight: '900', fontSize: 13 },
  tabTitleActive: { color: COLORS.textLight },
  tabSubtitle: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },
  tabSubtitleActive: { color: COLORS.whiteAlpha80 },

  setorPanel: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  setorPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  setorTitle: { fontSize: 17, color: COLORS.textPrimary, fontWeight: '900' },
  setorSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  setorActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceMuted,
  },
  iconBtnDanger: { borderColor: COLORS.dangerSoft, backgroundColor: COLORS.dangerSoft },
  setorMetaRow: {
    marginTop: SPACING.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  setorMetaText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },

  filterRow: { flexDirection: 'row', gap: 8, marginTop: SPACING.md },
  filterChip: {
    flex: 1,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceMuted,
    paddingVertical: 9,
    alignItems: 'center',
  },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
  filterChipTextActive: { color: COLORS.textLight },

  addBenchBtn: {
    marginTop: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  addBenchBtnText: { color: COLORS.textLight, fontWeight: '800', fontSize: 13 },

  structureList: { gap: SPACING.sm },
  structureCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    ...SHADOWS.card,
  },
  structureCardSource: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  structureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  structureHeaderLeft: { flex: 1 },
  structureName: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '900' },
  structureType: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  statusPill: {
    alignSelf: 'flex-start',
    borderRadius: RADIUS.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: '900' },
  structureNumbers: {
    marginTop: SPACING.sm,
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '900',
  },
  progressTrack: {
    marginTop: 8,
    height: 7,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceMuted,
    overflow: 'hidden',
  },
  progressFill: { height: '100%' },
  occupancyList: {
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  occupancyItem: {
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.md,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  occupancyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  occupancyTitle: { color: COLORS.textPrimary, fontWeight: '900', fontSize: 13 },
  occupancyMeta: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },
  occupancyQty: { color: COLORS.primary, fontSize: 11, fontWeight: '800', marginTop: 4 },
  occupancyBox: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.md,
    padding: 10,
  },
  occupancyEmpty: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },

  cardActionsRow: {
    marginTop: SPACING.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cardActionBtn: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceMuted,
    paddingVertical: 9,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardActionDisabled: { backgroundColor: COLORS.surface },
  cardActionDanger: { borderColor: COLORS.dangerSoft, backgroundColor: COLORS.dangerSoft },
  cardActionText: { color: COLORS.primary, fontSize: 12, fontWeight: '800' },
  cardActionTextDisabled: { color: COLORS.textMuted },
  cardActionDangerText: { color: COLORS.danger },

  destinationBtn: {
    marginTop: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  destinationBtnDisabled: {
    backgroundColor: COLORS.textMuted,
  },
  destinationBtnText: { color: COLORS.textLight, fontWeight: '900', fontSize: 13 },

  emptyBox: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
    gap: 8,
    ...SHADOWS.card,
  },
  emptyBoxSmall: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    padding: 20,
    alignItems: 'center',
  },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '900' },
  emptyText: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center' },
  primaryBtn: {
    marginTop: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryBtnText: { color: COLORS.textLight, fontWeight: '800' },

  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modal: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
  },
  modalTitle: { fontSize: 18, color: COLORS.textPrimary, fontWeight: '900', marginBottom: SPACING.md },
  inputLabel: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700', marginBottom: 6 },
  input: {
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  optionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2, marginBottom: SPACING.md },
  optionChip: {
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  optionChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  optionText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
  optionTextActive: { color: COLORS.textLight },
  warningBox: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surfaceMuted,
    padding: 10,
    marginBottom: SPACING.md,
    gap: 8,
  },
  warningText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
  warningBtn: {
    alignSelf: 'flex-start',
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  warningBtnText: { color: COLORS.textLight, fontSize: 12, fontWeight: '800' },
  modalActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
  },
  confirmBtn: {
    flex: 1,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
  },
  cancelText: { color: COLORS.textSecondary, fontWeight: '800' },
  confirmText: { color: COLORS.textLight, fontWeight: '800' },
});

export default HidroponiaEstufaLayoutScreen;
