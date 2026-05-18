import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TarefaAgricola } from '../../types/domain';
import { COLORS, SPACING } from '../../constants/theme';
import SectionHeading from '../ui/SectionHeading';
import { useThemeMode } from '../../hooks/useThemeMode';

interface TodayTasksProps {
  tasks: TarefaAgricola[];
  onOpenPlantio: (plantioId: string) => void;
  onOpenTasks: () => void;
  onCompleteTask?: (taskId: string) => void;
}

const prioridadeCor: Record<TarefaAgricola['prioridade'], string> = {
  baixa: COLORS.success,
  media: COLORS.warning,
  alta: COLORS.danger,
  critica: COLORS.danger,
};

const TodayTasks = ({ tasks, onOpenPlantio, onOpenTasks, onCompleteTask }: TodayTasksProps) => {
  const theme = useThemeMode();

  return (
    <View style={styles.wrap}>
      <SectionHeading
        title="O Que Fazer Hoje"
        right={(
          <View style={styles.headerRight}>
            <Text style={[styles.count, { color: theme.textSecondary }]}>{tasks.length}</Text>
            <TouchableOpacity style={styles.manageBtn} onPress={onOpenTasks} activeOpacity={0.85}>
              <Text style={styles.manageBtnText}>Gerenciar</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {tasks.length === 0 ? (
        <View style={[styles.emptyBox, { borderColor: theme.border, backgroundColor: theme.surfaceMuted }]}>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Sem tarefas pendentes para hoje.</Text>
        </View>
      ) : (
        tasks.slice(0, 6).map((task) => (
          <View
            key={task.id}
            style={[styles.row, { borderColor: theme.border, backgroundColor: theme.surfaceBackground }]}
          >
            <TouchableOpacity style={styles.openArea} onPress={() => onOpenPlantio(task.plantioId)} activeOpacity={0.85}>
              <MaterialCommunityIcons name="calendar-check" size={18} color={prioridadeCor[task.prioridade]} />
              <View style={styles.content}>
                <Text style={[styles.taskType, { color: theme.textPrimary }]}>{task.tipoTarefa.toUpperCase()}</Text>
                <Text style={[styles.obs, { color: theme.textSecondary }]} numberOfLines={1}>
                  {task.observacoes || 'Sem observações'}
                </Text>
              </View>
              <Text style={[styles.priority, { color: prioridadeCor[task.prioridade] }]}>
                {task.prioridade.toUpperCase()}
              </Text>
            </TouchableOpacity>
            {onCompleteTask ? (
              <TouchableOpacity style={styles.doneBtn} onPress={() => onCompleteTask(task.id)} activeOpacity={0.85}>
                <MaterialCommunityIcons name="check" size={14} color={COLORS.textLight} />
              </TouchableOpacity>
            ) : null}
          </View>
        ))
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginBottom: SPACING.lg },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  count: { fontSize: 12, fontWeight: '800' },
  manageBtn: {
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manageBtnText: { color: COLORS.textLight, fontSize: 11, fontWeight: '800' },
  emptyBox: { borderRadius: 12, borderWidth: 1, padding: 14 },
  emptyText: { fontSize: 13, fontWeight: '600' },
  row: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  openArea: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  content: { flex: 1 },
  taskType: { fontSize: 12, fontWeight: '800' },
  obs: { fontSize: 12, marginTop: 2, opacity: 0.8 },
  priority: { fontSize: 11, fontWeight: '900' },
  doneBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default React.memo(TodayTasks);
