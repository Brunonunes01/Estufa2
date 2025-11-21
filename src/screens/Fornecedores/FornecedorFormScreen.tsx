// src/screens/Fornecedores/FornecedorFormScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  Button, 
  ScrollView, 
  Alert, 
  StyleSheet, 
  ActivityIndicator,
  TouchableOpacity // Adicionado para estilização de botão customizada
} from 'react-native';
import { 
  createFornecedor, 
  FornecedorFormData,
  getFornecedorById, 
  updateFornecedor 
} from '../../services/fornecedorService';
import { useAuth } from '../../hooks/useAuth';

const FornecedorFormScreen = ({ route, navigation }: any) => {
  const { user } = useAuth();
  
  const fornecedorId = route.params?.fornecedorId;
  const isEditMode = !!fornecedorId;
  
  // Estados do formulário
  const [nome, setNome] = useState('');
  const [contato, setContato] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  // Hook para carregar dados em modo edição e definir título
  useEffect(() => {
    // Define o título da tela
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
        await updateFornecedor(fornecedorId, formData);
        Alert.alert('Sucesso!', 'Fornecedor atualizado.');
      } else {
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
    return <ActivityIndicator size="large" style={styles.centered} />;
  }

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
      
      {/* Container Principal em estilo Card */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          {isEditMode ? 'Informações do Fornecedor' : 'Novo Cadastro'}
        </Text>

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
          placeholder="(99) 99999-9999"
        />

        <Text style={styles.label}>Email (opcional)</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="contato@empresa.com"
        />
      </View>
      
      <TouchableOpacity 
        style={styles.saveButton} 
        onPress={handleSave} 
        disabled={loading}
      >
        {loading ? (
            <ActivityIndicator color="#fff" />
        ) : (
            <Text style={styles.saveButtonText}>
              {isEditMode ? "Atualizar Fornecedor" : "Salvar Fornecedor"}
            </Text>
        )}
      </TouchableOpacity>
      
    </ScrollView>
  );
};

// ESTILOS PARA DESIGN PROFISSIONAL (Material Look)
const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: '#FAFAFA', // Fundo claro
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    alignItems: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Estilo de Card (Container principal)
  card: {
    width: '100%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    // Sombra (Elevation) para simular o efeito flutuante
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3, 
    borderWidth: 1,
    borderColor: '#eee',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    marginBottom: 4,
    fontWeight: 'bold',
    color: '#555',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12, // Aumenta o padding para melhor toque
    borderRadius: 8, // Aumenta o arredondamento
    marginBottom: 16,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  
  // Botão customizado para Salvar
  saveButton: {
    width: '100%',
    backgroundColor: '#4CAF50', // Verde Primário
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    minHeight: 50,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default FornecedorFormScreen;