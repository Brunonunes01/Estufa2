// src/screens/Plantios/PlantioFormScreen.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  Button, 
  ScrollView, 
  Alert, 
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator // Importar
} from 'react-native';
import { Timestamp } from 'firebase/firestore';
import { createPlantio, PlantioFormData } from '../../services/plantioService';
import { useAuth } from '../../hooks/useAuth';
import { Fornecedor } from '../../types/domain'; // Importar tipo
import { listFornecedores } from '../../services/fornecedorService'; // Importar serviço
import { useIsFocused } from '@react-navigation/native'; // Importar

type UnidadePlantio = "muda" | "bandeja" | "cova";

const PlantioFormScreen = ({ route, navigation }: any) => {
  const { user } = useAuth();
  const { estufaId } = route.params;
  const isFocused = useIsFocused(); // Hook para recarregar

  // Estados do formulário
  const [cultura, setCultura] = useState('');
  const [variedade, setVariedade] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [precoUnidade, setPrecoUnidade] = useState('');
  const [unidade, setUnidade] = useState<UnidadePlantio>('muda');
  const [cicloDias, setCicloDias] = useState('');
  
  // ****** NOVOS ESTADOS PARA FORNECEDORES ******
  const [fornecedoresList, setFornecedoresList] = useState<Fornecedor[]>([]);
  const [selectedFornecedorId, setSelectedFornecedorId] = useState<string | null>(null);
  const [loadingForm, setLoadingForm] = useState(false); // Loading do botão Salvar
  const [loadingData, setLoadingData] = useState(true); // Loading inicial (busca fornecedores)

  // Hook para buscar os fornecedores
  useEffect(() => {
    const carregarFornecedores = async () => {
      if (user) {
        setLoadingData(true);
        try {
          const lista = await listFornecedores(user.uid);
          setFornecedoresList(lista);
        } catch (error) {
          Alert.alert("Erro", "Não foi possível buscar os fornecedores.");
        } finally {
          setLoadingData(false);
        }
      }
    };
    
    if (isFocused) {
      carregarFornecedores();
    }
  }, [user, isFocused]);

  // Cálculo do Custo Estimado
  const custoEstimado = useMemo(() => {
    const qtd = parseFloat(quantidade) || 0;
    const preco = parseFloat(precoUnidade) || 0;
    return (qtd * preco);
  }, [quantidade, precoUnidade]);

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
      dataPlantio: Timestamp.now(), 
      cicloDias: parseInt(cicloDias) || null,
      status: "em_desenvolvimento",
      precoEstimadoUnidade: parseFloat(precoUnidade) || null,
      fornecedorId: selectedFornecedorId // <-- CAMPO NOVO
    };

    setLoadingForm(true);
    try {
      await createPlantio(formData, user.uid);
      Alert.alert('Sucesso!', 'Plantio registrado.');
      navigation.goBack(); 
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar o plantio.');
      console.error(error);
    } finally {
      setLoadingForm(false);
    }
  };

  // Se estiver carregando os fornecedores, mostra o loading
  if (loadingData) {
    return <ActivityIndicator size="large" style={{ flex: 1, justifyContent: 'center' }} />;
  }

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

      <Text style={styles.label}>Unidade</Text>
      <View style={styles.selectorContainer}>
        <TouchableOpacity
          style={[styles.selectorButton, unidade === 'muda' && styles.selectorButtonSelected]}
          onPress={() => setUnidade('muda')}
        >
          <Text style={[styles.selectorButtonText, unidade === 'muda' && styles.selectorButtonTextSelected]}>
            Muda
          </Text>
        </TouchableOpacity>
        {/* ... (outros botões de unidade) ... */}
        <TouchableOpacity
          style={[styles.selectorButton, unidade === 'bandeja' && styles.selectorButtonSelected]}
          onPress={() => setUnidade('bandeja')}
        >
          <Text style={[styles.selectorButtonText, unidade === 'bandeja' && styles.selectorButtonTextSelected]}>
            Bandeja
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.selectorButton, unidade === 'cova' && styles.selectorButtonSelected]}
          onPress={() => setUnidade('cova')}
        >
          <Text style={[styles.selectorButtonText, unidade === 'cova' && styles.selectorButtonTextSelected]}>
            Cova
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Quantidade Plantada</Text>
      <TextInput
        style={styles.input}
        value={quantidade}
        onChangeText={setQuantidade}
        keyboardType="numeric"
      />

      <Text style={styles.label}>Preço por Unidade (R$) (Opcional)</Text>
      <TextInput
        style={styles.input}
        value={precoUnidade}
        onChangeText={setPrecoUnidade}
        keyboardType="numeric"
        placeholder="Ex: 1.50"
      />

      <Text style={styles.label}>Custo Estimado do Plantio</Text>
      <Text style={styles.costText}>
        R$ {custoEstimado.toFixed(2)}
      </Text>
      
      <Text style={styles.label}>Ciclo em Dias (opcional)</Text>
      <TextInput
        style={styles.input}
        value={cicloDias}
        onChangeText={setCicloDias}
        keyboardType="numeric"
        placeholder="Ex: 90 (para calcular a colheita)"
      />

      {/* ****** MELHORIA: SELETOR DE FORNECEDOR ****** */}
      <Text style={styles.label}>Fornecedor (Opcional)</Text>
      <View style={styles.selectorContainer}>
        {fornecedoresList.length === 0 ? (
          <Text>Nenhum fornecedor cadastrado.</Text>
        ) : (
          fornecedoresList.map((fornecedor) => (
            <TouchableOpacity
              key={fornecedor.id}
              style={[
                styles.selectorButton,
                selectedFornecedorId === fornecedor.id && styles.selectorButtonSelected
              ]}
              onPress={() => {
                // Permite selecionar e des-selecionar
                if (selectedFornecedorId === fornecedor.id) {
                  setSelectedFornecedorId(null);
                } else {
                  setSelectedFornecedorId(fornecedor.id);
                }
              }}
            >
              <Text style={[
                styles.selectorButtonText,
                selectedFornecedorId === fornecedor.id && styles.selectorButtonTextSelected
              ]}>
                {fornecedor.nome}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </View>
      {/* ****** FIM DA MELHORIA ****** */}

      <Button title={loadingForm ? "Salvando..." : "Salvar Plantio"} onPress={handleSave} disabled={loadingForm} />
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
  selectorContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    flexWrap: 'wrap', // Permite quebrar a linha
  },
  selectorButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#007bff',
    borderRadius: 5,
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 8,
  },
  selectorButtonSelected: {
    backgroundColor: '#007bff',
  },
  selectorButtonText: {
    color: '#007bff',
    fontWeight: 'bold',
  },
  selectorButtonTextSelected: {
    color: '#fff',
  },
  costText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#005500', 
  },
});

export default PlantioFormScreen;