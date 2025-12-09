// src/screens/Colheitas/ColheitaFormScreen.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { 
  View, Text, TextInput, ScrollView, Alert, StyleSheet,
  TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { Picker } from '@react-native-picker/picker'; 
import { createColheita, ColheitaFormData } from '../../services/colheitaService';
import { listAllPlantios } from '../../services/plantioService';
import { listEstufas } from '../../services/estufaService';
import { listClientes } from '../../services/clienteService'; 
import { useAuth } from '../../hooks/useAuth';
import { MaterialCommunityIcons } from '@expo/vector-icons'; 
import { Plantio, Cliente } from '../../types/domain';

type UnidadeColheita = "kg" | "caixa" | "unidade" | "maço";
type MetodoPagamento = "pix" | "dinheiro" | "boleto" | "prazo" | "cartao" | "outro";

const ColheitaFormScreen = ({ route, navigation }: any) => {
  const { user } = useAuth();
  
  const params = route.params || {};
  const { plantioId: paramPlantioId, estufaId: paramEstufaId } = params;

  const [isSelectionMode, setIsSelectionMode] = useState(!paramPlantioId);
  const [selectedPlantioId, setSelectedPlantioId] = useState<string>(paramPlantioId || '');
  
  const [plantiosDisponiveis, setPlantiosDisponiveis] = useState<Plantio[]>([]);
  const [clientesList, setClientesList] = useState<Cliente[]>([]); 
  const [estufasMap, setEstufasMap] = useState<Record<string, string>>({});
  const [loadingData, setLoadingData] = useState(false);

  const [quantidade, setQuantidade] = useState('');
  const [unidade, setUnidade] = useState<UnidadeColheita>('kg'); 
  const [preco, setPreco] = useState(''); 
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null); 
  const [destino, setDestino] = useState(''); 
  const [pesoCaixa, setPesoCaixa] = useState(''); 
  
  // NOVO ESTADO: Método de Pagamento
  const [metodoPagamento, setMetodoPagamento] = useState<MetodoPagamento>('pix');

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setLoadingData(true);
      const promises: Promise<any>[] = [listClientes(user.uid)];
      
      if (isSelectionMode) {
          promises.push(listAllPlantios(user.uid));
          promises.push(listEstufas(user.uid));
      }

      Promise.all(promises).then((results) => {
        const clientes = results[0];
        setClientesList(clientes);

        if (isSelectionMode) {
            const listaPlantios = results[1];
            const listaEstufas = results[2];
            
            const mapE: Record<string, string> = {};
            listaEstufas.forEach((e: any) => mapE[e.id] = e.nome);
            setEstufasMap(mapE);

            const ativos = listaPlantios.filter((p: any) => p.status !== 'finalizado');
            setPlantiosDisponiveis(ativos);
            if (ativos.length > 0) setSelectedPlantioId(ativos[0].id);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoadingData(false));
    }
  }, [isSelectionMode, user]);

  const parseNum = (text: string) => parseFloat(text.replace(',', '.')) || 0;

  const { precoPorKilo, pesoTotalKilo } = useMemo(() => {
    const qtd = parseNum(quantidade);
    const precoUnitario = parseNum(preco);
    if (unidade === 'caixa') {
        const peso = parseNum(pesoCaixa);
        const pKilo = (peso > 0 && precoUnitario > 0) ? (precoUnitario / peso) : 0;
        return { precoPorKilo: pKilo, pesoTotalKilo: qtd * peso };
    }
    return { precoPorKilo: 0, pesoTotalKilo: qtd };
  }, [quantidade, preco, unidade, pesoCaixa]);

  const valorTotal = useMemo(() => {
    return parseNum(quantidade) * parseNum(preco);
  }, [quantidade, preco]); 

  const handleSave = async (resetAfterSave: boolean = false) => {
    if (!user) return;

    let finalPlantioId = paramPlantioId;
    let finalEstufaId = paramEstufaId;

    if (isSelectionMode) {
        finalPlantioId = selectedPlantioId;
        const p = plantiosDisponiveis.find(pp => pp.id === selectedPlantioId);
        if (p) finalEstufaId = p.estufaId;
    }

    if (!finalPlantioId || !finalEstufaId) {
        Alert.alert("Erro", "Selecione um plantio válido.");
        return;
    }

    const qtdParsed = parseNum(quantidade);
    if (qtdParsed <= 0) {
        Alert.alert('Atenção', 'Digite uma Quantidade válida.');
        return;
    }
    
    let finalQuantity = qtdParsed;
    let finalUnit = unidade;
    let finalPriceUnitario = parseNum(preco) || null;
    
    if (unidade === 'caixa') {
        if (parseNum(pesoCaixa) <= 0) {
            Alert.alert('Atenção', 'Informe o Peso da Caixa.');
            return;
        }
        finalQuantity = pesoTotalKilo;
        finalUnit = 'kg'; 
        finalPriceUnitario = precoPorKilo || null; 
    }

    const formData: ColheitaFormData = {
      quantidade: finalQuantity,
      unidade: finalUnit,
      precoUnitario: finalPriceUnitario,
      clienteId: selectedClienteId,
      destino: destino || null,
      metodoPagamento: metodoPagamento, // Enviando o novo campo
      observacoes: null,
    };

    setLoading(true);
    try {
      await createColheita(formData, user.uid, finalPlantioId, finalEstufaId);
      
      if (resetAfterSave) {
          Alert.alert("Sucesso", "Registrado! Pronto para o próximo.");
          setQuantidade('');
          // Mantém Unidade, Preço, Destino, Método Pagamento e Peso Caixa para agilizar
      } else {
          Alert.alert('Sucesso!', 'Venda registrada.'); 
          navigation.goBack(); 
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar.');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) return <ActivityIndicator size="large" style={styles.centered} />;

  return (
    <KeyboardAvoidingView style={styles.fullContainer} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
          
          {isSelectionMode && (
              <View style={[styles.card, styles.selectionCard]}>
                  <View style={styles.titleRow}>
                      <MaterialCommunityIcons name="sprout" size={20} color="#4CAF50" />
                      <Text style={styles.cardTitle}>O que você está vendendo?</Text>
                  </View>
                  <View style={styles.pickerContainer}>
                    <Picker
                        selectedValue={selectedPlantioId}
                        onValueChange={(itemValue) => setSelectedPlantioId(itemValue)}
                    >
                        {plantiosDisponiveis.map(p => (
                            <Picker.Item 
                                key={p.id} 
                                label={`${p.cultura} (${estufasMap[p.estufaId] || '?'})`} 
                                value={p.id} 
                            />
                        ))}
                    </Picker>
                  </View>
              </View>
          )}

          <View style={styles.card}>
              <View style={styles.titleRow}>
                  <MaterialCommunityIcons name="account-cash" size={20} color="#333" />
                  <Text style={styles.cardTitle}>Para quem?</Text>
              </View>
              
              <Text style={styles.label}>Selecione o Cliente</Text>
              <View style={styles.pickerContainer}>
                <Picker
                    selectedValue={selectedClienteId}
                    onValueChange={(itemValue) => setSelectedClienteId(itemValue)}
                >
                    <Picker.Item label="Venda Avulsa / Sem Cadastro" value={null} />
                    {clientesList.map(c => (
                        <Picker.Item key={c.id} label={c.nome} value={c.id} />
                    ))}
                </Picker>
              </View>
              
              {!selectedClienteId && (
                  <>
                    <Text style={styles.label}>Destino (Texto Livre)</Text>
                    <TextInput
                        style={styles.input}
                        value={destino}
                        onChangeText={setDestino}
                        placeholder="Ex: Consumidor final"
                    />
                  </>
              )}
          </View>

          <View style={styles.card}>
              <View style={styles.titleRow}>
                  <MaterialCommunityIcons name="scale" size={20} color="#333" /> 
                  <Text style={styles.cardTitle}>Detalhes da Venda</Text>
              </View>

              <Text style={styles.label}>Unidade de Venda</Text>
              <View style={styles.selectorContainer}>
                {(['kg', 'caixa', 'unidade', 'maço'] as UnidadeColheita[]).map(u => (
                  <TouchableOpacity
                    key={u}
                    style={[styles.selectorButton, unidade === u && styles.selectorButtonSelected]}
                    onPress={() => {
                        setUnidade(u);
                        if (u !== 'caixa') setPesoCaixa('');
                    }}
                  >
                    <Text style={[styles.selectorButtonText, unidade === u && styles.selectorButtonTextSelected]}>
                      {u.charAt(0).toUpperCase() + u.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.row}>
                <View style={styles.col}>
                    <Text style={styles.label}>Qtd. ({unidade})</Text>
                    <TextInput
                        style={styles.input}
                        value={quantidade}
                        onChangeText={setQuantidade}
                        keyboardType="numeric"
                        placeholder="Ex: 5"
                    />
                </View>
                <View style={styles.col}>
                    <Text style={styles.label}>Preço Unit. (R$)</Text>
                    <TextInput
                        style={styles.input}
                        value={preco}
                        onChangeText={setPreco}
                        keyboardType="numeric"
                        placeholder="Ex: 40.00"
                    />
                </View>
              </View>
              
              {unidade === 'caixa' && (
                <View>
                    <Text style={styles.label}>Peso Médio da Caixa (kg)</Text>
                    <TextInput
                        style={styles.input}
                        value={pesoCaixa}
                        onChangeText={setPesoCaixa}
                        keyboardType="numeric"
                        placeholder="Para baixar estoque em KG"
                    />
                </View>
              )}

              {/* SELEÇÃO DE MÉTODO DE PAGAMENTO - NOVO */}
              <Text style={styles.label}>Método de Pagamento</Text>
              <View style={styles.pickerContainer}>
                <Picker
                    selectedValue={metodoPagamento}
                    onValueChange={(itemValue) => setMetodoPagamento(itemValue)}
                >
                    <Picker.Item label="Pix" value="pix" />
                    <Picker.Item label="Dinheiro" value="dinheiro" />
                    <Picker.Item label="A Prazo / Fiado" value="prazo" />
                    <Picker.Item label="Boleto" value="boleto" />
                    <Picker.Item label="Cartão" value="cartao" />
                    <Picker.Item label="Outro" value="outro" />
                </Picker>
              </View>

              <View style={styles.totalBox}>
                  <Text style={styles.totalLabel}>Total a Receber: R$ {valorTotal.toFixed(2)}</Text>
              </View>
          </View>

          <View style={styles.actionButtonsContainer}>
              <TouchableOpacity 
                  style={[styles.saveButton, styles.saveExitButton]} 
                  onPress={() => handleSave(false)} 
                  disabled={loading}
              >
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Salvar e Sair</Text>}
              </TouchableOpacity>

              <TouchableOpacity 
                  style={[styles.saveButton, styles.saveNextButton]} 
                  onPress={() => handleSave(true)} 
                  disabled={loading}
              >
                  <Text style={styles.saveButtonText}>Salvar e +1</Text>
              </TouchableOpacity>
          </View>
          
        </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  fullContainer: { flex: 1, backgroundColor: '#FAFAFA' },
  scrollContainer: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 60 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  card: {
    backgroundColor: '#fff', padding: 20, borderRadius: 12, marginBottom: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, 
    borderWidth: 1, borderColor: '#eee',
  },
  selectionCard: { borderLeftWidth: 5, borderLeftColor: '#4CAF50' },
  
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 8, color: '#333' },
  
  label: { fontSize: 14, marginBottom: 4, fontWeight: 'bold', color: '#555' },
  input: {
    borderWidth: 1, borderColor: '#ccc', padding: 12, borderRadius: 8, 
    marginBottom: 16, backgroundColor: '#fff', fontSize: 18,
  },
  pickerContainer: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  col: { width: '48%' },
  selectorContainer: { flexDirection: 'row', marginBottom: 15, justifyContent: 'space-between' },
  selectorButton: {
    flex: 1, paddingVertical: 10, borderWidth: 1, borderColor: '#4CAF50',
    borderRadius: 8, alignItems: 'center', marginHorizontal: 2,
  },
  selectorButtonSelected: { backgroundColor: '#4CAF50' },
  selectorButtonText: { color: '#4CAF50', fontWeight: 'bold', fontSize: 12 },
  selectorButtonTextSelected: { color: '#fff' },
  totalBox: { alignItems: 'flex-end', marginTop: 5, padding: 10, backgroundColor: '#E8F5E9', borderRadius: 8 },
  totalLabel: { fontSize: 18, fontWeight: 'bold', color: '#006400' },
  actionButtonsContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  saveButton: { flex: 1, padding: 15, borderRadius: 8, alignItems: 'center', justifyContent: 'center', minHeight: 50 },
  saveExitButton: { backgroundColor: '#757575', marginRight: 10 },
  saveNextButton: { backgroundColor: '#4CAF50' },
  saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});

export default ColheitaFormScreen;