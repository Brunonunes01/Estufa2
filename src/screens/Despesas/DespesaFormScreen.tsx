// src/screens/Despesas/DespesaFormScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, Alert, StyleSheet, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker'; 
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createDespesa } from '../../services/despesaService';
import { useAuth } from '../../hooks/useAuth';
import { COLORS } from '../../constants/theme';

const DespesaFormScreen = ({ navigation }: any) => {
  const { user, selectedTenantId } = useAuth();
  
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [categoria, setCategoria] = useState('outros');
  const [status, setStatus] = useState<'pago' | 'pendente'>('pago');
  const [observacoes, setObservacoes] = useState('');
  const [loading, setLoading] = useState(false);

  const [dataDespesa, setDataDespesa] = useState(new Date());
  const [dataVencimento, setDataVencimento] = useState(new Date());
  const [showPicker, setShowPicker] = useState<'despesa' | 'vencimento' | null>(null);

  const handleSave = async () => {
    if (!user) return;
    const targetId = selectedTenantId || user.uid;
    if (!descricao || !valor) return Alert.alert("Erro", "Preencha a descrição e o valor.");

    setLoading(true);
    try {
        await createDespesa({
            descricao, 
            valor: parseFloat(valor.replace(',', '.')) || 0, 
            categoria,
            status,
            dataDespesa,
            dataVencimento: status === 'pendente' ? dataVencimento : null,
            observacoes: observacoes || null, 
            registradoPor: user.name || 'App',
        }, targetId);
        Alert.alert("Sucesso", "Despesa registada.");
        navigation.goBack();
    } catch { 
        Alert.alert("Erro", "Não foi possível salvar."); 
    } finally { 
        setLoading(false); 
    }
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

            <Text style={styles.label}>Situação</Text>
            <View style={styles.inputWrapper}>
                <Picker selectedValue={status} onValueChange={(v: any) => setStatus(v)} style={{color: '#000', fontWeight: 'bold'}}>
                    <Picker.Item label="Já Paguei" value="pago" />
                    <Picker.Item label="Pendente (Conta a Pagar)" value="pendente" />
                </Picker>
            </View>

            <Text style={styles.label}>Data da Despesa</Text>
            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowPicker('despesa')}>
                <MaterialCommunityIcons name="calendar" size={24} color={COLORS.modDespesas} />
                <Text style={styles.dateText}>{dataDespesa.toLocaleDateString('pt-BR')}</Text>
            </TouchableOpacity>

            {status === 'pendente' && (
                <>
                    <Text style={styles.label}>Data de Vencimento</Text>
                    <TouchableOpacity style={styles.dateBtn} onPress={() => setShowPicker('vencimento')}>
                        <MaterialCommunityIcons name="calendar-clock" size={24} color="#E11D48" />
                        <Text style={styles.dateText}>{dataVencimento.toLocaleDateString('pt-BR')}</Text>
                    </TouchableOpacity>
                </>
            )}

            <Text style={styles.label}>Observações (Opcional)</Text>
            <View style={styles.inputWrapper}>
                <TextInput style={styles.input} value={observacoes} onChangeText={setObservacoes} placeholder="Detalhes..." placeholderTextColor={COLORS.textPlaceholder} />
            </View>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>Registrar Despesa</Text>}
        </TouchableOpacity>

        {showPicker && (
            <DateTimePicker 
                value={showPicker === 'despesa' ? dataDespesa : dataVencimento} 
                mode="date" 
                display="default" 
                onChange={(e, d) => { 
                    setShowPicker(null); 
                    if(d) showPicker === 'despesa' ? setDataDespesa(d) : setDataVencimento(d); 
                }} 
            />
        )}
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
  dateBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 15, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.borderDark, height: 56, marginBottom: 15 },
  dateText: { marginLeft: 10, fontSize: 16, fontWeight: 'bold', color: '#000' },
  saveBtn: { backgroundColor: COLORS.modDespesas, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', elevation: 2, marginBottom: 30 },
  saveText: { fontSize: 18, fontWeight: '800', color: '#FFF' },
});

export default DespesaFormScreen;