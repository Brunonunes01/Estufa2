// src/screens/Aplicacoes/AplicacaoFormScreen.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, Text, TextInput, Button, ScrollView, Alert, 
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, TouchableOpacity 
} from 'react-native';
import { Timestamp } from 'firebase/firestore';
import { createAplicacao, AplicacaoFormData } from '../../services/aplicacaoService';
import { listInsumos } from '../../services/insumoService'; 
import { useAuth } from '../../hooks/useAuth';
import { Insumo, AplicacaoItem } from '../../types/domain';
import { Picker } from '@react-native-picker/picker'; 
import { MaterialCommunityIcons } from '@expo/vector-icons'; // Ícones

const AplicacaoFormScreen = ({ route, navigation }: any) => {
  const { user } = useAuth();
  const { plantioId, estufaId, clonarAplicacao } = route.params;

  const [loading, setLoading] = useState(false);
  const [loadingInsumos, setLoadingInsumos] = useState(true);
  const [insumosList, setInsumosList] = useState<Insumo[]>([]);
  
  // Dados Gerais
  const [volumeTanque, setVolumeTanque] = useState(''); // Volume de UM tanque
  const [numeroTanques, setNumeroTanques] = useState(''); // Quantidade de tanques/máquinas
  const [observacoes, setObservacoes] = useState('');

  // Dados do Item Atual (para adicionar)
  const [selectedInsumoId, setSelectedInsumoId] = useState<string | undefined>(undefined);
  const [doseItem, setDoseItem] = useState(''); // Dose por tanque/máquina
  
  // Lista de Itens (O Carrinho)
  const [itensAdicionados, setItensAdicionados] = useState<AplicacaoItem[]>([]);

  // Calcula o total aplicado do insumo atual com base na Dose e no Número de Tanques
  const totalAplicadoPorInsumo = useMemo(() => {
    // 1. Normaliza e converte para número (usando 0 se for inválido)
    const doseNum = parseFloat(doseItem.replace(',', '.')) || 0;
    const numTanquesNum = parseFloat(numeroTanques.replace(',', '.')) || 0;
    
    // 2. Se ambos forem válidos e maiores que zero, calcula
    if (doseNum > 0 && numTanquesNum > 0) {
        // Total Produto Usado = Dose por Tanque * Número de Tanques
        return doseNum * numTanquesNum;
    } 
    return null;
  }, [doseItem, numeroTanques]);


  useEffect(() => {
    const carregarInsumos = async () => {
      if (user) {
        setLoadingInsumos(true);
        try {
          const lista = await listInsumos(user.uid);
          setInsumosList(lista);
          
          if (clonarAplicacao) {
            setObservacoes(clonarAplicacao.observacoes || '');
            if (clonarAplicacao.volumeTanque) {
              setVolumeTanque(String(clonarAplicacao.volumeTanque));
            }
            if (clonarAplicacao.numeroTanques) {
              setNumeroTanques(String(clonarAplicacao.numeroTanques));
            }

            if (clonarAplicacao.itens && Array.isArray(clonarAplicacao.itens)) {
              setItensAdicionados(clonarAplicacao.itens);
            }

            Alert.alert("Modo Clonar", "Os itens e dados da aplicação anterior foram carregados.");
          
          } else {
            // Modo Novo: seleciona o primeiro insumo por padrão
            if (lista.length > 0) {
              setSelectedInsumoId(lista[0].id);
            } else {
              setSelectedInsumoId(undefined);
            }
          }

        } catch (error) {
          console.error(error);
          Alert.alert("Erro", "Não foi possível carregar seus insumos.");
        } finally {
          setLoadingInsumos(false);
        }
      }
    };
    carregarInsumos();
  }, [user, clonarAplicacao]);

  const getInsumoSelecionado = () => insumosList.find(i => i.id === selectedInsumoId);
  const getUnidadeSelecionada = () => getInsumoSelecionado()?.unidadePadrao || "...";
  
  const handleAddItem = () => {
    const insumo = getInsumoSelecionado();
    if (!insumo) return;

    const doseString = doseItem.replace(',', '.');
    const doseNum = parseFloat(doseString);
    
    if (isNaN(doseNum) || doseNum <= 0) {
      Alert.alert("Atenção", "Digite uma dose por tanque válida.");
      return;
    }
    
    if (!totalAplicadoPorInsumo || totalAplicadoPorInsumo <= 0) {
        Alert.alert("Atenção", "Preencha o 'Número de Tanques' acima para calcular a Quantidade Total.");
        return;
    }

    // Verifica se já está na lista
    if (itensAdicionados.some(i => i.insumoId === insumo.id)) {
      Alert.alert("Duplicado", "Este insumo já está na lista. Remova-o da lista abaixo se quiser alterar.");
      return;
    }
    
    const totalAplicado = totalAplicadoPorInsumo;

    const novoItem: AplicacaoItem = {
      insumoId: insumo.id,
      nomeInsumo: insumo.nome,
      quantidadeAplicada: totalAplicado, // <--- VALOR CALCULADO
      unidade: insumo.unidadePadrao,
      dosePorTanque: doseNum
    };

    setItensAdicionados([...itensAdicionados, novoItem]);
    
    // Limpa os campos de adição para o próximo item
    setDoseItem('');
  };

  const handleRemoveItem = (index: number) => {
    const novaLista = [...itensAdicionados];
    novaLista.splice(index, 1);
    setItensAdicionados(novaLista);
  };

  const handleSaveAll = async () => {
    if (!user) {
      Alert.alert("Erro", "Usuário não autenticado.");
      return;
    }

    if (itensAdicionados.length === 0) {
      Alert.alert("Vazio", "Adicione pelo menos um insumo à mistura antes de salvar.");
      return;
    }

    const volString = volumeTanque.replace(',', '.');
    const volNum = parseFloat(volString);
    
    const numTanquesString = numeroTanques.replace(',', '.');
    const numTanquesNum = parseFloat(numTanquesString); 

    if (isNaN(numTanquesNum) || numTanquesNum <= 0) {
        Alert.alert("Atenção", "O Número de Tanques aplicados deve ser maior que zero.");
        return;
    }

    const formData: AplicacaoFormData = {
      dataAplicacao: Timestamp.now(),
      observacoes: observacoes || null,
      volumeTanque: isNaN(volNum) ? null : volNum,
      numeroTanques: numTanquesNum, 
      itens: itensAdicionados
    };

    setLoading(true);
    try {
      await createAplicacao(formData, user.uid, plantioId, estufaId);
      Alert.alert('Sucesso!', 'Aplicação registrada e estoque atualizado.');
      navigation.goBack(); 
    } catch (error: any) {
      let msg = "Ocorreu um erro ao salvar.";
      if (error.message && error.message.includes("Estoque insuficiente")) {
        msg = error.message;
      }
      Alert.alert('Erro ao Salvar', msg);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loadingInsumos) return <ActivityIndicator size="large" style={styles.centered} />;

  if (insumosList.length === 0) {
      return (
        // USO CORRIGIDO
        <View style={styles.containerCenter}>
          <Text style={styles.emptyFornecedorText}>
            Você precisa cadastrar insumos com estoque primeiro.
          </Text>
        </View>
      );
  }

  return (
    <KeyboardAvoidingView style={styles.fullContainer} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        
        {/* CARD 1: DADOS DA CALDA (CABEÇALHO) */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            <MaterialCommunityIcons name="water-outline" size={20} color="#333" /> Dados da Calda e Observações
          </Text>
          
          <Text style={styles.label}>Descrição / Alvo (Opcional)</Text>
          <TextInput
            style={styles.input}
            value={observacoes}
            onChangeText={setObservacoes}
            placeholder="Ex: Preventivo Fungicida + Adubo"
          />
          
          <Text style={styles.label}>Volume de **UM** Tanque/Recipiente (L)</Text>
          <TextInput
            style={styles.input}
            value={volumeTanque}
            onChangeText={setVolumeTanque}
            keyboardType="numeric"
            placeholder="Ex: 200 (Opcional)"
          />
          
          <Text style={styles.label}>Número de Tanques/Máquinas Aplicadas (Obrigatório)</Text>
          <TextInput
            style={styles.input}
            value={numeroTanques}
            onChangeText={setNumeroTanques}
            keyboardType="numeric"
            placeholder="Ex: 5"
          />
        </View>

        {/* CARD 2: ÁREA DE ADICIONAR ITEM */}
        <View style={[styles.card, styles.addItemCard]}>
          <Text style={styles.addItemTitle}>
            <MaterialCommunityIcons name="plus-circle-outline" size={20} color="#4CAF50" /> Adicionar Insumo à Mistura
          </Text>
          
          <Text style={styles.label}>Selecione o Insumo</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedInsumoId}
              onValueChange={(itemValue: string) => setSelectedInsumoId(itemValue)}
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

          <View style={styles.row}>
            {/* Dose por Tanque */}
            <View style={styles.col}>
              <Text style={styles.label}>Dose por Tanque ({getUnidadeSelecionada()})</Text>
              <TextInput
                style={styles.input}
                value={doseItem}
                onChangeText={setDoseItem}
                keyboardType="numeric"
                placeholder="Ex: 500"
              />
            </View>
            
            {/* CÁLCULO VISUAL */}
            <View style={styles.col}>
                <Text style={styles.label}>Qtd. Total Calculada</Text>
                <View style={styles.calculatedBox}>
                    <Text style={styles.calculatedText}>
                        {totalAplicadoPorInsumo === null 
                            ? 'N/A' 
                            : totalAplicadoPorInsumo.toFixed(2)}
                    </Text>
                    <Text style={styles.calculatedUnit}>{getUnidadeSelecionada()}</Text>
                    {totalAplicadoPorInsumo !== null && <Text style={styles.calculationDetail}>
                        ({doseItem || 0} x {numeroTanques || 0} Tanques)
                    </Text>}
                </View>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.addButton}
            onPress={handleAddItem} 
            disabled={totalAplicadoPorInsumo === null || totalAplicadoPorInsumo <= 0} 
          >
            <Text style={styles.addButtonText}>Adicionar Item à Lista</Text>
            {/* Dica visual de por que está desabilitado */}
            {(totalAplicadoPorInsumo === null || totalAplicadoPorInsumo <= 0) && (
              <MaterialCommunityIcons name="lock" size={16} color="#fff" style={{marginLeft: 10}} />
            )}
          </TouchableOpacity>
        </View>

        {/* CARD 3: LISTA DE ITENS (O CARRINHO) */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            <MaterialCommunityIcons name="cart-variant" size={20} color="#333" /> Itens na Mistura ({itensAdicionados.length})
          </Text>
          {itensAdicionados.length === 0 ? (
            <Text style={styles.emptyListText}>Nenhum item adicionado ainda.</Text>
          ) : (
            itensAdicionados.map((item, index) => (
              <View key={index} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.nomeInsumo}</Text>
                  <Text style={styles.itemDetailText}>
                    Total Gasto (Estoque): <Text style={styles.itemQuantityValue}>
                      {item.quantidadeAplicada.toFixed(2)} {item.unidade}
                    </Text>
                  </Text>
                  <Text style={styles.itemCalculationDetail}>
                    Dose/Tanque: {item.dosePorTanque} | Total Tanques: {numeroTanques || 'N/A'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleRemoveItem(index)} style={styles.removeBtn}>
                  <MaterialCommunityIcons name="delete-outline" size={24} color="white" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* BOTÃO SALVAR GERAL */}
        <TouchableOpacity 
            style={styles.saveButton} 
            onPress={handleSaveAll} 
            disabled={loading || itensAdicionados.length === 0}
        >
            {loading ? (
                <ActivityIndicator color="#fff" />
            ) : (
                <Text style={styles.saveButtonText}>
                    CONCLUIR APLICAÇÃO
                </Text>
            )}
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// ESTILOS PARA DESIGN PROFISSIONAL
const styles = StyleSheet.create({
  fullContainer: { flex: 1, backgroundColor: '#FAFAFA' },
  scrollContainer: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 60, alignItems: 'center' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // CORREÇÃO: Estilo para centralizar o aviso de lista vazia
  containerCenter: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20 
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
  label: { fontSize: 14, marginBottom: 4, fontWeight: 'bold', color: '#555' },
  input: { 
    borderWidth: 1, 
    borderColor: '#ccc', 
    padding: 12, 
    borderRadius: 8, 
    marginBottom: 16, 
    backgroundColor: '#fff',
    fontSize: 16
  },
  pickerContainer: { 
    borderWidth: 1, 
    borderColor: '#ccc', 
    borderRadius: 8, 
    marginBottom: 16, 
    backgroundColor: '#fff' 
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  col: { width: '48%' },
  
  // ESTILOS DE ADICIONAR ITEM
  addItemCard: {
    borderLeftWidth: 5,
    borderLeftColor: '#4CAF50',
  },
  addItemTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    marginBottom: 20, 
    color: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
  },

  // Estilos para o texto calculado (Destaque)
  calculatedBox: {
    backgroundColor: '#E8F5E9', // Verde suave
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    height: 90, // Altura fixa para alinhar
  },
  calculatedText: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#006400', 
  },
  calculatedUnit: {
    fontSize: 14,
    color: '#006400',
  },
  calculationDetail: {
    fontSize: 10,
    color: '#666',
    marginTop: 5,
  },
  
  // Botão Adicionar Item
  addButton: {
    backgroundColor: '#FF9800', // Laranja
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },

  // ESTILOS DE LISTA DE ITENS ("CARRINHO")
  itemRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 10, 
    paddingHorizontal: 5,
    borderBottomWidth: 1, 
    borderBottomColor: '#eee',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 8
  },
  itemName: { 
    fontWeight: 'bold', 
    fontSize: 16 
  },
  itemDetailText: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  itemQuantityValue: {
    fontWeight: 'bold',
    color: '#333'
  },
  itemCalculationDetail: {
    fontSize: 12, 
    color: '#888'
  },
  removeBtn: { 
    padding: 10, 
    backgroundColor: '#d9534f', // Vermelho
    borderRadius: 8,
    marginLeft: 10,
  },
  emptyListText: { 
    fontStyle: 'italic', 
    color: '#888', 
    textAlign: 'center',
    padding: 10,
  },
  emptyFornecedorText: { 
    textAlign: 'center', 
    marginTop: 10, 
    color: '#666', 
    fontSize: 16 
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

  // Botão Salvar Geral
  saveButton: {
    width: '100%',
    backgroundColor: '#006400', // Verde Escuro para Ação Final
    padding: 18,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    minHeight: 55,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  }
});

export default AplicacaoFormScreen;