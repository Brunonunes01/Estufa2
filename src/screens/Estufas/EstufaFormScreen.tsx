// src/screens/Estufas/EstufaFormScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, Button, ScrollView, Alert, StyleSheet } from 'react-native';
import { Timestamp } from 'firebase/firestore';
import { createEstufa, EstufaFormData } from '../../services/estufaService';
import { useAuth } from '../../hooks/useAuth';

const EstufaFormScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  
  // Estados do formulário
  const [nome, setNome] = useState('');
  const [comprimento, setComprimento] = useState('');
  const [largura, setLargura] = useState('');
  const [altura, setAltura] = useState(''); // Mantemos a altura para salvar, mas não para o cálculo principal
  const [status, setStatus] = useState<'ativa' | 'manutencao' | 'desativada'>('ativa');
  
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!user) {
      Alert.alert('Erro', 'Usuário não autenticado.');
      return;
    }
    
    if (!nome || !comprimento || !largura || !altura) {
      Alert.alert('Campos obrigatórios', 'Preencha Nome, Comprimento, Largura e Altura.');
      return;
    }

    const formData: EstufaFormData = {
      nome: nome,
      comprimentoM: parseFloat(comprimento) || 0,
      larguraM: parseFloat(largura) || 0,
      alturaM: parseFloat(altura) || 0,
      status: status,
      dataFabricacao: null,
      tipoCobertura: null,
      responsavel: null,
      observacoes: null,
    };

    setLoading(true);
    try {
      await createEstufa(formData, user.uid);
      Alert.alert('Sucesso!', 'Estufa criada.');
      navigation.goBack(); 
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar a estufa.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // ****** AQUI A MUDANÇA ******
  // Cálculo da ÁREA em tempo real
  const c = parseFloat(comprimento) || 0;
  const l = parseFloat(largura) || 0;
  const area = (c * l).toFixed(2); // Arredonda para 2 casas

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.label}>Nome da Estufa (obrigatório)</Text>
      <TextInput
        style={styles.input}
        value={nome}
        onChangeText={setNome}
        placeholder="Ex: Estufa 1 - Tomates"
      />
      
      <Text style={styles.label}>Comprimento (m)</Text>
      <TextInput
        style={styles.input}
        value={comprimento}
        onChangeText={setComprimento}
        keyboardType="numeric"
      />
      
      <Text style={styles.label}>Largura (m)</Text>
      <TextInput
        style={styles.input}
        value={largura}
        onChangeText={setLargura}
        keyboardType="numeric"
      />
      
      <Text style={styles.label}>Altura (m)</Text>
      <TextInput
        style={styles.input}
        value={altura}
        onChangeText={setAltura}
        keyboardType="numeric"
      />

      {/* ****** AQUI A MUDANÇA ****** */}
      <Text style={styles.label}>Área (m²)</Text>
      <Text style={styles.volumeText}>{area} m²</Text>

      <Text style={styles.label}>Status</Text>
      <TextInput
        style={styles.input}
        value={status}
        onChangeText={(text) => setStatus(text as any)}
        placeholder="ativa / manutencao / desativada"
      />

      <Button title={loading ? "Salvando..." : "Salvar Estufa"} onPress={handleSave} disabled={loading} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 4,
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 5,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  volumeText: { // O nome do estilo continua 'volumeText', mas não tem problema
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  }
});

export default EstufaFormScreen;