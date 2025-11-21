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
  ActivityIndicator, 
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Timestamp } from 'firebase/firestore';
import { createPlantio, PlantioFormData } from '../../services/plantioService';
import { useAuth } from '../../hooks/useAuth';
import { Fornecedor } from '../../types/domain'; 
import { listFornecedores } from '../../services/fornecedorService'; 
import { useIsFocused } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons'; // Ícones

type UnidadePlantio = "muda" | "bandeja" | "cova";

const PlantioFormScreen = ({ route, navigation }: any) => {
  const { user } = useAuth();
  const { estufaId } = route.params;
  const isFocused = useIsFocused(); 

  // Estados do formulário
  const [cultura, setCultura] = useState('');
  const [variedade, setVariedade] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [precoUnidade, setPrecoUnidade] = useState('');
  const [unidade, setUnidade] = useState<UnidadePlantio>('muda');
  const [cicloDias, setCicloDias] = useState('');
  
  const [fornecedoresList, setFornecedoresList] = useState<Fornecedor[]>([]);
  const [selectedFornecedorId, setSelectedFornecedorId] = useState<string | null>(null);
  const [loadingForm, setLoadingForm] = useState(false); 
  const [loadingData, setLoadingData] = useState(true); 

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
    const qtd = parseFloat(quantidade.replace(',', '.')) || 0;
    const preco = parseFloat(precoUnidade.replace(',', '.')) || 0;
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
      quantidadePlantada: parseFloat(quantidade.replace(',', '.')) || 0,
      unidadeQuantidade: unidade,
      dataPlantio: Timestamp.now(), 
      cicloDias: parseInt(cicloDias) || null,
      status: "em_desenvolvimento",
      precoEstimadoUnidade: parseFloat(precoUnidade.replace(',', '.')) || null,
      fornecedorId: selectedFornecedorId
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

  if (loadingData) {
    return <ActivityIndicator size="large" style={styles.centered} />;
  }

  return (
    <KeyboardAvoidingView 
      style={styles.fullContainer} 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView 
        style={styles.scrollContainer} 
        contentContainerStyle={styles.scrollContent}
      >
        
        {/* CARD 1: DADOS DA PLANTA */}
        <View style={styles.card}>
            <Text style={styles.cardTitle}>
                <MaterialCommunityIcons name="flower-poppy" size={20} color="#333" /> Informações da Cultura
            </Text>

            <Text style={styles.label}>Cultura (Ex: Tomate)</Text>
            <TextInput
            style={styles.input}
            value={cultura}
            onChangeText={setCultura}
            placeholder="Cultura principal do plantio"
            />
            
            <Text style={styles.label}>Variedade (Ex: Santa Clara)</Text>
            <TextInput
            style={styles.input}
            value={variedade}
            onChangeText={setVariedade}
            placeholder="Opcional"
            />

            <Text style={styles.label}>Ciclo em Dias (Opcional)</Text>
            <TextInput
            style={styles.input}
            value={cicloDias}
            onChangeText={setCicloDias}
            keyboardType="numeric"
            placeholder="Ex: 90 (para cálculo da previsão de colheita)"
            />
        </View>

        {/* CARD 2: QUANTIDADE E CUSTO */}
        <View style={styles.card}>
            <Text style={styles.cardTitle}>
                <MaterialCommunityIcons name="counter" size={20} color="#333" /> Quantidade e Custo
            </Text>

            <Text style={styles.label}>Unidade de Plantio</Text>
            <View style={styles.selectorContainer}>
            {(['muda', 'bandeja', 'cova'] as UnidadePlantio[]).map(u => (
                <TouchableOpacity
                key={u}
                style={[
                    styles.selectorButton, 
                    unidade === u && styles.selectorButtonSelected
                ]}
                onPress={() => setUnidade(u)}
                >
                <Text style={[
                    styles.selectorButtonText, 
                    unidade === u && styles.selectorButtonTextSelected
                ]}>
                    {u.charAt(0).toUpperCase() + u.slice(1)}
                </Text>
                </TouchableOpacity>
            ))}
            </View>

            <Text style={styles.label}>Quantidade Plantada</Text>
            <TextInput
            style={styles.input}
            value={quantidade}
            onChangeText={setQuantidade}
            keyboardType="numeric"
            placeholder={`Total de ${unidade}s`}
            />

            <Text style={styles.label}>Preço por Unidade (R$) (Opcional)</Text>
            <TextInput
            style={styles.input}
            value={precoUnidade}
            onChangeText={setPrecoUnidade}
            keyboardType="numeric"
            placeholder={`Custo por ${unidade}`}
            />
            
            <View style={styles.costBox}>
                <Text style={styles.costLabel}>Custo Estimado Total:</Text>
                <Text style={styles.costValue}>
                    R$ {custoEstimado.toFixed(2)}
                </Text>
            </View>
        </View>
        
        {/* CARD 3: FORNECEDOR */}
        <View style={styles.card}>
            <Text style={styles.cardTitle}>
                <MaterialCommunityIcons name="account-tie-outline" size={20} color="#333" /> Fornecedor (Opcional)
            </Text>

            <Text style={styles.label}>Selecione o Fornecedor das Mudas/Sementes</Text>
            <View style={styles.fornecedorSelectorContainer}>
            {fornecedoresList.length === 0 ? (
                <Text style={styles.emptyFornecedorText}>
                    Nenhum fornecedor cadastrado.
                    <Text style={{color: '#007bff'}} onPress={() => navigation.navigate('FornecedorForm')}> Cadastre um!</Text>
                </Text>
            ) : (
                fornecedoresList.map((fornecedor) => (
                <TouchableOpacity
                    key={fornecedor.id}
                    style={[
                    styles.fornecedorButton,
                    selectedFornecedorId === fornecedor.id && styles.fornecedorButtonSelected
                    ]}
                    onPress={() => {
                    if (selectedFornecedorId === fornecedor.id) {
                        setSelectedFornecedorId(null);
                    } else {
                        setSelectedFornecedorId(fornecedor.id);
                    }
                    }}
                >
                    <Text style={[
                    styles.fornecedorButtonText,
                    selectedFornecedorId === fornecedor.id && styles.fornecedorButtonTextSelected
                    ]}>
                    {fornecedor.nome}
                    </Text>
                </TouchableOpacity>
                ))
            )}
            </View>
        </View>


        {/* BOTÃO SALVAR CUSTOMIZADO */}
        <TouchableOpacity 
            style={styles.saveButton} 
            onPress={handleSave} 
            disabled={loadingForm}
        >
            {loadingForm ? (
                <ActivityIndicator color="#fff" />
            ) : (
                <Text style={styles.saveButtonText}>
                    Salvar Plantio
                </Text>
            )}
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// ESTILOS PARA DESIGN PROFISSIONAL
const styles = StyleSheet.create({
  fullContainer: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 60, 
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3, 
    borderWidth: 1,
    borderColor: '#eee',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
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
    padding: 12, 
    borderRadius: 8, 
    marginBottom: 16,
    backgroundColor: '#fff',
    fontSize: 16,
  },

  // Seletores de Unidade
  selectorContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    justifyContent: 'space-between',
    gap: 8,
  },
  selectorButton: {
    flex: 1, 
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  selectorButtonSelected: {
    backgroundColor: '#4CAF50',
  },
  selectorButtonText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  selectorButtonTextSelected: {
    color: '#fff',
  },
  
  // Box de Custo Estimado
  costBox: {
    backgroundColor: '#FFFDE7', // Amarelo suave
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFECB3',
  },
  costLabel: {
    fontSize: 16,
    color: '#FF9800', // Laranja
    fontWeight: 'bold',
  },
  costValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF9800',
  },

  // Seletores de Fornecedor
  fornecedorSelectorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
    marginTop: 10,
  },
  fornecedorButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#007bff',
    borderRadius: 20, // Botão mais arredondado (pílula)
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 8,
  },
  fornecedorButtonSelected: {
    backgroundColor: '#007bff',
  },
  fornecedorButtonText: {
    color: '#007bff',
    fontWeight: 'bold',
  },
  fornecedorButtonTextSelected: {
    color: '#fff',
  },
  emptyFornecedorText: {
    fontStyle: 'italic',
    color: '#888',
    marginTop: 5,
  },

  // Botão Salvar Customizado
  saveButton: {
    width: '100%',
    backgroundColor: '#4CAF50', 
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

export default PlantioFormScreen;