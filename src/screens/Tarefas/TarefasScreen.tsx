import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useIsFocused } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Timestamp } from 'firebase/firestore';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { listAllPlantios } from '../../services/plantioService';
import {
  createTarefaAgricola,
  cancelTarefaAgricola,
  deleteTarefaAgricola,
  listTarefasPendentes,
  updateTarefaStatus,
} from '../../services/tarefaAgricolaService';
import { Plantio, TarefaAgricola } from '../../types/domain';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/theme';
import EmptyState from '../../components/ui/EmptyState';
import { queryKeys } from '../../lib/queryClient';
import { RootStackParamList } from '../../navigation/types';

const tipoOptions: { label: string; value: TarefaAgricola['tipoTarefa'] }[] = [
  { label: 'Irrigação', value: 'irrigacao' },
  { label: 'Adubação', value: 'adubacao' },
  { label: 'Manejo', value: 'manejo' },
  { label: 'Colheita', value: 'colheita' },
  { label: 'Inspeção', value: 'inspecao' },
  { label: 'Outro', value: 'outro' },
];

const prioridadeOptions: { label: string; value: TarefaAgricola['prioridade'] }[] = [
  { label: 'Baixa', value: 'baixa' },
  { label: 'Média', value: 'media' },
  { label: 'Alta', value: 'alta' },
  { label: 'Crítica', value: 'critica' },
];

const prioridadeCor: Record<TarefaAgricola['prioridade'], string> = {
  baixa: COLORS.success,
  media: COLORS.warning,
  alta: COLORS.danger,
  critica: COLORS.danger,
};

type TarefasScreenProps = NativeStackScreenProps<RootStackParamList, 'Tarefas'>;
type DateFilter = 'today' | 'overdue' | 'next7' | 'all';

const TarefasScreen = ({ navigation }: TarefasScreenProps) => {
  const { user, selectedTenantId } = useAuth();
  const isFocused = useIsFocused();
  const queryClient = useQueryClient();

  const [plantios, setPlantios] = useState<Plantio[]>([]);
  const [tasks, setTasks] = useState<TarefaAgricola[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [plantioId, setPlantioId] = useState<string>('');
  const [tipoTarefa, setTipoTarefa] = useState<TarefaAgricola['tipoTarefa']>('manejo');
  const [prioridade, setPrioridade] = useState<TarefaAgricola['prioridade']>('media');
  const [status, setStatus] = useState<TarefaAgricola['status']>('pendente');
  const [observacoes, setObservacoes] = useState('');
  const [dueDate, setDueDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [taskToCancel, setTaskToCancel] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [plantioFilter, setPlantioFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | TarefaAgricola['prioridade']>('all');

  const targetId = selectedTenantId || user?.uid;

  const normalizeDueDate = (value: Date) => {
    const normalized = new Date(value);
    // Meio-dia local reduz risco de deslocamento de data por timezone/UTC.
    normalized.setHours(12, 0, 0, 0);
    return normalized;
  };

  const syncDashboard = async () => {
    if (!targetId) return;
    await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(targetId) });
  };

  const loadData = async () => {
    if (!targetId) return;
    setLoading(true);
    try {
      const [plantiosRes, tarefasRes] = await Promise.all([
        listAllPlantios(targetId),
        listTarefasPendentes(targetId),
      ]);

      const activePlantios = plantiosRes.filter(
        (item) => item.status !== 'finalizado' && item.status !== 'cancelado'
      );

      setPlantios(activePlantios);
      setTasks(tarefasRes);
      if (!plantioId && activePlantios.length > 0) {
        setPlantioId(activePlantios[0].id);
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar as tarefas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) loadData();
  }, [isFocused, targetId]);

  const selectedPlantio = useMemo(
    () => plantios.find((item) => item.id === plantioId) || null,
    [plantios, plantioId]
  );

  const formatDate = (value: Timestamp) =>
    value.toDate().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

  const getTaskTimeMs = (task: TarefaAgricola) => {
    const value = task.dataPrevista as any;
    if (typeof value?.toMillis === 'function') return value.toMillis();
    if (typeof value?.seconds === 'number') return value.seconds * 1000;
    return NaN;
  };

  const filteredTasks = useMemo(() => {
    const startToday = new Date();
    startToday.setHours(0, 0, 0, 0);
    const endToday = new Date();
    endToday.setHours(23, 59, 59, 999);
    const end7 = new Date(endToday);
    end7.setDate(end7.getDate() + 7);

    return tasks.filter((task) => {
      const ms = getTaskTimeMs(task);
      if (!Number.isFinite(ms)) return false;

      if (dateFilter === 'today' && (ms < startToday.getTime() || ms > endToday.getTime())) {
        return false;
      }
      if (dateFilter === 'overdue' && ms >= startToday.getTime()) {
        return false;
      }
      if (dateFilter === 'next7' && (ms < startToday.getTime() || ms > end7.getTime())) {
        return false;
      }

      if (plantioFilter !== 'all' && task.plantioId !== plantioFilter) {
        return false;
      }

      if (priorityFilter !== 'all' && task.prioridade !== priorityFilter) {
        return false;
      }

      return true;
    });
  }, [tasks, dateFilter, plantioFilter, priorityFilter]);

  const handleCreateTask = async () => {
    if (!targetId) return;
    if (!plantioId) {
      Alert.alert('Atenção', 'Selecione um plantio para criar a tarefa.');
      return;
    }

    setSaving(true);
    try {
      await createTarefaAgricola(
        {
          plantioId,
          estufaId: selectedPlantio?.estufaId,
          tipoTarefa,
          dataPrevista: Timestamp.fromDate(normalizeDueDate(dueDate)),
          status,
          prioridade,
          observacoes: observacoes.trim() || null,
        },
        targetId
      );

      setObservacoes('');
      setStatus('pendente');
      setPrioridade('media');
      setTipoTarefa('manejo');
      setDueDate(new Date());
      setShowForm(false);
      await loadData();
      await syncDashboard();
      Alert.alert('Sucesso', 'Tarefa criada.');
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Não foi possível criar a tarefa.');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkDone = async (taskId: string) => {
    if (!targetId) return;
    try {
      await updateTarefaStatus(taskId, 'concluida', targetId);
      await loadData();
      await syncDashboard();
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Não foi possível concluir a tarefa.');
    }
  };

  const handleMarkInProgress = async (taskId: string) => {
    if (!targetId) return;
    try {
      await updateTarefaStatus(taskId, 'em_andamento', targetId);
      await loadData();
      await syncDashboard();
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Não foi possível atualizar a tarefa.');
    }
  };

  const handleOpenCancel = (taskId: string) => {
    setTaskToCancel(taskId);
    setCancelReason('');
    setCancelModalVisible(true);
  };

  const handleConfirmCancel = async () => {
    if (!targetId || !taskToCancel) return;
    if (!cancelReason.trim()) {
      Alert.alert('Atenção', 'Informe o motivo do cancelamento.');
      return;
    }
    try {
      await cancelTarefaAgricola(taskToCancel, cancelReason, targetId);
      setCancelModalVisible(false);
      setTaskToCancel(null);
      setCancelReason('');
      await loadData();
      await syncDashboard();
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Não foi possível cancelar a tarefa.');
    }
  };

  const handleDeleteTask = (taskId: string) => {
    if (!targetId) return;
    Alert.alert(
      'Excluir tarefa',
      'Essa ação remove a tarefa permanentemente. Deseja continuar?',
      [
        { text: 'Não', style: 'cancel' },
        {
          text: 'Sim, excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTarefaAgricola(taskId, targetId);
              await loadData();
              await syncDashboard();
            } catch (error: any) {
              Alert.alert('Erro', error?.message || 'Não foi possível excluir a tarefa.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.sectionTitle}>Pendentes e em andamento</Text>
        <View style={styles.topBarRight}>
          <Text style={styles.counter}>{filteredTasks.length}</Text>
          <TouchableOpacity style={styles.toggleFormBtn} onPress={() => setShowForm((prev) => !prev)}>
            <Text style={styles.toggleFormBtnText}>{showForm ? 'Fechar' : 'Nova tarefa'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {!showForm ? (
        <View style={styles.filtersBox}>
          <View style={styles.filterChipsRow}>
            <TouchableOpacity
              style={[styles.filterChip, dateFilter === 'today' && styles.filterChipActive]}
              onPress={() => setDateFilter('today')}
            >
              <Text style={[styles.filterChipText, dateFilter === 'today' && styles.filterChipTextActive]}>Hoje</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterChip, dateFilter === 'overdue' && styles.filterChipActive]}
              onPress={() => setDateFilter('overdue')}
            >
              <Text style={[styles.filterChipText, dateFilter === 'overdue' && styles.filterChipTextActive]}>Atrasadas</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterChip, dateFilter === 'next7' && styles.filterChipActive]}
              onPress={() => setDateFilter('next7')}
            >
              <Text style={[styles.filterChipText, dateFilter === 'next7' && styles.filterChipTextActive]}>Próx. 7 dias</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterChip, dateFilter === 'all' && styles.filterChipActive]}
              onPress={() => setDateFilter('all')}
            >
              <Text style={[styles.filterChipText, dateFilter === 'all' && styles.filterChipTextActive]}>Todas</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.row}>
            <View style={styles.rowCol}>
              <Text style={styles.label}>Plantio</Text>
              <View style={styles.inputBox}>
                <Picker selectedValue={plantioFilter} onValueChange={(value: string) => setPlantioFilter(value)}>
                  <Picker.Item label="Todos os plantios" value="all" />
                  {plantios.map((item) => (
                    <Picker.Item
                      key={item.id}
                      value={item.id}
                      label={`${item.cultura}${item.variedade ? ` • ${item.variedade}` : ''}`}
                    />
                  ))}
                </Picker>
              </View>
            </View>
            <View style={styles.rowCol}>
              <Text style={styles.label}>Prioridade</Text>
              <View style={styles.inputBox}>
                <Picker
                  selectedValue={priorityFilter}
                  onValueChange={(value: 'all' | TarefaAgricola['prioridade']) => setPriorityFilter(value)}
                >
                  <Picker.Item label="Todas" value="all" />
                  {prioridadeOptions.map((item) => (
                    <Picker.Item key={item.value} label={item.label} value={item.value} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>
        </View>
      ) : null}

      {showForm ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Nova tarefa agrícola</Text>

          <Text style={styles.label}>Plantio</Text>
          <View style={styles.inputBox}>
            <Picker selectedValue={plantioId} onValueChange={(value: string) => setPlantioId(value)}>
              {plantios.map((item) => (
                <Picker.Item
                  key={item.id}
                  value={item.id}
                  label={`${item.cultura}${item.variedade ? ` • ${item.variedade}` : ''}`}
                />
              ))}
            </Picker>
          </View>

          <View style={styles.row}>
            <View style={styles.rowCol}>
              <Text style={styles.label}>Tipo</Text>
              <View style={styles.inputBox}>
                <Picker selectedValue={tipoTarefa} onValueChange={(value: TarefaAgricola['tipoTarefa']) => setTipoTarefa(value)}>
                  {tipoOptions.map((item) => (
                    <Picker.Item key={item.value} label={item.label} value={item.value} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.rowCol}>
              <Text style={styles.label}>Prioridade</Text>
              <View style={styles.inputBox}>
                <Picker selectedValue={prioridade} onValueChange={(value: TarefaAgricola['prioridade']) => setPrioridade(value)}>
                  {prioridadeOptions.map((item) => (
                    <Picker.Item key={item.value} label={item.label} value={item.value} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>

          <Text style={styles.label}>Prazo</Text>
          <View style={styles.quickRow}>
            <TouchableOpacity style={styles.quickBtn} onPress={() => setDueDate(normalizeDueDate(new Date()))}>
              <Text style={styles.quickBtnText}>Hoje</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                setDueDate(normalizeDueDate(tomorrow));
              }}
            >
              <Text style={styles.quickBtnText}>Amanhã</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickBtn} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.quickBtnText}>Escolher data</Text>
            </TouchableOpacity>
            <View style={styles.quickDateBadge}>
              <Text style={styles.quickDateText}>
                {dueDate.toLocaleDateString('pt-BR')}
              </Text>
            </View>
          </View>

          {showDatePicker ? (
            <DateTimePicker
              value={dueDate}
              mode="date"
              display="default"
              onChange={(_, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) {
                  setDueDate(normalizeDueDate(selectedDate));
                }
              }}
            />
          ) : null}

          <Text style={styles.label}>Status inicial</Text>
          <View style={styles.inputBox}>
            <Picker selectedValue={status} onValueChange={(value: TarefaAgricola['status']) => setStatus(value)}>
              <Picker.Item label="Pendente" value="pendente" />
              <Picker.Item label="Em andamento" value="em_andamento" />
            </Picker>
          </View>

          <Text style={styles.label}>Observações</Text>
          <TextInput
            style={styles.textArea}
            value={observacoes}
            onChangeText={setObservacoes}
            placeholder="Ex: revisar irrigação da estufa 2"
            placeholderTextColor={COLORS.textPlaceholder}
            multiline
          />

          <TouchableOpacity style={styles.primaryBtn} onPress={handleCreateTask} disabled={saving}>
            <Text style={styles.primaryBtnText}>{saving ? 'Salvando...' : 'Criar tarefa'}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {!showForm ? (
        <FlatList
          data={filteredTasks}
          keyExtractor={(item) => item.id}
          refreshing={loading}
          onRefresh={loadData}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            !loading ? (
              <EmptyState
                icon="calendar-check-outline"
                title="Sem tarefas abertas"
                description="Crie tarefas para organizar as atividades de hoje."
              />
            ) : null
          }
          renderItem={({ item }) => (
            <View style={styles.taskCard}>
              <View style={styles.taskTop}>
                <View style={styles.taskMain}>
                  <Text style={styles.taskType}>{item.tipoTarefa.toUpperCase()}</Text>
                  <Text style={styles.taskDesc}>{item.observacoes || 'Sem observações'}</Text>
                  <Text style={styles.taskMeta}>Prazo: {formatDate(item.dataPrevista)}</Text>
                </View>
                <Text style={[styles.priorityText, { color: prioridadeCor[item.prioridade] }]}>
                  {item.prioridade.toUpperCase()}
                </Text>
              </View>

              <View style={styles.actionsRow}>
                {item.status === 'pendente' ? (
                  <TouchableOpacity style={styles.secondaryBtn} onPress={() => handleMarkInProgress(item.id)}>
                    <MaterialCommunityIcons name="play-circle-outline" size={16} color={COLORS.info} />
                    <Text style={styles.secondaryBtnText}>Iniciar</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity style={styles.doneBtn} onPress={() => handleMarkDone(item.id)}>
                  <MaterialCommunityIcons name="check-circle-outline" size={16} color={COLORS.textLight} />
                  <Text style={styles.doneBtnText}>Concluir</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => handleOpenCancel(item.id)}>
                  <MaterialCommunityIcons name="close-circle-outline" size={16} color={COLORS.textLight} />
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteTask(item.id)}>
                  <MaterialCommunityIcons name="trash-can-outline" size={16} color={COLORS.textLight} />
                  <Text style={styles.deleteBtnText}>Excluir</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={() => navigation.navigate('PlantioDetail', { plantioId: item.plantioId })}
                >
                  <MaterialCommunityIcons name="leaf" size={16} color={COLORS.primary} />
                  <Text style={styles.secondaryBtnText}>Abrir ciclo</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      ) : null}

      <Modal visible={cancelModalVisible} transparent animationType="fade" onRequestClose={() => setCancelModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Cancelar tarefa</Text>
            <Text style={styles.modalSubtitle}>Informe o motivo do cancelamento.</Text>
            <TextInput
              style={styles.modalInput}
              value={cancelReason}
              onChangeText={setCancelReason}
              placeholder="Ex: chuva forte, atividade reagendada"
              placeholderTextColor={COLORS.textPlaceholder}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalSecondaryBtn} onPress={() => setCancelModalVisible(false)}>
                <Text style={styles.modalSecondaryText}>Voltar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalPrimaryBtn} onPress={handleConfirmCancel}>
                <Text style={styles.modalPrimaryText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: SPACING.lg },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggleFormBtn: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleFormBtnText: { fontSize: 12, fontWeight: '800', color: COLORS.textLight },
  filtersBox: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: 10,
    backgroundColor: COLORS.surface,
    marginBottom: 10,
  },
  filterChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  filterChip: {
    height: 30,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceMuted,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: { fontSize: 11, fontWeight: '700', color: COLORS.textPrimary },
  filterChipTextActive: { color: COLORS.textLight },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
    marginBottom: SPACING.lg,
  },
  sectionTitle: { fontSize: TYPOGRAPHY.title, fontWeight: '800', color: COLORS.textPrimary },
  label: { marginTop: 10, marginBottom: 4, fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  inputBox: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceMuted,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', gap: 10 },
  rowCol: { flex: 1 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  quickBtn: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceMuted,
    justifyContent: 'center',
  },
  quickBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary },
  quickDateBadge: {
    marginLeft: 'auto',
    height: 34,
    paddingHorizontal: 12,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.infoSoft,
    borderWidth: 1,
    borderColor: COLORS.cBFDBFE,
    justifyContent: 'center',
  },
  quickDateText: { fontSize: 12, fontWeight: '700', color: COLORS.info },
  textArea: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceMuted,
    paddingHorizontal: 12,
    paddingTop: 10,
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.body,
  },
  primaryBtn: {
    marginTop: 12,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: COLORS.textLight, fontSize: 14, fontWeight: '800' },

  counter: { fontSize: 12, fontWeight: '800', color: COLORS.textSecondary },
  listContent: { paddingBottom: 80 },
  taskCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    padding: 12,
    marginBottom: 10,
  },
  taskTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  taskMain: { flex: 1 },
  taskType: { fontSize: 12, fontWeight: '800', color: COLORS.textPrimary },
  taskDesc: { marginTop: 2, fontSize: 12, color: COLORS.textSecondary },
  taskMeta: { marginTop: 4, fontSize: 11, color: COLORS.textPlaceholder, fontWeight: '700' },
  priorityText: { fontSize: 11, fontWeight: '900' },
  actionsRow: { marginTop: 10, flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  secondaryBtn: {
    height: 34,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceMuted,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  secondaryBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary },
  doneBtn: {
    height: 34,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.success,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  doneBtnText: { fontSize: 12, fontWeight: '800', color: COLORS.textLight },
  cancelBtn: {
    height: 34,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.warning,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cancelBtnText: { fontSize: 12, fontWeight: '800', color: COLORS.textLight },
  deleteBtn: {
    height: 34,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.danger,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deleteBtnText: { fontSize: 12, fontWeight: '800', color: COLORS.textLight },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
  },
  modalTitle: { fontSize: TYPOGRAPHY.title, fontWeight: '800', color: COLORS.textPrimary },
  modalSubtitle: { marginTop: 6, fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  modalInput: {
    marginTop: 12,
    minHeight: 84,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceMuted,
    paddingHorizontal: 12,
    paddingTop: 10,
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.body,
  },
  modalActions: { marginTop: 12, flexDirection: 'row', gap: 8 },
  modalSecondaryBtn: {
    flex: 1,
    height: 40,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceMuted,
  },
  modalSecondaryText: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary },
  modalPrimaryBtn: {
    flex: 1,
    height: 40,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.warning,
  },
  modalPrimaryText: { fontSize: 12, fontWeight: '800', color: COLORS.textLight },
});

export default TarefasScreen;
