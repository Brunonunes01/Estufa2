// src/screens/Despesas/DespesaFormScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, Alert, StyleSheet, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker'; 
import { createDespesa, DespesaFormData } from '../../services/despesaService';
import { useAuth } from '../../hooks/useAuth';
import { Timestamp } from 'firebase/firestore';
import { COLORS } from '../../constants/theme';

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
    if (!descricao || !valor) return Alert.alert("Erro", "Preencha a descrição e o valor.");

    setLoading(true);
    try {
        await createDespesa({
            descricao, valor: parseFloat(valor.replace(',', '.')) || 0, categoria: categoria as any,
            dataDespesa: Timestamp.now(), observacoes: observacoes || null, registradoPor: user.name || 'App',
        }, targetId);
        Alert.alert("Sucesso", "Despesa registada.");
        navigation.goBack();
    } catch { Alert.alert("Erro", "Não foi possível salvar."); } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.card}>
            <Text style={styles.sectionHeader}>Dados do Pagamento</Text>
            
            <Text style={styles.label}>Descrição</Text>
            <View style={styles.inputWrapper}>
                <TextInput style={styles.input} value={descricao} onChangeText={setDescricao} placeholder="Ex: Conta de Luz" placeholderTextColor={COLORS.textPlaceholder} />
            </View>

            <Text style={styles.label}>Valor (R$)</Text>
            <View style={styles.inputWrapper}>
                <TextInput style={styles.input} value={valor} onChangeText={setValor} keyboardType="numeric" placeholder="0,00" placeholderTextColor={COLORS.textPlaceholder} />
            </View>

            <Text style={styles.label}>Categoria</Text>
            <View style={styles.inputWrapper}>
                <Picker selectedValue={categoria} onValueChange={setCategoria} style={{color: '#000', fontWeight: 'bold'}}>
                    <Picker.Item label="Energia Elétrica" value="energia" />
                    <Picker.Item label="Mão de Obra / Diária" value="mao_de_obra" />
                    <Picker.Item label="Manutenção" value="manutencao" />
                    <Picker.Item label="Combustível / Frete" value="combustivel" />
                    <Picker.Item label="Água" value="agua" />
                    <Picker.Item label="Impostos" value="imposto" />
                    <Picker.Item label="Outros" value="outros" />
                </Picker>
            </View>

            <Text style={styles.label}>Observações (Opcional)</Text>
            <View style={styles.inputWrapper}>
                <TextInput style={styles.input} value={observacoes} onChangeText={setObservacoes} placeholder="Detalhes..." placeholderTextColor={COLORS.textPlaceholder} />
            </View>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>Registrar Despesa</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: 20 },
  card: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 20, marginBottom: 20, elevation: 1, borderWidth: 1, borderColor: COLORS.border },
  sectionHeader: { fontSize: 16, fontWeight: '800', color: COLORS.modDespesas, marginBottom: 15, textTransform: 'uppercase' },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6 },
  inputWrapper: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.borderDark, marginBottom: 15, height: 56, justifyContent: 'center' },
  input: { paddingHorizontal: 15, fontSize: 16, color: '#000000', height: '100%', fontWeight: 'bold' },
  saveBtn: { backgroundColor: COLORS.modDespesas, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', elevation: 2 },
  saveText: { fontSize: 18, fontWeight: '800', color: '#FFF' },
});

export default DespesaFormScreen;