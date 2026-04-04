// src/screens/Clientes/ClienteFormScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, Alert, StyleSheet, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { createCliente, updateCliente, getClienteById, ClienteFormData } from '../../services/clienteService';
import { useAuth } from '../../hooks/useAuth';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/theme';

const ClienteFormScreen = ({ route, navigation }: any) => {
  const { user, selectedTenantId } = useAuth();
  const clienteId = route.params?.clienteId;
  const isEditMode = !!clienteId;
  
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cidade, setCidade] = useState('');
  const [tipo, setTipo] = useState<ClienteFormData['tipo']>('varejo');
  const [observacoes, setObservacoes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const targetId = selectedTenantId || user?.uid;
    if (isEditMode && clienteId && targetId) {
      getClienteById(clienteId, targetId).then(data => {
        if (data) { setNome(data.nome); setTelefone(data.telefone || ''); setCidade(data.cidade || ''); setTipo(data.tipo || 'varejo'); setObservacoes(data.observacoes || ''); }
      });
    }
  }, [clienteId, selectedTenantId]);

  const handleSave = async () => {
    const targetId = selectedTenantId || user?.uid;
    if (!targetId) return;
    if (!nome.trim()) return Alert.alert('Atenção', 'Nome obrigatório.');
    setLoading(true);
    try {
      const formData: ClienteFormData = { nome, telefone: telefone || null, cidade: cidade || null, tipo, observacoes: observacoes || null };
      if (isEditMode) await updateCliente(clienteId, formData, targetId); else await createCliente(formData, targetId);
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
              <Picker selectedValue={tipo} onValueChange={(v) => setTipo(v)} style={{color: COLORS.textPrimary, fontWeight: 'bold'}}>
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
          {loading ? <ActivityIndicator color={COLORS.textLight} /> : <Text style={styles.saveText}>Salvar Cliente</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: SPACING.xl },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.xl, marginBottom: SPACING.xl, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.card },
  sectionHeader: { fontSize: TYPOGRAPHY.title, fontWeight: '800', color: COLORS.modClientes, marginBottom: SPACING.md, textTransform: 'uppercase', letterSpacing: 0.6 },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6 },
  inputWrapper: { backgroundColor: COLORS.surfaceMuted, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, marginBottom: SPACING.md, height: 56, justifyContent: 'center' },
  input: { paddingHorizontal: 15, fontSize: TYPOGRAPHY.body, color: COLORS.textDark, height: '100%', fontWeight: '700' },
  saveBtn: { backgroundColor: COLORS.modClientes, height: 56, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', ...SHADOWS.card },
  saveText: { color: COLORS.textLight, fontWeight: '800', fontSize: TYPOGRAPHY.title },
});

export default ClienteFormScreen;
