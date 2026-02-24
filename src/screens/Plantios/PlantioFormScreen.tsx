// src/screens/Plantios/PlantioFormScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { createPlantio } from '../../services/plantioService';
import { Timestamp } from 'firebase/firestore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS } from '../../constants/theme';

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
    if (!targetId || !estufaId) return Alert.alert('Erro', 'Sessão ou estufa inválida.');
    if (!cultura || !quantidadePlantada) return Alert.alert('Atenção', 'Preencha a cultura e a quantidade.');

    setLoading(true);
    try {
      await createPlantio({
        estufaId, cultura, variedade: variedade || null, quantidadePlantada: Number(quantidadePlantada), unidadeQuantidade,
        cicloDias: cicloDias ? Number(cicloDias) : null, dataPlantio: Timestamp.fromDate(dataPlantio),
        status: 'em_desenvolvimento', precoEstimadoUnidade: null, fornecedorId: null
      }, targetId);
      Alert.alert('Sucesso', 'Novo ciclo iniciado!');
      navigation.navigate('EstufaDetail', { estufaId });
    } catch { Alert.alert('Erro', 'Não foi possível salvar.'); } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={styles.card}>
          <View style={styles.header}>
            <MaterialCommunityIcons name="sprout" size={32} color={COLORS.primary} />
            <Text style={styles.title}>Iniciar Novo Ciclo</Text>
          </View>

          <Text style={styles.label}>Cultura *</Text>
          <View style={styles.inputWrapper}>
              <TextInput style={styles.input} value={cultura} onChangeText={setCultura} placeholder="Ex: Tomate, Alface..." placeholderTextColor={COLORS.textPlaceholder} />
          </View>

          <Text style={styles.label}>Variedade (Opcional)</Text>
          <View style={styles.inputWrapper}>
              <TextInput style={styles.input} value={variedade} onChangeText={setVariedade} placeholder="Ex: Carmem, San Marzano..." placeholderTextColor={COLORS.textPlaceholder} />
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.label}>Quantidade *</Text>
              <View style={styles.inputWrapper}>
                  <TextInput style={styles.input} value={quantidadePlantada} onChangeText={setQuantidadePlantada} keyboardType="numeric" placeholder="Ex: 500" placeholderTextColor={COLORS.textPlaceholder} />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Unidade</Text>
              <View style={styles.inputWrapper}>
                  <TextInput style={styles.input} value={unidadeQuantidade} onChangeText={setUnidadeQuantidade} placeholder="Ex: Mudas" placeholderTextColor={COLORS.textPlaceholder} />
              </View>
            </View>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.label}>Data do Plantio *</Text>
              <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
                <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 16 }}>{dataPlantio.toLocaleDateString('pt-BR')}</Text>
              </TouchableOpacity>
              {showDatePicker && <DateTimePicker value={dataPlantio} mode="date" display="default" onChange={(e, d) => { setShowDatePicker(false); if(d) setDataPlantio(d); }} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Ciclo (Dias)</Text>
              <View style={styles.inputWrapper}>
                  <TextInput style={styles.input} value={cicloDias} onChangeText={setCicloDias} keyboardType="numeric" placeholder="Ex: 90" placeholderTextColor={COLORS.textPlaceholder} />
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Confirmar Plantio</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  card: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 20, elevation: 2, borderWidth: 1, borderColor: COLORS.border },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 15 },
  title: { fontSize: 20, fontWeight: 'bold', color: COLORS.primary, marginLeft: 10 },
  label: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6 },
  inputWrapper: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.borderDark, marginBottom: 15, height: 56, justifyContent: 'center' },
  input: { paddingHorizontal: 15, fontSize: 16, color: '#000000', height: '100%', fontWeight: 'bold' },
  dateBtn: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.borderDark, marginBottom: 15, height: 56, justifyContent: 'center', paddingHorizontal: 15 },
  row: { flexDirection: 'row' },
  saveBtn: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10, elevation: 2 },
  saveBtnText: { color: '#FFF', fontSize: 18, fontWeight: '800' }
});

export default PlantioFormScreen;