// src/screens/Fornecedores/FornecedorFormScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, ScrollView, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { 
  createFornecedor, 
  FornecedorFormData,
  getFornecedorById, 
  updateFornecedor 
} from '../../services/fornecedorService';
import { useAuth } from '../../hooks/useAuth';

const FornecedorFormScreen = ({ route, navigation }: any) => {
  const { user } = useAuth();
  
  // NOVO: Detecta se estamos editando
  const fornecedorId = route.params?.fornecedorId;
  const isEditMode = !!fornecedorId;
  
  // Estados do formulário
  const [nome, setNome] = useState('');
  const [contato, setContato] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false); // Para carregar dados iniciais

  // Hook para carregar dados em modo edição e definir título
  useEffect(() => {
    // NOVO: Define o título da tela
    navigation.setOptions({
      title: isEditMode ? 'Editar Fornecedor' : 'Novo Fornecedor'
    });

    const carregarDadosFornecedor = async () => {
      if (isEditMode && fornecedorId) {
        setLoadingData(true);
        try {
          const fornecedor = await getFornecedorById(fornecedorId);
          if (fornecedor) {
            setNome(fornecedor.nome);
            setContato(fornecedor.contato || '');
            setTelefone(fornecedor.telefone || '');
            setEmail(fornecedor.email || '');
            // outros campos...
          }
        } catch (error) {
          Alert.alert('Erro', 'Não foi possível carregar os dados do fornecedor.');
          navigation.goBack();
        } finally {
          setLoadingData(false);
        }
      }
    };
    carregarDadosFornecedor();
  }, [fornecedorId, isEditMode, navigation]);


  const handleSave = async () => {
    if (!user) {
      Alert.alert('Erro', 'Usuário não autenticado.');
      return;
    }
    if (!nome) {
      Alert.alert('Campo obrigatório', 'Preencha pelo menos o Nome.');
      return;
    }

    const formData: FornecedorFormData = {
      nome: nome,
      contato: contato || null,
      telefone: telefone || null,
      email: email || null,
      endereco: null, 
      observacoes: null, 
    };

    setLoading(true);
    try {
      if (isEditMode) {
        // NOVO: Atualizar
        await updateFornecedor(fornecedorId, formData);
        Alert.alert('Sucesso!', 'Fornecedor atualizado.');
      } else {
        // Criação
        await createFornecedor(formData, user.uid);
        Alert.alert('Sucesso!', 'Fornecedor cadastrado.');
      }
      navigation.goBack(); // Volta para a lista
    } catch (error) {
      Alert.alert('Erro', `Não foi possível ${isEditMode ? 'atualizar' : 'salvar'} o fornecedor.`);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return <ActivityIndicator size="large" style={{ flex: 1, justifyContent: 'center' }} />;
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.label}>Nome (obrigatório)</Text>
      <TextInput
        style={styles.input}
        value={nome}
        onChangeText={setNome}
        placeholder="Ex: Casa do Adubo"
      />
      
      <Text style={styles.label}>Nome do Contato (opcional)</Text>
      <TextInput
        style={styles.input}
        value={contato}
        onChangeText={setContato}
        placeholder="Ex: João"
      />

      <Text style={styles.label}>Telefone (opcional)</Text>
      <TextInput
        style={styles.input}
        value={telefone}
        onChangeText={setTelefone}
        keyboardType="phone-pad"
      />

      <Text style={styles.label}>Email (opcional)</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <Button title={loading ? "Salvando..." : "Salvar Fornecedor"} onPress={handleSave} disabled={loading} />
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

export default FornecedorFormScreen;