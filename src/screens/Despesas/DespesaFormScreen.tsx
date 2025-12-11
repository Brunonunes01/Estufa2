// src/screens/Despesas/DespesaFormScreen.tsx
import React, { useState } from 'react';
import { 
  View, Text, TextInput, ScrollView, Alert, StyleSheet, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform 
} from 'react-native';
import { Picker } from '@react-native-picker/picker'; 
import { createDespesa, DespesaFormData } from '../../services/despesaService';
import { useAuth } from '../../hooks/useAuth';
import { MaterialCommunityIcons } from '@expo/vector-icons'; 
import { Timestamp } from 'firebase/firestore';

// --- TEMA ---
const COLORS = {
  background: '#F3F4F6',
  surface: '#FFFFFF',
  primary: '#EF4444', // Vermelho para Despesas (alerta visual)
  inputBorder: '#E5E7EB',
  inputBg: '#F9FAFB',
  textDark: '#111827',
  textGray: '#6B7280',
};

const DespesaFormScreen = ({ navigation }: any) => {
  const { user, selectedTenantId } = useAuth();
  
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [categoria, setCategoria] = useState('outros');
  const [observacoes, setObservacoes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    const targetId = selectedTenantId || user.uid;

    if (!descricao || !valor) {
        Alert.alert("Erro", "Preencha a descrição e o valor.");
        return;
    }

    setLoading(true);
    try {
        const data: DespesaFormData = {
            descricao,
            valor: parseFloat(valor.replace(',', '.')) || 0,
            categoria,
            dataDespesa: Timestamp.now(),
            observacoes: observacoes || null,
            registradoPor: user.name || user.email || 'App',
        };

        await createDespesa(data, targetId);
        Alert.alert("Sucesso", "Despesa registrada.");
        navigation.goBack();
    } catch (e) {
        Alert.alert("Erro", "Não foi possível salvar.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.section}>
            <Text style={styles.sectionHeader}>Dados do Pagamento</Text>
            
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Descrição (Ex: Conta de Luz)</Text>
                <TextInput 
                    style={styles.input} 
                    value={descricao} 
                    onChangeText={setDescricao} 
                    placeholder="O que você pagou?"
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Valor (R$)</Text>
                <TextInput 
                    style={styles.input} 
                    value={valor} 
                    onChangeText={setValor} 
                    keyboardType="numeric"
                    placeholder="0,00"
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Categoria</Text>
                <View style={styles.pickerWrapper}>
                    <Picker selectedValue={categoria} onValueChange={setCategoria}>
                        <Picker.Item label="Energia Elétrica" value="energia" />
                        <Picker.Item label="Mão de Obra / Diária" value="mao_de_obra" />
                        <Picker.Item label="Manutenção" value="manutencao" />
                        <Picker.Item label="Combustível / Frete" value="combustivel" />
                        <Picker.Item label="Água" value="agua" />
                        <Picker.Item label="Impostos" value="imposto" />
                        <Picker.Item label="Outros" value="outros" />
                    </Picker>
                </View>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Observações (Opcional)</Text>
                <TextInput 
                    style={styles.input} 
                    value={observacoes} 
                    onChangeText={setObservacoes} 
                    placeholder="Detalhes adicionais..."
                />
            </View>
        </View>

        <TouchableOpacity 
            style={styles.buttonPrimary} 
            onPress={handleSave}
            disabled={loading}
        >
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Registrar Despesa</Text>}
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: 20 },
  section: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 20, marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  sectionHeader: { fontSize: 16, fontWeight: '700', color: COLORS.primary, marginBottom: 15, textTransform: 'uppercase' },
  inputGroup: { marginBottom: 15 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.textDark, marginBottom: 8 },
  input: { backgroundColor: COLORS.inputBg, borderWidth: 1, borderColor: COLORS.inputBorder, borderRadius: 10, paddingHorizontal: 15, paddingVertical: 12, fontSize: 16, color: COLORS.textDark },
  pickerWrapper: { backgroundColor: COLORS.inputBg, borderWidth: 1, borderColor: COLORS.inputBorder, borderRadius: 10, overflow: 'hidden' },
  buttonPrimary: { backgroundColor: COLORS.primary, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center', shadowColor: COLORS.primary, shadowOpacity: 0.3, elevation: 4 },
  buttonText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
});

export default DespesaFormScreen;