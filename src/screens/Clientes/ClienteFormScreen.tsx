// src/screens/Clientes/ClienteFormScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, ScrollView, Alert, StyleSheet, TouchableOpacity, ActivityIndicator 
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { createCliente, updateCliente, getClienteById, ClienteFormData } from '../../services/clienteService';
import { useAuth } from '../../hooks/useAuth';
import { MaterialCommunityIcons } from '@expo/vector-icons';

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
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: isEditMode ? 'Editar Cliente' : 'Novo Cliente' });
    
    if (isEditMode && clienteId) {
      setLoadingData(true);
      getClienteById(clienteId)
        .then(data => {
          if (data) {
            setNome(data.nome);
            setTelefone(data.telefone || '');
            setCidade(data.cidade || '');
            setTipo(data.tipo || 'varejo');
            setObservacoes(data.observacoes || '');
          }
        })
        .finally(() => setLoadingData(false));
    }
  }, [clienteId, isEditMode, navigation]);

  const handleSave = async () => {
    if (!user) return;
    if (!nome.trim()) {
      Alert.alert('Atenção', 'O nome do cliente é obrigatório.');
      return;
    }

    const formData: ClienteFormData = {
      nome,
      telefone: telefone || null,
      cidade: cidade || null,
      tipo,
      observacoes: observacoes || null,
    };

    setLoading(true);
    try {
      if (isEditMode) {
        await updateCliente(clienteId, formData);
        Alert.alert('Sucesso', 'Cliente atualizado!');
      } else {
        await createCliente(formData, user.uid);
        Alert.alert('Sucesso', 'Cliente cadastrado!');
      }
      navigation.goBack();
    } catch (error) {
      Alert.alert('Erro', 'Falha ao salvar cliente.');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) return <ActivityIndicator size="large" style={styles.centered} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>
            <MaterialCommunityIcons name="account-details" size={24} color="#333" /> Dados do Cliente
        </Text>

        <Text style={styles.label}>Nome Completo *</Text>
        <TextInput style={styles.input} value={nome} onChangeText={setNome} placeholder="Ex: Mercado Central" />

        <Text style={styles.label}>Telefone / WhatsApp</Text>
        <TextInput style={styles.input} value={telefone} onChangeText={setTelefone} keyboardType="phone-pad" placeholder="(00) 00000-0000" />

        <Text style={styles.label}>Cidade / Região</Text>
        <TextInput style={styles.input} value={cidade} onChangeText={setCidade} placeholder="Ex: Jales - SP" />

        <Text style={styles.label}>Tipo de Cliente</Text>
        <View style={styles.pickerBox}>
            <Picker selectedValue={tipo} onValueChange={(v) => setTipo(v)} style={{height: 50}}>
                <Picker.Item label="Varejo (Consumidor Final)" value="varejo" />
                <Picker.Item label="Atacado (Revenda)" value="atacado" />
                <Picker.Item label="Restaurante" value="restaurante" />
                <Picker.Item label="Outro" value="outro" />
            </Picker>
        </View>

        <Text style={styles.label}>Observações</Text>
        <TextInput 
            style={[styles.input, { height: 80, textAlignVertical: 'top' }]} 
            value={observacoes} 
            onChangeText={setObservacoes} 
            multiline 
            placeholder="Preferências, dias de entrega..." 
        />
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Salvar Cliente</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  content: { padding: 16 },
  centered: { flex: 1, justifyContent: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 20, marginBottom: 20, elevation: 2 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, color: '#333' },
  label: { fontSize: 14, fontWeight: 'bold', color: '#555', marginBottom: 5 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 15, fontSize: 16 },
  pickerBox: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginBottom: 15 },
  saveButton: { backgroundColor: '#2196F3', borderRadius: 8, padding: 16, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});

export default ClienteFormScreen;