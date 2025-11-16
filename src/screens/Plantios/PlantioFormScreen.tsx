// src/screens/Plantios/PlantioFormScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, Button, ScrollView, Alert, StyleSheet } from 'react-native';
import { Timestamp } from 'firebase/firestore';
import { createPlantio, PlantioFormData } from '../../services/plantioService';
import { useAuth } from '../../hooks/useAuth';

const PlantioFormScreen = ({ route, navigation }: any) => {
  const { user } = useAuth();
  
  // Recebe o ID da estufa da tela anterior
  const { estufaId } = route.params;

  // Estados do formulário
  const [cultura, setCultura] = useState('');
  const [variedade, setVariedade] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [unidade, setUnidade] = useState('muda'); // Padrão
  const [cicloDias, setCicloDias] = useState('');
  
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!user) {
      Alert.alert('Erro', 'Usuário não autenticado.');
      return;
    }
    if (!cultura || !quantidade) {
      Alert.alert('Campos obrigatórios', 'Preencha Cultura e Quantidade.');
      return;
    }

    const formData: PlantioFormData = {
      estufaId: estufaId,
      cultura: cultura,
      variedade: variedade || null,
      quantidadePlantada: parseFloat(quantidade) || 0,
      unidadeQuantidade: unidade,
      dataPlantio: Timestamp.now(), // Padrão: data de hoje
      cicloDias: parseInt(cicloDias) || null,
      status: "em_desenvolvimento", // Padrão
    };

    setLoading(true);
    try {
      await createPlantio(formData, user.uid);
      Alert.alert('Sucesso!', 'Plantio registrado.');
      navigation.goBack(); // Volta para a tela de Detalhe da Estufa
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar o plantio.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.label}>Cultura (Ex: Tomate)</Text>
      <TextInput
        style={styles.input}
        value={cultura}
        onChangeText={setCultura}
      />
      
      <Text style={styles.label}>Variedade (Ex: Santa Clara)</Text>
      <TextInput
        style={styles.input}
        value={variedade}
        onChangeText={setVariedade}
      />

      <Text style={styles.label}>Quantidade Plantada</Text>
      <TextInput
        style={styles.input}
        value={quantidade}
        onChangeText={setQuantidade}
        keyboardType="numeric"
      />

      <Text style={styles.label}>Unidade (muda, cova, bandeja)</Text>
      <TextInput
        style={styles.input}
        value={unidade}
        onChangeText={setUnidade}
      />

      <Text style={styles.label}>Ciclo em Dias (opcional)</Text>
      <TextInput
        style={styles.input}
        value={cicloDias}
        onChangeText={setCicloDias}
        keyboardType="numeric"
        placeholder="Ex: 90 (para calcular a colheita)"
      />

      <Button title={loading ? "Salvando..." : "Salvar Plantio"} onPress={handleSave} disabled={loading} />
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

export default PlantioFormScreen;