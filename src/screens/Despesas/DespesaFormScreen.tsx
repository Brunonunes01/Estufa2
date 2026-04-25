// src/screens/Despesas/DespesaFormScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, Alert, StyleSheet, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker'; 
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createDespesa } from '../../services/despesaService';
import { useAuth } from '../../hooks/useAuth';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/theme';
import { queryClient, queryKeys } from '../../lib/queryClient';

const DespesaFormScreen = ({ navigation }: any) => {
  const { user, selectedTenantId } = useAuth();
  const targetId = selectedTenantId || user?.uid;
  
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
    if (!targetId) return Alert.alert("Atenção", "Sua sessão expirou. Entre novamente.");
    if (!descricao.trim()) return Alert.alert("Atenção", "Digite a descrição da despesa.");
    const valorNum = parseFloat(valor.replace(',', '.')) || 0;
    if (valorNum <= 0) return Alert.alert("Atenção", "Digite um valor maior que zero.");

    setLoading(true);
    try {
        await createDespesa({
            descricao: descricao.trim(), 
            valor: valorNum, 
            categoria: categoria as any,
            statusPagamento: status,
            dataDespesa,
            dataVencimento: status === 'pendente' ? dataVencimento : null,
            observacoes: observacoes || null, 
        }, targetId);
        
        if (targetId) {
          queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(targetId) });
          queryClient.invalidateQueries({ queryKey: queryKeys.despesasList(targetId) });
        }
        
        Alert.alert(
          "Despesa registrada",
          `${descricao.trim()}\nValor: R$ ${valorNum.toFixed(2)}\nStatus: ${status === 'pago' ? 'Pago' : 'Pendente'}`,
          [{ text: "OK", onPress: () => navigation.goBack() }]
        );
    } catch { 
        Alert.alert("Erro", "Não consegui salvar a despesa. Tente novamente."); 
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
                <Picker selectedValue={categoria} onValueChange={setCategoria} style={{color: COLORS.textPrimary, fontWeight: 'bold'}}>
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
                <Picker selectedValue={status} onValueChange={(v: any) => setStatus(v)} style={{color: COLORS.textPrimary, fontWeight: 'bold'}}>
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
                        <MaterialCommunityIcons name="calendar-clock" size={24} color={COLORS.textLight} />
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
            {loading ? <ActivityIndicator color={COLORS.textLight} /> : <Text style={styles.saveText}>Registrar Despesa</Text>}
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
  scrollContent: { padding: SPACING.xl },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.xl, marginBottom: SPACING.xl, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.card },
  sectionHeader: { fontSize: TYPOGRAPHY.title, fontWeight: '800', color: COLORS.modDespesas, marginBottom: SPACING.md, textTransform: 'uppercase', letterSpacing: 0.6 },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6 },
  inputWrapper: { backgroundColor: COLORS.surfaceMuted, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, marginBottom: SPACING.md, height: 56, justifyContent: 'center' },
  input: { paddingHorizontal: 15, fontSize: TYPOGRAPHY.body, color: COLORS.textDark, height: '100%', fontWeight: '700' },
  dateBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceMuted, paddingHorizontal: 15, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, height: 56, marginBottom: SPACING.md },
  dateText: { marginLeft: 10, fontSize: TYPOGRAPHY.body, fontWeight: '700', color: COLORS.textDark },
  saveBtn: { backgroundColor: COLORS.modDespesas, height: 60, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', marginBottom: 30, ...SHADOWS.card },
  saveText: { fontSize: 19, fontWeight: '800', color: COLORS.textLight },
});

export default DespesaFormScreen;
