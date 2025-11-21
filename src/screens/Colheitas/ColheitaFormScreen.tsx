// src/screens/Colheitas/ColheitaFormScreen.tsx
import React, { useState, useMemo } from 'react';
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
import { createColheita, ColheitaFormData } from '../../services/colheitaService';
import { useAuth } from '../../hooks/useAuth';
import { MaterialCommunityIcons } from '@expo/vector-icons'; // Ícones

// Tipos de unidade que vamos permitir
type UnidadeColheita = "kg" | "caixa" | "unidade" | "maço";

const ColheitaFormScreen = ({ route, navigation }: any) => {
  const { user } = useAuth();
  const { plantioId, estufaId } = route.params;

  // Estados do formulário
  const [quantidade, setQuantidade] = useState('');
  const [unidade, setUnidade] = useState<UnidadeColheita>('kg'); // Padrão 'kg'
  const [preco, setPreco] = useState('');
  const [destino, setDestino] = useState('');
  const [loading, setLoading] = useState(false);

  // Cálculo do Valor Total
  const valorTotal = useMemo(() => {
    // Substitui vírgula por ponto para garantir o parsing correto
    const qtd = parseFloat(quantidade.replace(',', '.')) || 0;
    const precoUnit = parseFloat(preco.replace(',', '.')) || 0;
    return (qtd * precoUnit);
  }, [quantidade, preco]); 

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
      quantidade: parseFloat(quantidade.replace(',', '.')) || 0,
      unidade: unidade,
      precoUnitario: parseFloat(preco.replace(',', '.')) || null,
      destino: destino || null,
      observacoes: null,
    };

    setLoading(true);
    try {
      await createColheita(formData, user.uid, plantioId, estufaId);
      Alert.alert('Sucesso!', 'Colheita registrada.');
      navigation.goBack(); 
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar a colheita.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.fullContainer} 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
          
          {/* CARD 1: DADOS DA COLHEITA */}
          <View style={styles.card}>
              <Text style={styles.cardTitle}>
                  <MaterialCommunityIcons name="basket-fill" size={20} color="#333" /> Registro de Colheita
              </Text>

              {/* SELETOR DE UNIDADE */}
              <Text style={styles.label}>Unidade</Text>
              <View style={styles.selectorContainer}>
                {(['kg', 'caixa', 'unidade', 'maço'] as UnidadeColheita[]).map(u => (
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

              <Text style={styles.label}>Quantidade Colhida</Text>
              <TextInput
                style={styles.input}
                value={quantidade}
                onChangeText={setQuantidade}
                keyboardType="numeric"
                placeholder={`Total em ${unidade}s`}
              />
              
              <Text style={styles.label}>Preço Unitário (R$) (opcional)</Text>
              <TextInput
                style={styles.input}
                value={preco}
                onChangeText={setPreco}
                keyboardType="numeric"
                placeholder={`Preço de venda por ${unidade}`}
              />
          </View>
          
          {/* CARD 2: RESUMO E DESTINO */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
                  <MaterialCommunityIcons name="cash-multiple" size={20} color="#333" /> Resumo e Destino
              </Text>
              
              {/* VALOR TOTAL - DESTAQUE */}
              <View style={styles.totalBox}>
                  <Text style={styles.totalLabel}>Valor Total Desta Colheita</Text>
                  <Text style={styles.totalValue}>
                      R$ {valorTotal.toFixed(2)}
                  </Text>
              </View>

              <Text style={styles.label}>Destino (opcional)</Text>
              <TextInput
                style={styles.input}
                value={destino}
                onChangeText={setDestino}
                placeholder="Ex: Feira, Mercado Local, Consumo Próprio"
              />
          </View>

          {/* BOTÃO SALVAR CUSTOMIZADO */}
          <TouchableOpacity 
              style={styles.saveButton} 
              onPress={handleSave} 
              disabled={loading}
          >
              {loading ? (
                  <ActivityIndicator color="#fff" />
              ) : (
                  <Text style={styles.saveButtonText}>
                      Salvar Colheita
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
    fontSize: 14,
  },
  selectorButtonTextSelected: {
    color: '#fff',
  },
  
  // Box de Valor Total
  totalBox: {
    backgroundColor: '#E8F5E9', // Verde suave
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  totalLabel: {
    fontSize: 16,
    color: '#006400', // Verde Escuro
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#006400',
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

export default ColheitaFormScreen;