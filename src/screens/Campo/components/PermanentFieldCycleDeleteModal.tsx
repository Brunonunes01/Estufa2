import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../../constants/theme';
import { queryKeys } from '../../../lib/queryClient';
import { removeFieldCycle } from '../../../services/plantioService';
import { verifyCurrentUserPassword } from '../../../services/securityService';
import { Plantio } from '../../../types/domain';

export type FieldCycleDeleteTarget = {
  id: string;
  cultura: string;
};

type PermanentFieldCycleDeleteModalProps = {
  target: FieldCycleDeleteTarget | null;
  tenantId?: string;
  onClose: () => void;
};

const PermanentFieldCycleDeleteModal = ({
  target,
  tenantId,
  onClose,
}: PermanentFieldCycleDeleteModalProps) => {
  const queryClient = useQueryClient();
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setPassword('');
  }, [target?.id]);

  const handleClose = () => {
    if (deleting) return;
    setPassword('');
    onClose();
  };

  const handleConfirm = async () => {
    if (!target || !tenantId) {
      Alert.alert('Sessão expirada', 'Entre novamente para excluir o ciclo.');
      return;
    }
    if (!password.trim()) {
      Alert.alert('Atenção', 'Digite a senha do proprietário.');
      return;
    }

    setDeleting(true);
    try {
      const validPassword = await verifyCurrentUserPassword(password.trim());
      if (!validPassword) {
        Alert.alert(
          'Senha inválida',
          'A senha do proprietário está incorreta.'
        );
        return;
      }

      const result = await removeFieldCycle(target.id, tenantId);
      const deletedOperationalRecords =
        result.deletedVendas +
        result.deletedColheitas +
        result.deletedAplicacoes +
        result.deletedManejos +
        result.deletedTarefas +
        result.deletedOperationalDespesas;

      queryClient.setQueryData<Plantio[]>(
        queryKeys.plantiosList(tenantId),
        (current = []) => current.filter((item) => item.id !== target.id)
      );
      setPassword('');
      onClose();
      void queryClient.invalidateQueries();

      Alert.alert(
        'Ciclo excluído',
        result.hadHistory
          ? `O ciclo e ${deletedOperationalRecords} registro(s) do histórico foram excluídos permanentemente.${
              result.restoredInsumos > 0
                ? ` O estoque de ${result.restoredInsumos} insumo(s) foi recomposto.`
                : ''
            }`
          : 'O ciclo vazio foi excluído definitivamente.'
      );
    } catch (error: unknown) {
      Alert.alert(
        'Falha na exclusão',
        error instanceof Error
          ? error.message
          : 'Não foi possível excluir permanentemente o ciclo.'
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      visible={!!target}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Excluir ciclo permanentemente</Text>
          <Text style={styles.cycleName}>
            {target?.cultura || 'Ciclo selecionado'}
          </Text>
          <Text style={styles.description}>
            Esta ação é irreversível. O ciclo e todo o histórico vinculado serão
            apagados. Digite a senha do proprietário para confirmar.
          </Text>

          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Senha do proprietário"
            placeholderTextColor={COLORS.textPlaceholder}
            secureTextEntry
            autoFocus
            editable={!deleting}
            onSubmitEditing={() => void handleConfirm()}
          />

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={deleting}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => void handleConfirm()}
              disabled={deleting}
            >
              {deleting ? (
                <ActivityIndicator color={COLORS.textLight} />
              ) : (
                <Text style={styles.deleteText}>Excluir</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.68)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  card: {
    width: '100%',
    maxWidth: 430,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    padding: SPACING.xl,
    ...SHADOWS.card,
  },
  title: {
    color: COLORS.danger,
    fontSize: 18,
    fontWeight: '900',
  },
  cycleName: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    marginTop: SPACING.sm,
  },
  description: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: SPACING.sm,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    color: COLORS.textPrimary,
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.lg,
    backgroundColor: COLORS.background,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  cancelButton: {
    flex: 1,
    minHeight: 46,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    color: COLORS.textSecondary,
    fontWeight: '800',
  },
  deleteButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: {
    color: COLORS.textLight,
    fontWeight: '900',
  },
});

export default PermanentFieldCycleDeleteModal;
