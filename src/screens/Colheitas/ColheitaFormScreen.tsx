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
  const [preco, setPreco] = useState(''); // Preço da caixa ou preço por kg/unidade
  const [destino, setDestino] = useState('');
  const [loading, setLoading] = useState(false);
  
  // NOVO ESTADO: Peso da Caixa (usado apenas se unidade for 'caixa')
  const [pesoCaixa, setPesoCaixa] = useState(''); 
  
  // Função auxiliar para parsear e garantir ponto flutuante
  const parseNum = (text: string) => parseFloat(text.replace(',', '.')) || 0;

  // Cálculo de conversão e preço por KILO
  const { precoPorKilo, pesoTotalKilo } = useMemo(() => {
    const qtd = parseNum(quantidade);
    const precoUnitario = parseNum(preco);
    
    if (unidade === 'caixa') {
        const peso = parseNum(pesoCaixa);
        
        // Calcula o preço real por kg: Preço da Caixa / Peso da Caixa
        const precoPorKilo = (peso > 0 && precoUnitario > 0) ? (precoUnitario / peso) : 0;
        
        // Calcula o peso total em quilos: Quantidade de Caixas * Peso da Caixa
        const totalKilo = qtd * peso;
        
        return {
            precoPorKilo: precoPorKilo,
            pesoTotalKilo: totalKilo
        };
    }
    
    // Para as outras unidades, usa a quantidade inserida (que já está na unidade final)
    return { precoPorKilo: 0, pesoTotalKilo: qtd };
    
  }, [quantidade, preco, unidade, pesoCaixa]);


  // Cálculo do Valor Total (Sempre baseado na entrada do usuário para exibição)
  const valorTotal = useMemo(() => {
    const qtd = parseNum(quantidade);
    const precoUnit = parseNum(preco);
    return (qtd * precoUnit);
    
  }, [quantidade, preco]); 
  
  
  const handleSave = async () => {
    if (!user) {
      Alert.alert('Erro', 'Usuário não autenticado.');
      return;
    }

    // Validação
    const qtdParsed = parseNum(quantidade);
    if (qtdParsed <= 0) {
        Alert.alert('Campos obrigatórios', 'Preencha a Quantidade.');
        return;
    }
    
    // Variáveis para os dados finais a serem salvos
    let finalQuantity = qtdParsed;
    let finalUnit = unidade;
    let finalPriceUnitario = parseNum(preco) || null;
    
    // Lógica de Salvamento para 'caixa'
    if (unidade === 'caixa') {
        if (parseNum(pesoCaixa) <= 0) {
            Alert.alert('Campos obrigatórios', 'Preencha o Peso da Caixa para esta unidade.');
            return;
        }
        
        // Conversão: Salva o total em quilos (pesoTotalKilo) e o preço por quilo (precoPorKilo)
        finalQuantity = pesoTotalKilo;
        finalUnit = 'kg'; 
        finalPriceUnitario = precoPorKilo || null; 
    }
    

    const formData: ColheitaFormData = {
      quantidade: finalQuantity,
      unidade: finalUnit,
      precoUnitario: finalPriceUnitario,
      destino: destino || null,
      observacoes: null,
    };

    setLoading(true);
    try {
      await createColheita(formData, user.uid, plantioId, estufaId);
      Alert.alert('Sucesso!', `Colheita de ${finalQuantity.toFixed(2)} ${finalUnit} registrada.`); 
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
                    onPress={() => {
                        setUnidade(u);
                        // Limpa o peso da caixa se mudar a unidade
                        if (u !== 'caixa') {
                            setPesoCaixa('');
                        }
                    }}
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

              {/* INPUT DE QUANTIDADE - Título adaptado se for 'caixa' */}
              <Text style={styles.label}>
                Quantidade Colhida ({unidade === 'caixa' ? 'Nº de Caixas' : `Total em ${unidade}s`})
              </Text>
              <TextInput
                style={styles.input}
                value={quantidade}
                onChangeText={setQuantidade}
                keyboardType="numeric"
                placeholder={unidade === 'caixa' ? "Total de Caixas" : `Total em ${unidade}s`}
              />
              
              {/* === NOVO CAMPO: PESO DA CAIXA (SÓ VISÍVEL SE UNIDADE FOR 'CAIXA') === */}
              {unidade === 'caixa' && (
                <>
                <Text style={styles.label}>Peso de **UMA** Caixa (Kg)</Text>
                <TextInput
                    style={styles.input}
                    value={pesoCaixa}
                    onChangeText={setPesoCaixa}
                    keyboardType="numeric"
                    placeholder="Ex: 10 (kg)"
                />
                </>
              )}
              
              {/* INPUT DE PREÇO - Título adaptado se for 'caixa' */}
              <Text style={styles.label}>
                Preço Unitário (R$) ({unidade === 'caixa' ? 'Preço por Caixa' : `Preço por ${unidade}`}) (opcional)
              </Text>
              <TextInput
                style={styles.input}
                value={preco}
                onChangeText={setPreco}
                keyboardType="numeric"
                placeholder={unidade === 'caixa' ? "Preço de venda de UMA caixa" : `Preço de venda por ${unidade}`}
              />
          </View>
          
          {/* CARD 2: RESUMO E DESTINO */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
                  <MaterialCommunityIcons name="cash-multiple" size={20} color="#333" /> Resumo e Destino
              </Text>
              
              {/* === BLOCO: CONVERSÃO DE PREÇO (SÓ SE FOR 'CAIXA' E COM DADOS VÁLIDOS) === */}
              {unidade === 'caixa' && pesoTotalKilo > 0 && parseNum(preco) > 0 && (
                <View style={[styles.totalBox, styles.conversionBox]}>
                    <Text style={styles.totalLabel}>Conversão para Armazenamento:</Text>
                    <View style={styles.conversionDetails}>
                         <Text style={styles.conversionDetailText}>
                            <Text style={styles.conversionDetailValue}>{pesoTotalKilo.toFixed(2)} kg</Text> Totais
                        </Text>
                        <Text style={styles.conversionDetailText}>
                            <Text style={styles.conversionDetailValue}>R$ {precoPorKilo.toFixed(2)}</Text> por kg
                        </Text>
                    </View>
                    <Text style={styles.totalLabelSubtext}>* Estes valores (kg e R$/kg) serão salvos na base de dados.</Text>
                </View>
              )}

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

  // === NOVOS ESTILOS PARA CAIXA DE CONVERSÃO ===
  conversionBox: {
    backgroundColor: '#E3F2FD', // Azul suave para conversão/info
    borderColor: '#B3E5FC',
    marginBottom: 15,
  },
  conversionDetails: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      width: '100%',
      marginTop: 8,
  },
  conversionDetailText: {
      fontSize: 16,
      color: '#007bff',
      textAlign: 'center',
  },
  conversionDetailValue: {
      fontWeight: 'bold',
      fontSize: 18,
  },
  totalLabelSubtext: {
    fontSize: 10,
    color: '#555',
    marginTop: 8,
    fontStyle: 'italic',
  },
  // ===========================================

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