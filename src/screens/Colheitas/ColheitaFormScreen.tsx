// src/screens/Colheitas/ColheitaFormScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, Button, ScrollView, Alert, StyleSheet } from 'react-native';
import { createColheita, ColheitaFormData } from '../../services/colheitaService';
import { useAuth } from '../../hooks/useAuth';

const ColheitaFormScreen = ({ route, navigation }: any) => {
  const { user } = useAuth();
  
  // Recebe os IDs da tela anterior
  const { plantioId, estufaId } = route.params;

  // Estados do formulário
  const [quantidade, setQuantidade] = useState('');
  const [unidade, setUnidade] = useState('kg'); // Padrão
  const [preco, setPreco] = useState('');
  const [destino, setDestino] = useState('');
  
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!user) {
      Alert.alert('Erro', 'Usuário não autenticado.');
      return;
    }
    if (!quantidade || !unidade) {
      Alert.alert('Campos obrigatórios', 'Preencha Quantidade e Unidade.');
      return;
    }

    const formData: ColheitaFormData = {
      quantidade: parseFloat(quantidade) || 0,
      unidade: unidade,
      precoUnitario: parseFloat(preco) || null,
      destino: destino || null,
      observacoes: null,
    };

    setLoading(true);
    try {
      await createColheita(formData, user.uid, plantioId, estufaId);
      Alert.alert('Sucesso!', 'Colheita registrada.');
      navigation.goBack(); // Volta para a tela de Detalhe do Plantio
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar a colheita.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.label}>Quantidade (obrigatório)</Text>
      <TextInput
        style={styles.input}
        value={quantidade}
        onChangeText={setQuantidade}
        keyboardType="numeric"
      />
      
      <Text style={styles.label}>Unidade (kg, caixa, maço...)</Text>
      <TextInput
        style={styles.input}
        value={unidade}
        onChangeText={setUnidade}
      />

      <Text style={styles.label}>Preço Unitário (opcional)</Text>
      <TextInput
        style={styles.input}
        value={preco}
        onChangeText={setPreco}
        keyboardType="numeric"
        placeholder="Ex: 5.50"
      />

      <Text style={styles.label}>Destino (opcional)</Text>
      <TextInput
        style={styles.input}
        value={destino}
        onChangeText={setDestino}
        placeholder="Ex: Feira, Mercado Local"
      />

      <Button title={loading ? "Salvando..." : "Salvar Colheita"} onPress={handleSave} disabled={loading} />
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
});

export default ColheitaFormScreen;