// src/screens/Insumos/InsumoFormScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, Button, ScrollView, Alert, StyleSheet } from 'react-native';
import { createInsumo, InsumoFormData } from '../../services/insumoService';
import { useAuth } from '../../hooks/useAuth';

const InsumoFormScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  
  // Estados do formulário
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<'adubo' | 'defensivo' | 'semente' | 'outro'>('outro');
  const [unidade, setUnidade] = useState('un');
  const [estoqueAtual, setEstoqueAtual] = useState('');
  const [estoqueMinimo, setEstoqueMinimo] = useState('');

  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!user) {
      Alert.alert('Erro', 'Usuário não autenticado.');
      return;
    }
    if (!nome || !unidade) {
      Alert.alert('Campos obrigatórios', 'Preencha Nome e Unidade Padrão.');
      return;
    }

    const formData: InsumoFormData = {
      nome: nome,
      tipo: tipo,
      unidadePadrao: unidade,
      estoqueAtual: parseFloat(estoqueAtual) || 0,
      estoqueMinimo: parseFloat(estoqueMinimo) || null,
      custoUnitario: null, // Simplificado por enquanto
    };

    setLoading(true);
    try {
      await createInsumo(formData, user.uid);
      Alert.alert('Sucesso!', 'Insumo cadastrado.');
      navigation.goBack(); // Volta para a lista
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar o insumo.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.label}>Nome do Insumo (obrigatório)</Text>
      <TextInput
        style={styles.input}
        value={nome}
        onChangeText={setNome}
        placeholder="Ex: NPK 10-10-10"
      />
      
      <Text style={styles.label}>Tipo (adubo, defensivo, semente, outro)</Text>
      <TextInput
        style={styles.input}
        value={tipo}
        onChangeText={(text) => setTipo(text as any)}
        placeholder="Ex: adubo"
      />

      <Text style={styles.label}>Unidade Padrão (kg, L, un, g...)</Text>
      <TextInput
        style={styles.input}
        value={unidade}
        onChangeText={setUnidade}
        placeholder="Ex: kg"
      />

      <Text style={styles.label}>Estoque Atual</Text>
      <TextInput
        style={styles.input}
        value={estoqueAtual}
        onChangeText={setEstoqueAtual}
        keyboardType="numeric"
        placeholder="0"
      />
      
      <Text style={styles.label}>Estoque Mínimo (opcional)</Text>
      <TextInput
        style={styles.input}
        value={estoqueMinimo}
        onChangeText={setEstoqueMinimo}
        keyboardType="numeric"
        placeholder="Avisar quando chegar em..."
      />

      <Button title={loading ? "Salvando..." : "Salvar Insumo"} onPress={handleSave} disabled={loading} />
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

export default InsumoFormScreen;