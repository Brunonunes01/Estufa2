// src/screens/Fornecedores/FornecedorFormScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, Alert, StyleSheet, ActivityIndicator, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { createFornecedor, FornecedorFormData, getFornecedorById, updateFornecedor } from '../../services/fornecedorService';
import { useAuth } from '../../hooks/useAuth';
import { COLORS } from '../../constants/theme';

const FornecedorFormScreen = ({ route, navigation }: any) => {
  const { user } = useAuth();
  const fornecedorId = route.params?.fornecedorId;
  const isEditMode = !!fornecedorId;
  
  const [nome, setNome] = useState(''); const [contato, setContato] = useState('');
  const [telefone, setTelefone] = useState(''); const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEditMode && fornecedorId) {
        getFornecedorById(fornecedorId).then(f => {
          if (f) { setNome(f.nome); setContato(f.contato || ''); setTelefone(f.telefone || ''); setEmail(f.email || ''); }
        });
    }
  }, [fornecedorId]);

  const handleSave = async () => {
    if (!user || !nome) return Alert.alert('Erro', 'Nome obrigatório.');
    setLoading(true);
    try {
      const formData: FornecedorFormData = { nome, contato: contato || null, telefone: telefone || null, email: email || null, endereco: null, observacoes: null };
      if (isEditMode) await updateFornecedor(fornecedorId, formData); else await createFornecedor(formData, user.uid);
      navigation.goBack();
    } catch { Alert.alert('Erro', 'Falha ao salvar.'); } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Dados do Fornecedor</Text>

          <Text style={styles.label}>Empresa / Nome *</Text>
          <View style={styles.inputWrapper}><TextInput style={styles.input} value={nome} onChangeText={setNome} placeholder="Casa do Adubo" placeholderTextColor={COLORS.textPlaceholder} /></View>

          <Text style={styles.label}>Pessoa de Contato</Text>
          <View style={styles.inputWrapper}><TextInput style={styles.input} value={contato} onChangeText={setContato} placeholder="Sr. João" placeholderTextColor={COLORS.textPlaceholder} /></View>

          <Text style={styles.label}>Telefone</Text>
          <View style={styles.inputWrapper}><TextInput style={styles.input} value={telefone} onChangeText={setTelefone} keyboardType="phone-pad" placeholder="(00) 00000-0000" placeholderTextColor={COLORS.textPlaceholder} /></View>

          <Text style={styles.label}>E-mail</Text>
          <View style={styles.inputWrapper}><TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="vendas@empresa.com" placeholderTextColor={COLORS.textPlaceholder} /></View>
        </View>
        
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Salvar Fornecedor</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background }, scrollContent: { padding: 20 },
  card: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 20, marginBottom: 20, elevation: 1, borderWidth: 1, borderColor: COLORS.border },
  sectionHeader: { fontSize: 16, fontWeight: '800', color: COLORS.primary, marginBottom: 15, textTransform: 'uppercase' },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6 },
  inputWrapper: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.borderDark, marginBottom: 15, height: 56, justifyContent: 'center' },
  input: { paddingHorizontal: 15, fontSize: 16, color: '#000000', height: '100%', fontWeight: 'bold' },
  saveBtn: { backgroundColor: COLORS.primary, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', elevation: 2 },
  saveText: { color: '#FFF', fontWeight: '800', fontSize: 18 },
});

export default FornecedorFormScreen;