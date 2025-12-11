// src/screens/Insumos/InsumoFormScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, Alert, StyleSheet, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker'; 
import { createInsumo, updateInsumo, getInsumoById, InsumoFormData } from '../../services/insumoService';
import { useAuth } from '../../hooks/useAuth';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const COLORS = {
  background: '#F3F4F6',
  surface: '#FFFFFF',
  primary: '#8B5CF6',
  border: '#E5E7EB',
  inputBg: '#F9FAFB',
  textDark: '#111827',
};

const InsumoFormScreen = ({ route, navigation }: any) => {
  const { user, selectedTenantId } = useAuth();
  const insumoId = route.params?.insumoId;
  const isEditMode = !!insumoId;

  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('adubo');
  const [unidade, setUnidade] = useState('kg');
  const [estoque, setEstoque] = useState('');
  const [minimo, setMinimo] = useState('');
  const [custo, setCusto] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEditMode && insumoId) {
        getInsumoById(insumoId).then(i => {
            if (i) {
                setNome(i.nome);
                setTipo(i.tipo);
                setUnidade(i.unidadePadrao);
                setEstoque(String(i.estoqueAtual));
                setMinimo(String(i.estoqueMinimo || ''));
                setCusto(String(i.custoUnitario || ''));
            }
        });
    }
    navigation.setOptions({ title: isEditMode ? 'Editar Insumo' : 'Novo Insumo' });
  }, [insumoId]);

  const handleSave = async () => {
    const targetId = selectedTenantId || user?.uid;
    if (!targetId || !nome) return Alert.alert("Erro", "Nome é obrigatório.");

    setLoading(true);
    const data: InsumoFormData = {
        nome,
        tipo: tipo as any,
        unidadePadrao: unidade,
        estoqueAtual: parseFloat(estoque) || 0,
        estoqueMinimo: parseFloat(minimo) || 0,
        custoUnitario: parseFloat(custo.replace(',', '.')) || 0,
        fornecedorId: null,
        tamanhoEmbalagem: null,
        observacoes: null
    };

    try {
        if (isEditMode) await updateInsumo(insumoId, data);
        else await createInsumo(data, targetId);
        navigation.goBack();
    } catch {
        Alert.alert("Erro", "Falha ao salvar.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={{padding: 20}}>
        
        <View style={styles.card}>
            <Text style={styles.sectionHeader}>Informações Básicas</Text>
            
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Nome do Produto</Text>
                <TextInput style={styles.input} value={nome} onChangeText={setNome} placeholder="Ex: Ureia, Adubo NPK" />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Tipo</Text>
                <View style={styles.pickerWrapper}>
                    <Picker selectedValue={tipo} onValueChange={setTipo}>
                        <Picker.Item label="Adubo / Fertilizante" value="adubo" />
                        <Picker.Item label="Defensivo / Veneno" value="defensivo" />
                        <Picker.Item label="Semente / Muda" value="semente" />
                        <Picker.Item label="Outro Materia" value="outro" />
                    </Picker>
                </View>
            </View>
        </View>

        <View style={styles.card}>
            <Text style={styles.sectionHeader}>Controle de Estoque</Text>
            
            <View style={styles.row}>
                <View style={[styles.inputGroup, {flex: 1, marginRight: 15}]}>
                    <Text style={styles.label}>Estoque Atual</Text>
                    <TextInput style={styles.input} value={estoque} onChangeText={setEstoque} keyboardType="numeric" placeholder="0" />
                </View>
                <View style={[styles.inputGroup, {flex: 1}]}>
                    <Text style={styles.label}>Unidade</Text>
                    <View style={styles.pickerWrapper}>
                        <Picker selectedValue={unidade} onValueChange={setUnidade}>
                            <Picker.Item label="KG" value="kg" />
                            <Picker.Item label="Litros" value="lt" />
                            <Picker.Item label="Unidade" value="un" />
                            <Picker.Item label="Sacos" value="sc" />
                        </Picker>
                    </View>
                </View>
            </View>

            <View style={styles.row}>
                <View style={[styles.inputGroup, {flex: 1, marginRight: 15}]}>
                    <Text style={styles.label}>Estoque Mínimo</Text>
                    <TextInput style={styles.input} value={minimo} onChangeText={setMinimo} keyboardType="numeric" placeholder="Alerta em..." />
                </View>
                <View style={[styles.inputGroup, {flex: 1}]}>
                    <Text style={styles.label}>Custo Médio (R$)</Text>
                    <TextInput style={styles.input} value={custo} onChangeText={setCusto} keyboardType="numeric" placeholder="0.00" />
                </View>
            </View>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>Salvar Item</Text>}
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  card: { backgroundColor: COLORS.surface, padding: 20, borderRadius: 16, marginBottom: 20, shadowColor: "#000", shadowOpacity: 0.05, elevation: 2 },
  sectionHeader: { fontSize: 16, fontWeight: '700', color: COLORS.primary, marginBottom: 15, textTransform: 'uppercase' },
  inputGroup: { marginBottom: 15 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.textDark, marginBottom: 8 },
  input: { backgroundColor: COLORS.inputBg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, fontSize: 16 },
  pickerWrapper: { backgroundColor: COLORS.inputBg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, overflow: 'hidden' },
  row: { flexDirection: 'row' },
  saveBtn: { backgroundColor: COLORS.primary, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 30 },
  saveText: { color: '#FFF', fontWeight: '700', fontSize: 16 }
});

export default InsumoFormScreen;