// src/screens/Insumos/InsumoFormScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, Alert, StyleSheet, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker'; 
import { createInsumo, updateInsumo, getInsumoById, InsumoFormData } from '../../services/insumoService';
import { useAuth } from '../../hooks/useAuth';
import { COLORS } from '../../constants/theme';

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
                setNome(i.nome); setTipo(i.tipo); setUnidade(i.unidadePadrao);
                setEstoque(String(i.estoqueAtual)); setMinimo(String(i.estoqueMinimo || '')); setCusto(String(i.custoUnitario || ''));
            }
        });
    }
  }, [insumoId]);

  const handleSave = async () => {
    const targetId = selectedTenantId || user?.uid;
    if (!targetId || !nome) return Alert.alert("Erro", "Nome é obrigatório.");

    setLoading(true);
    try {
        const data: InsumoFormData = {
            nome, tipo: tipo as any, unidadePadrao: unidade, estoqueAtual: parseFloat(estoque) || 0,
            estoqueMinimo: parseFloat(minimo) || 0, custoUnitario: parseFloat(custo.replace(',', '.')) || 0,
            fornecedorId: null, tamanhoEmbalagem: null, observacoes: null
        };
        if (isEditMode) await updateInsumo(insumoId, data); else await createInsumo(data, targetId);
        navigation.goBack();
    } catch { Alert.alert("Erro", "Falha ao salvar."); } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={{padding: 20}}>
        <View style={styles.card}>
            <Text style={styles.sectionHeader}>Informações do Produto</Text>
            
            <Text style={styles.label}>Nome do Produto</Text>
            <View style={styles.inputWrapper}>
                <TextInput style={styles.input} value={nome} onChangeText={setNome} placeholder="Ex: Ureia" placeholderTextColor={COLORS.textPlaceholder} />
            </View>

            <Text style={styles.label}>Tipo</Text>
            <View style={styles.inputWrapper}>
                <Picker selectedValue={tipo} onValueChange={setTipo} style={{color: '#000', fontWeight: 'bold'}}>
                    <Picker.Item label="Adubo / Fertilizante" value="adubo" />
                    <Picker.Item label="Defensivo / Veneno" value="defensivo" />
                    <Picker.Item label="Semente / Muda" value="semente" />
                    <Picker.Item label="Outro Material" value="outro" />
                </Picker>
            </View>
        </View>

        <View style={styles.card}>
            <Text style={styles.sectionHeader}>Controlo de Stock</Text>
            <View style={styles.row}>
                <View style={{flex: 1, marginRight: 10}}>
                    <Text style={styles.label}>Stock Atual</Text>
                    <View style={styles.inputWrapper}>
                        <TextInput style={styles.input} value={estoque} onChangeText={setEstoque} keyboardType="numeric" placeholder="0" placeholderTextColor={COLORS.textPlaceholder} />
                    </View>
                </View>
                <View style={{flex: 1}}>
                    <Text style={styles.label}>Unidade</Text>
                    <View style={styles.inputWrapper}>
                        <Picker selectedValue={unidade} onValueChange={setUnidade} style={{color: '#000', fontWeight: 'bold'}}>
                            <Picker.Item label="KG" value="kg" />
                            <Picker.Item label="Litros" value="lt" />
                            <Picker.Item label="Unidade" value="un" />
                            <Picker.Item label="Sacos" value="sc" />
                        </Picker>
                    </View>
                </View>
            </View>

            <View style={styles.row}>
                <View style={{flex: 1, marginRight: 10}}>
                    <Text style={styles.label}>Aviso Mínimo</Text>
                    <View style={styles.inputWrapper}>
                        <TextInput style={styles.input} value={minimo} onChangeText={setMinimo} keyboardType="numeric" placeholder="Qtd" placeholderTextColor={COLORS.textPlaceholder} />
                    </View>
                </View>
                <View style={{flex: 1}}>
                    <Text style={styles.label}>Custo (R$)</Text>
                    <View style={styles.inputWrapper}>
                        <TextInput style={styles.input} value={custo} onChangeText={setCusto} keyboardType="numeric" placeholder="0,00" placeholderTextColor={COLORS.textPlaceholder} />
                    </View>
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
  card: { backgroundColor: COLORS.surface, padding: 20, borderRadius: 20, marginBottom: 20, elevation: 1, borderWidth: 1, borderColor: COLORS.border },
  sectionHeader: { fontSize: 16, fontWeight: '800', color: COLORS.primary, marginBottom: 15, textTransform: 'uppercase' },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6 },
  inputWrapper: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.borderDark, marginBottom: 15, height: 56, justifyContent: 'center' },
  input: { paddingHorizontal: 15, fontSize: 16, color: '#000000', height: '100%', fontWeight: 'bold' },
  row: { flexDirection: 'row' },
  saveBtn: { backgroundColor: COLORS.primary, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 30, elevation: 2 },
  saveText: { color: '#FFF', fontWeight: '800', fontSize: 18 }
});

export default InsumoFormScreen;