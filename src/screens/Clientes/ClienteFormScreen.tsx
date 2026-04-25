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

  useEffect(() => {
    const targetId = selectedTenantId || user?.uid;
    if (isEditMode && clienteId && targetId) {
      getClienteById(clienteId, targetId).then(data => {
        if (data) {
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
        }
      });
    }
  }, [clienteId, selectedTenantId]);

  const clean = (value: string) => value.trim() || null;

  const handleSave = async () => {
    const targetId = selectedTenantId || user?.uid;
    if (!targetId) return;
    if (!nome.trim()) return Alert.alert('Atenção', 'Nome obrigatório.');
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
      <ScrollView contentContainerStyle={styles.scrollContent}>
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
  saveBtn: { backgroundColor: COLORS.modClientes, height: 56, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', ...SHADOWS.card },
  saveText: { color: COLORS.textLight, fontWeight: '800', fontSize: TYPOGRAPHY.title },
});

export default ClienteFormScreen;
