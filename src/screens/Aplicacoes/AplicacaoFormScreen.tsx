// src/screens/Aplicacoes/AplicacaoFormScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, ScrollView, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { Timestamp } from 'firebase/firestore';
import { createAplicacao, AplicacaoFormData } from '../../services/aplicacaoService';
import { listInsumos } from '../../services/insumoService'; 
import { useAuth } from '../../hooks/useAuth';
import { Insumo } from '../../types/domain';
import { Picker } from '@react-native-picker/picker'; 

const AplicacaoFormScreen = ({ route, navigation }: any) => {
  const { user } = useAuth();
  const { plantioId, estufaId } = route.params;

  // Estados
  const [loading, setLoading] = useState(false);
  const [loadingInsumos, setLoadingInsumos] = useState(true);
  
  // Lista de insumos do usuário
  const [insumosList, setInsumosList] = useState<Insumo[]>([]);
  
  // Dados do formulário
  // ****** AQUI ESTÁ A CORREÇÃO ******
  // Trocamos 'null' por 'undefined'
  const [selectedInsumoId, setSelectedInsumoId] = useState<string | undefined>(undefined);
  const [quantidade, setQuantidade] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // Busca os insumos quando a tela abre
  useEffect(() => {
    const carregarInsumos = async () => {
      if (user) {
        setLoadingInsumos(true);
        try {
          const lista = await listInsumos(user.uid);
          setInsumosList(lista);
          if (lista.length > 0) {
            setSelectedInsumoId(lista[0].id);
          } else {
            setSelectedInsumoId(undefined); // Garante que fica undefined se a lista estiver vazia
          }
        } catch (error) {
          Alert.alert("Erro", "Não foi possível carregar seus insumos.");
        } finally {
          setLoadingInsumos(false);
        }
      }
    };
    carregarInsumos();
  }, [user]);

  // Descobre qual é a unidade do insumo selecionado
  const getUnidadeSelecionada = (): string => {
    if (!selectedInsumoId) return "...";
    const insumo = insumosList.find(i => i.id === selectedInsumoId);
    return insumo ? insumo.unidadePadrao : "...";
  };

  const handleSave = async () => {
    if (!user || !selectedInsumoId || !quantidade) {
      Alert.alert('Campos obrigatórios', 'Selecione um insumo e preencha a quantidade.');
      return;
    }
    
    const unidade = getUnidadeSelecionada();
    const qtdNum = parseFloat(quantidade) || 0;

    if (qtdNum <= 0) {
      Alert.alert('Valor inválido', 'A quantidade aplicada deve ser maior que zero.');
      return;
    }

    const formData: AplicacaoFormData = {
      insumoId: selectedInsumoId,
      quantidadeAplicada: qtdNum,
      unidade: unidade, 
      dataAplicacao: Timestamp.now(),
      observacoes: observacoes || null,
    };

    setLoading(true);
    try {
      await createAplicacao(formData, user.uid, plantioId, estufaId);
      Alert.alert('Sucesso!', 'Aplicação registrada e estoque atualizado.');
      navigation.goBack(); 
    } catch (error: any) {
      Alert.alert('Erro ao Salvar', error.message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loadingInsumos) {
    return <ActivityIndicator size="large" style={{ flex: 1 }} />;
  }

  if (insumosList.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ textAlign: 'center' }}>
          Você precisa cadastrar um insumo (com estoque) antes de registrar uma aplicação.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.label}>Insumo Utilizado</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={selectedInsumoId}
          onValueChange={(itemValue: string, itemIndex: number) => 
            setSelectedInsumoId(itemValue)
          }
        >
          {insumosList.map(insumo => (
            <Picker.Item 
              key={insumo.id} 
              label={`${insumo.nome} (Estoque: ${insumo.estoqueAtual} ${insumo.unidadePadrao})`} 
              value={insumo.id} 
            />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>Quantidade Aplicada ({getUnidadeSelecionada()})</Text>
      <TextInput
        style={styles.input}
        value={quantidade}
        onChangeText={setQuantidade}
        keyboardType="numeric"
        placeholder="Ex: 15"
      />
      
      <Text style={styles.label}>Observações (opcional)</Text>
      <TextInput
        style={styles.input}
        value={observacoes}
        onChangeText={setObservacoes}
        placeholder="Ex: Aplicação via foliar"
      />

      <Button title={loading ? "Salvando..." : "Registrar Aplicação"} onPress={handleSave} disabled={loading} />
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
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    marginBottom: 16,
    backgroundColor: '#fff',
  }
});

export default AplicacaoFormScreen;