import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import LoadingButton from '../../../components/ui/LoadingButton';

interface VendasFilterModalProps {
  visible: boolean;
  onClose: () => void;
  onClear: () => void;
  theme: any;
  filterCliente: string;
  setFilterCliente: (value: string) => void;
  clientesList: any[];
  startDate: Date | null;
  setStartDate: (date: Date | null) => void;
  endDate: Date | null;
  setEndDate: (date: Date | null) => void;
  showStartPicker: boolean;
  setShowStartPicker: (show: boolean) => void;
  showEndPicker: boolean;
  setShowEndPicker: (show: boolean) => void;
}

const VendasFilterModal = ({
  visible,
  onClose,
  onClear,
  theme,
  filterCliente,
  setFilterCliente,
  clientesList,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  showStartPicker,
  setShowStartPicker,
  showEndPicker,
  setShowEndPicker,
}: VendasFilterModalProps) => {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
        <View style={[styles.modalContent, { backgroundColor: theme.surfaceBackground }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Filtros avançados</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Cliente</Text>
            <View style={[styles.pickerWrapper, { borderColor: theme.border, backgroundColor: theme.surfaceMuted }]}>
              <Picker 
                selectedValue={filterCliente} 
                onValueChange={setFilterCliente} 
                style={{ color: theme.textPrimary }}
                dropdownIconColor={theme.textPrimary}
              >
                <Picker.Item label="Todos os clientes" value="todos" />
                <Picker.Item label="Vendas avulsas" value="avulso" />
                {clientesList.map((c) => (
                  <Picker.Item key={c.id} label={c.nome} value={c.id} />
                ))}
              </Picker>
            </View>

            <Text style={[styles.label, { color: theme.textSecondary }]}>Período</Text>
            <View style={styles.dateRow}>
              <TouchableOpacity
                style={[styles.dateBtn, { borderColor: theme.border, backgroundColor: theme.surfaceMuted }]}
                onPress={() => setShowStartPicker(true)}
              >
                <Text style={[styles.dateBtnText, { color: theme.textPrimary }]}>
                  {startDate ? startDate.toLocaleDateString('pt-BR') : 'Início'}
                </Text>
                <MaterialCommunityIcons name="calendar" size={18} color={theme.info} />
              </TouchableOpacity>
              <Text style={[styles.dateSeparator, { color: theme.textSecondary }]}>até</Text>
              <TouchableOpacity
                style={[styles.dateBtn, { borderColor: theme.border, backgroundColor: theme.surfaceMuted }]}
                onPress={() => setShowEndPicker(true)}
              >
                <Text style={[styles.dateBtnText, { color: theme.textPrimary }]}>
                  {endDate ? endDate.toLocaleDateString('pt-BR') : 'Fim'}
                </Text>
                <MaterialCommunityIcons name="calendar" size={18} color={theme.info} />
              </TouchableOpacity>
            </View>

            {showStartPicker ? (
              <DateTimePicker
                value={startDate || new Date()}
                mode="date"
                display="default"
                onChange={(_, d) => {
                  setShowStartPicker(false);
                  if (d) setStartDate(d);
                }}
              />
            ) : null}

            {showEndPicker ? (
              <DateTimePicker
                value={endDate || new Date()}
                mode="date"
                display="default"
                onChange={(_, d) => {
                  setShowEndPicker(false);
                  if (d) setEndDate(d);
                }}
              />
            ) : null}
          </ScrollView>

          <View style={styles.modalActions}>
            <LoadingButton 
              label="Limpar" 
              variant="neutral" 
              onPress={onClear} 
              style={styles.actionBtn} 
            />
            <LoadingButton 
              label="Aplicar" 
              variant="primary" 
              onPress={onClose} 
              style={styles.actionBtn} 
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    maxHeight: '85%',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pickerWrapper: {
    borderWidth: 1.5,
    borderRadius: 14,
    overflow: 'hidden',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  dateBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
  },
  dateBtnText: {
    fontWeight: '700',
    fontSize: 14,
  },
  dateSeparator: {
    fontWeight: '800',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 32,
    gap: 12,
  },
  actionBtn: {
    flex: 1,
  },
});

export default React.memo(VendasFilterModal);
