// src/screens/Fornecedores/FornecedorFormScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, Alert, StyleSheet, ActivityIndicator, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createFornecedor, FornecedorFormData, getFornecedorById, updateFornecedor } from '../../services/fornecedorService';
import { useAuth } from '../../hooks/useAuth';
import { useWriteGuard } from '../../hooks/useWriteGuard';
import { useAppSettings } from '../../hooks/useAppSettings';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/theme';
import { hasLengthBetween, limitDigits, onlyDigits } from '../../utils/numericFields';

const TELEFONE_MAX_LENGTH = 15;

const FornecedorFormScreen = ({ route, navigation }: any) => {
  const { user, selectedTenantId } = useAuth();
  const canWrite = useWriteGuard(navigation, 'Cadastro de fornecedor');
  const { settings } = useAppSettings();
  const insets = useSafeAreaInsets();
  const fornecedorId = route.params?.fornecedorId;
  const isEditMode = !!fornecedorId;
  
  const [nome, setNome] = useState(''); const [contato, setContato] = useState('');
  const [telefone, setTelefone] = useState(''); const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const targetId = selectedTenantId || user?.uid;
    if (isEditMode && fornecedorId && targetId) {
        getFornecedorById(fornecedorId, targetId).then(f => {
          if (f) { setNome(f.nome); setContato(f.contato || ''); setTelefone(limitDigits(f.telefone || '', TELEFONE_MAX_LENGTH)); setEmail(f.email || ''); }
        });
    }
  }, [fornecedorId, selectedTenantId]);

  const handleSave = async () => {
    if (!canWrite) return;
    const targetId = selectedTenantId || user?.uid;
    if (!targetId || !nome) return Alert.alert('Erro', 'Nome obrigatório.');
    if (telefone && !hasLengthBetween(telefone, 10, TELEFONE_MAX_LENGTH)) {
      return Alert.alert('Atenção', 'Telefone deve conter entre 10 e 15 números.');
    }
    setLoading(true);
    try {
      const formData: FornecedorFormData = {
        nome,
        contato: contato || null,
        telefone: onlyDigits(telefone) || null,
        email: email || null,
        endereco: null,
        observacoes: null,
      };
      if (isEditMode) await updateFornecedor(fornecedorId, formData, targetId); else await createFornecedor(formData, targetId);
      navigation.goBack();
    } catch { Alert.alert('Erro', 'Falha ao salvar.'); } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: (settings.uiV2Enabled ? 138 : SPACING.xl) + insets.bottom },
        ]}
      >
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Dados do Fornecedor</Text>

          <Text style={styles.label}>Empresa / Nome *</Text>
          <View style={styles.inputWrapper}><TextInput style={styles.input} value={nome} onChangeText={setNome} placeholder="Casa do Adubo" placeholderTextColor={COLORS.textPlaceholder} /></View>

          <Text style={styles.label}>Pessoa de Contato</Text>
          <View style={styles.inputWrapper}><TextInput style={styles.input} value={contato} onChangeText={setContato} placeholder="Sr. João" placeholderTextColor={COLORS.textPlaceholder} /></View>

          <Text style={styles.label}>Telefone</Text>
          <View style={styles.inputWrapper}><TextInput style={styles.input} value={telefone} onChangeText={(value) => setTelefone(limitDigits(value, TELEFONE_MAX_LENGTH))} keyboardType="phone-pad" maxLength={TELEFONE_MAX_LENGTH} placeholder="(00) 00000-0000" placeholderTextColor={COLORS.textPlaceholder} /></View>
          <Text style={styles.helperText}>Apenas números. Informe de 10 a 15 dígitos.</Text>

          <Text style={styles.label}>E-mail</Text>
          <View style={styles.inputWrapper}><TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="vendas@empresa.com" placeholderTextColor={COLORS.textPlaceholder} /></View>
        </View>
        
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
          {loading ? <ActivityIndicator color={COLORS.textLight} /> : <Text style={styles.saveText}>Salvar Fornecedor</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: SPACING.xl },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.xl, marginBottom: SPACING.xl, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.card },
  sectionHeader: { fontSize: TYPOGRAPHY.title, fontWeight: '800', color: COLORS.primary, marginBottom: SPACING.md, textTransform: 'uppercase', letterSpacing: 0.6 },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6 },
  inputWrapper: { backgroundColor: COLORS.surfaceMuted, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, marginBottom: SPACING.md, height: 56, justifyContent: 'center' },
  input: { paddingHorizontal: 15, fontSize: TYPOGRAPHY.body, color: COLORS.textDark, height: '100%', fontWeight: '700' },
  helperText: { color: COLORS.textSecondary, fontSize: 12, marginTop: -8, marginBottom: SPACING.md },
  saveBtn: { backgroundColor: COLORS.primary, height: 56, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', ...SHADOWS.card },
  saveText: { color: COLORS.textLight, fontWeight: '800', fontSize: TYPOGRAPHY.title },
});

export default FornecedorFormScreen;
