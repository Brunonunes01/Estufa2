// src/screens/Clientes/ClienteFormScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, Alert, StyleSheet, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Contacts from 'expo-contacts';
import { createCliente, updateCliente, getClienteById, ClienteFormData } from '../../services/clienteService';
import { useAuth } from '../../hooks/useAuth';
import { useAppSettings } from '../../hooks/useAppSettings';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/theme';

const ClienteFormScreen = ({ route, navigation }: any) => {
  const { user, selectedTenantId } = useAuth();
  const { settings } = useAppSettings();
  const insets = useSafeAreaInsets();
  const clienteId = route.params?.clienteId;
  const isEditMode = !!clienteId;
  
  const [nome, setNome] = useState('');
  const [documento, setDocumento] = useState('');
  const [contatoResponsavel, setContatoResponsavel] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [cep, setCep] = useState('');
  const [endereco, setEndereco] = useState('');
  const [numero, setNumero] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [complemento, setComplemento] = useState('');
  const [tipo, setTipo] = useState<ClienteFormData['tipo']>('varejo');
  const [observacoes, setObservacoes] = useState('');
  const [loading, setLoading] = useState(false);
  const [importingContact, setImportingContact] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadCliente = async () => {
      const targetId = selectedTenantId || user?.uid;
      if (!(isEditMode && clienteId && targetId)) return;
      try {
        const data = await getClienteById(clienteId, targetId);
        if (!isMounted || !data) return;
        setNome(data.nome);
        setDocumento(data.documento || '');
        setContatoResponsavel(data.contatoResponsavel || '');
        setTelefone(data.telefone || '');
        setEmail(data.email || '');
        setCep(data.cep || '');
        setEndereco(data.endereco || '');
        setNumero(data.numero || '');
        setBairro(data.bairro || '');
        setCidade(data.cidade || '');
        setEstado(data.estado || '');
        setComplemento(data.complemento || '');
        setTipo((data.tipo as any) || 'varejo');
        setObservacoes(data.observacoes || '');
      } catch {
        if (isMounted) {
          Alert.alert('Erro', 'Não foi possível carregar os dados do cliente.');
        }
      }
    };
    void loadCliente();
    return () => {
      isMounted = false;
    };
  }, [clienteId, isEditMode, selectedTenantId, user?.uid]);

  const clean = (value: string) => value.trim() || null;
  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  const normalizePhone = (value?: string | null) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const hasPlusPrefix = raw.startsWith('+');
    const digits = raw.replace(/\D/g, '');
    if (!digits) return '';
    return hasPlusPrefix ? `+${digits}` : digits;
  };

  const handleImportContact = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Indisponível', 'A importação de contatos do telefone não está disponível na versão web.');
      return;
    }

    setImportingContact(true);
    try {
      const permission = await Contacts.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permissão necessária', 'Permita acesso aos contatos para importar telefone e e-mail.');
        return;
      }

      const selected = await Contacts.presentContactPickerAsync();
      if (!selected) return;

      const importedName =
        selected.name?.trim() ||
        [selected.firstName, selected.middleName, selected.lastName].filter(Boolean).join(' ').trim();
      const importedPhone = normalizePhone(selected.phoneNumbers?.[0]?.number);
      const importedEmail = String(selected.emails?.[0]?.email || '').trim();

      if (!importedName && !importedPhone && !importedEmail) {
        Alert.alert('Sem dados úteis', 'O contato selecionado não possui nome, telefone ou e-mail para importar.');
        return;
      }

      if (importedName) {
        if (!nome.trim()) setNome(importedName);
        if (!contatoResponsavel.trim()) setContatoResponsavel(importedName);
      }
      if (importedPhone) setTelefone(importedPhone);
      if (importedEmail && !email.trim()) setEmail(importedEmail);

      Alert.alert('Contato importado', 'Dados do contato aplicados no cadastro.');
    } catch {
      Alert.alert('Erro', 'Não foi possível importar o contato do telefone.');
    } finally {
      setImportingContact(false);
    }
  };

  const handleSave = async () => {
    const targetId = selectedTenantId || user?.uid;
    if (!targetId) return;
    if (!nome.trim()) return Alert.alert('Atenção', 'Nome obrigatório.');
    if (email.trim() && !isValidEmail(email)) {
      return Alert.alert('Atenção', 'Informe um e-mail válido.');
    }
    setLoading(true);
    try {
      const formData: ClienteFormData = {
        nome: nome.trim(),
        documento: clean(documento),
        contatoResponsavel: clean(contatoResponsavel),
        telefone: clean(telefone),
        email: clean(email),
        cep: clean(cep),
        endereco: clean(endereco),
        numero: clean(numero),
        bairro: clean(bairro),
        cidade: clean(cidade),
        estado: clean(estado),
        complemento: clean(complemento),
        tipo,
        observacoes: clean(observacoes),
      };
      if (isEditMode) await updateCliente(clienteId, formData, targetId); else await createCliente(formData, targetId);
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
          <Text style={styles.sectionHeader}>Identificação</Text>

          <Text style={styles.label}>Nome / Razão Social *</Text>
          <View style={styles.inputWrapper}><TextInput style={styles.input} value={nome} onChangeText={setNome} placeholder="Ex: Mercado Central" placeholderTextColor={COLORS.textPlaceholder} /></View>

          <Text style={styles.label}>CPF / CNPJ</Text>
          <View style={styles.inputWrapper}><TextInput style={styles.input} value={documento} onChangeText={setDocumento} keyboardType="numbers-and-punctuation" placeholder="Documento fiscal" placeholderTextColor={COLORS.textPlaceholder} /></View>

          <Text style={styles.label}>Contato Responsável</Text>
          <View style={styles.inputWrapper}><TextInput style={styles.input} value={contatoResponsavel} onChangeText={setContatoResponsavel} placeholder="Ex: João Compras" placeholderTextColor={COLORS.textPlaceholder} /></View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Contato</Text>

          <TouchableOpacity
            style={[styles.importBtn, importingContact && styles.importBtnDisabled]}
            onPress={handleImportContact}
            disabled={importingContact}
          >
            {importingContact ? (
              <ActivityIndicator color={COLORS.textLight} />
            ) : (
              <>
                <MaterialCommunityIcons name="account-arrow-down-outline" size={18} color={COLORS.textLight} />
                <Text style={styles.importBtnText}>Importar do Telefone</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.label}>Telefone / WhatsApp</Text>
          <View style={styles.inputWrapper}><TextInput style={styles.input} value={telefone} onChangeText={setTelefone} keyboardType="phone-pad" placeholder="(00) 00000-0000" placeholderTextColor={COLORS.textPlaceholder} /></View>

          <Text style={styles.label}>E-mail</Text>
          <View style={styles.inputWrapper}><TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="cliente@email.com" placeholderTextColor={COLORS.textPlaceholder} /></View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Endereço</Text>

          <Text style={styles.label}>CEP</Text>
          <View style={styles.inputWrapper}><TextInput style={styles.input} value={cep} onChangeText={setCep} keyboardType="numbers-and-punctuation" placeholder="00000-000" placeholderTextColor={COLORS.textPlaceholder} /></View>

          <Text style={styles.label}>Endereço</Text>
          <View style={styles.inputWrapper}><TextInput style={styles.input} value={endereco} onChangeText={setEndereco} placeholder="Rua, avenida, estrada..." placeholderTextColor={COLORS.textPlaceholder} /></View>

          <View style={styles.row}>
            <View style={styles.rowMain}>
              <Text style={styles.label}>Bairro</Text>
              <View style={styles.inputWrapper}><TextInput style={styles.input} value={bairro} onChangeText={setBairro} placeholder="Bairro" placeholderTextColor={COLORS.textPlaceholder} /></View>
            </View>
            <View style={styles.rowSide}>
              <Text style={styles.label}>Número</Text>
              <View style={styles.inputWrapper}><TextInput style={styles.input} value={numero} onChangeText={setNumero} placeholder="Nº" placeholderTextColor={COLORS.textPlaceholder} /></View>
            </View>
          </View>

          <Text style={styles.label}>Cidade / Região</Text>
          <View style={styles.inputWrapper}><TextInput style={styles.input} value={cidade} onChangeText={setCidade} placeholder="Ex: Jales - SP" placeholderTextColor={COLORS.textPlaceholder} /></View>

          <Text style={styles.label}>Estado / UF</Text>
          <View style={styles.inputWrapper}><TextInput style={styles.input} value={estado} onChangeText={(value) => setEstado(value.toUpperCase())} autoCapitalize="characters" maxLength={2} placeholder="SP" placeholderTextColor={COLORS.textPlaceholder} /></View>

          <Text style={styles.label}>Complemento / Referência</Text>
          <View style={styles.inputWrapper}><TextInput style={styles.input} value={complemento} onChangeText={setComplemento} placeholder="Ponto de entrega, box, galpão..." placeholderTextColor={COLORS.textPlaceholder} /></View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Perfil Comercial</Text>

          <Text style={styles.label}>Tipo de Cliente</Text>
          <View style={styles.inputWrapper}>
              <Picker selectedValue={tipo} onValueChange={(v) => setTipo(v as any)} style={{color: COLORS.textPrimary, fontWeight: 'bold'}}>
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
  row: { flexDirection: 'row', gap: SPACING.md },
  rowMain: { flex: 1 },
  rowSide: { width: 104 },
  importBtn: {
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.info,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: SPACING.md,
  },
  importBtnDisabled: { opacity: 0.8 },
  importBtnText: { color: COLORS.textLight, fontWeight: '800', fontSize: 13, letterSpacing: 0.3 },
  saveBtn: { backgroundColor: COLORS.modClientes, height: 56, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', ...SHADOWS.card },
  saveText: { color: COLORS.textLight, fontWeight: '800', fontSize: TYPOGRAPHY.title },
});

export default ClienteFormScreen;
