// src/screens/Clientes/ClienteFormScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, Alert, StyleSheet, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { createCliente, updateCliente, getClienteById, ClienteFormData } from '../../services/clienteService';
import { useAuth } from '../../hooks/useAuth';
import { COLORS } from '../../constants/theme';

const ClienteFormScreen = ({ route, navigation }: any) => {
  const { user } = useAuth();
  const clienteId = route.params?.clienteId;
  const isEditMode = !!clienteId;
  
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cidade, setCidade] = useState('');
  const [tipo, setTipo] = useState<ClienteFormData['tipo']>('varejo');
  const [observacoes, setObservacoes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEditMode && clienteId) {
      getClienteById(clienteId).then(data => {
        if (data) { setNome(data.nome); setTelefone(data.telefone || ''); setCidade(data.cidade || ''); setTipo(data.tipo || 'varejo'); setObservacoes(data.observacoes || ''); }
      });
    }
  }, [clienteId]);

  const handleSave = async () => {
    if (!user) return;
    if (!nome.trim()) return Alert.alert('Atenção', 'Nome obrigatório.');
    setLoading(true);
    try {
      const formData: ClienteFormData = { nome, telefone: telefone || null, cidade: cidade || null, tipo, observacoes: observacoes || null };
      if (isEditMode) await updateCliente(clienteId, formData); else await createCliente(formData, user.uid);
      navigation.goBack();
    } catch { Alert.alert('Erro', 'Falha ao salvar.'); } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Dados do Cliente</Text>

          <Text style={styles.label}>Nome Completo *</Text>
          <View style={styles.inputWrapper}><TextInput style={styles.input} value={nome} onChangeText={setNome} placeholder="Ex: Mercado Central" placeholderTextColor={COLORS.textPlaceholder} /></View>

          <Text style={styles.label}>Telefone / WhatsApp</Text>
          <View style={styles.inputWrapper}><TextInput style={styles.input} value={telefone} onChangeText={setTelefone} keyboardType="phone-pad" placeholder="(00) 00000-0000" placeholderTextColor={COLORS.textPlaceholder} /></View>

          <Text style={styles.label}>Cidade / Região</Text>
          <View style={styles.inputWrapper}><TextInput style={styles.input} value={cidade} onChangeText={setCidade} placeholder="Ex: Jales - SP" placeholderTextColor={COLORS.textPlaceholder} /></View>

          <Text style={styles.label}>Tipo de Cliente</Text>
          <View style={styles.inputWrapper}>
              <Picker selectedValue={tipo} onValueChange={(v) => setTipo(v)} style={{color: '#000', fontWeight: 'bold'}}>
                  <Picker.Item label="Varejo (Consumidor)" value="varejo" />
                  <Picker.Item label="Atacado (Revenda)" value="atacado" />
                  <Picker.Item label="Restaurante" value="restaurante" />
                  <Picker.Item label="Outro" value="outro" />
              </Picker>
          </View>

          <Text style={styles.label}>Observações</Text>
          <View style={[styles.inputWrapper, {height: 80}]}><TextInput style={[styles.input, {textAlignVertical: 'top', paddingTop: 10}]} value={observacoes} onChangeText={setObservacoes} multiline placeholder="Preferências..." placeholderTextColor={COLORS.textPlaceholder} /></View>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Salvar Cliente</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background }, scrollContent: { padding: 20 },
  card: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 20, marginBottom: 20, elevation: 1, borderWidth: 1, borderColor: COLORS.border },
  sectionHeader: { fontSize: 16, fontWeight: '800', color: COLORS.modClientes, marginBottom: 15, textTransform: 'uppercase' },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6 },
  inputWrapper: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.borderDark, marginBottom: 15, height: 56, justifyContent: 'center' },
  input: { paddingHorizontal: 15, fontSize: 16, color: '#000000', height: '100%', fontWeight: 'bold' },
  saveBtn: { backgroundColor: COLORS.modClientes, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', elevation: 2 },
  saveText: { color: '#FFF', fontWeight: '800', fontSize: 18 },
});

export default ClienteFormScreen;