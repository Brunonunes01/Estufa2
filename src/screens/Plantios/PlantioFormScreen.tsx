// src/screens/Plantios/PlantioFormScreen.tsx
import React, { useState } from 'react';
import { 
  View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator 
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { createPlantio } from '../../services/plantioService';
import { Timestamp } from 'firebase/firestore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

const COLORS = {
  background: '#F8FAFC',
  card: '#FFFFFF',
  primary: '#059669',
  border: '#E2E8F0',
  textMain: '#1E293B',
  textSub: '#64748B',
  danger: '#EF4444'
};

const PlantioFormScreen = ({ route, navigation }: any) => {
  const { user, selectedTenantId } = useAuth();
  const { estufaId } = route.params || {};

  const [loading, setLoading] = useState(false);
  
  const [cultura, setCultura] = useState('Tomate Italiano');
  const [variedade, setVariedade] = useState('');
  const [quantidadePlantada, setQuantidadePlantada] = useState('');
  const [unidadeQuantidade, setUnidadeQuantidade] = useState('Mudas');
  const [cicloDias, setCicloDias] = useState('90');
  const [dataPlantio, setDataPlantio] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleSave = async () => {
    const targetId = selectedTenantId || user?.uid;
    if (!targetId) return Alert.alert('Erro', 'Usuário não autenticado.');
    if (!estufaId) return Alert.alert('Erro', 'Nenhuma estufa selecionada.');
    
    if (!cultura || !quantidadePlantada) {
      return Alert.alert('Atenção', 'Preencha a cultura e a quantidade plantada.');
    }

    setLoading(true);
    try {
      const novoPlantio = {
        estufaId,
        cultura,
        variedade: variedade || null,
        quantidadePlantada: Number(quantidadePlantada),
        unidadeQuantidade,
        cicloDias: cicloDias ? Number(cicloDias) : null,
        dataPlantio: Timestamp.fromDate(dataPlantio),
        status: 'em_desenvolvimento' as "em_desenvolvimento" | "em_colheita" | "finalizado",
        precoEstimadoUnidade: null,
        fornecedorId: null
      };

      await createPlantio(novoPlantio, targetId);
      
      Alert.alert('Sucesso', 'Novo ciclo iniciado com sucesso!');
      
      // A MÁGICA ACONTECE AQUI:
      // Em vez de goBack(), forçamos a navegação de volta injetando o ID novamente
      navigation.navigate('EstufaDetail', { estufaId: estufaId });
      
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Não foi possível salvar o plantio.');
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDataPlantio(selectedDate);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <View style={styles.card}>
        <View style={styles.header}>
          <MaterialCommunityIcons name="sprout" size={32} color={COLORS.primary} />
          <Text style={styles.title}>Iniciar Novo Ciclo</Text>
        </View>

        <Text style={styles.label}>Cultura *</Text>
        <TextInput
          style={styles.input}
          value={cultura}
          onChangeText={setCultura}
          placeholder="Ex: Tomate, Alface..."
        />

        <Text style={styles.label}>Variedade (Opcional)</Text>
        <TextInput
          style={styles.input}
          value={variedade}
          onChangeText={setVariedade}
          placeholder="Ex: San Marzano, Carmem..."
        />

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
            <Text style={styles.label}>Quantidade *</Text>
            <TextInput
              style={styles.input}
              value={quantidadePlantada}
              onChangeText={setQuantidadePlantada}
              keyboardType="numeric"
              placeholder="Ex: 500"
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Unidade</Text>
            <TextInput
              style={styles.input}
              value={unidadeQuantidade}
              onChangeText={setUnidadeQuantidade}
              placeholder="Ex: Mudas, Sementes"
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
            <Text style={styles.label}>Data do Plantio *</Text>
            <TouchableOpacity 
              style={[styles.input, { justifyContent: 'center', height: 50 }]} 
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={{ color: COLORS.textMain }}>
                {dataPlantio.toLocaleDateString('pt-BR')}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={dataPlantio}
                mode="date"
                display="default"
                onChange={onDateChange}
              />
            )}
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Ciclo (Dias)</Text>
            <TextInput
              style={[styles.input, { height: 50 }]}
              value={cicloDias}
              onChangeText={setCicloDias}
              keyboardType="numeric"
              placeholder="Ex: 90"
            />
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.saveButton, loading && { opacity: 0.7 }]} 
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveButtonText}>Confirmar Plantio</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 15,
  },
  title: { fontSize: 20, fontWeight: 'bold', color: COLORS.primary, marginLeft: 10 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.textSub, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    color: COLORS.textMain,
    marginBottom: 16,
    backgroundColor: '#F8FAFC',
    minHeight: 50,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  inputGroup: { flex: 1 },
  saveButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});

export default PlantioFormScreen;