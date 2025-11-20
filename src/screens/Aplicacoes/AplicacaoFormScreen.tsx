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

const AplicacaoFormScreen = ({ route, navigation }: any) => {
  const { user } = useAuth();
  const { plantioId, estufaId, clonarAplicacao } = route.params;

  const [loading, setLoading] = useState(false);
  const [loadingInsumos, setLoadingInsumos] = useState(true);
  const [insumosList, setInsumosList] = useState<Insumo[]>([]);
  
  // Dados Gerais
  const [volumeTanque, setVolumeTanque] = useState(''); // Volume de UM tanque
  const [numeroTanques, setNumeroTanques] = useState(''); // NOVO: Quantidade de tanques/máquinas
  const [observacoes, setObservacoes] = useState('');

  // Dados do Item Atual (para adicionar)
  const [selectedInsumoId, setSelectedInsumoId] = useState<string | undefined>(undefined);
  // REMOVIDO: qtdItem - será calculado!
  const [doseItem, setDoseItem] = useState(''); // Dose por tanque/máquina
  
  // Lista de Itens (O Carrinho)
  const [itensAdicionados, setItensAdicionados] = useState<AplicacaoItem[]>([]);

  // NOVO: Calcula o total aplicado do insumo atual com base na Dose e no Número de Tanques
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
          
          // LÓGICA DE CLONAR ATUALIZADA
          if (clonarAplicacao) {
            // 1. Preenche os dados gerais (cabeçalho)
            setObservacoes(clonarAplicacao.observacoes || '');
            if (clonarAplicacao.volumeTanque) {
              setVolumeTanque(String(clonarAplicacao.volumeTanque));
            }
            // NOVO: Clonar numeroTanques
            if (clonarAplicacao.numeroTanques) {
              setNumeroTanques(String(clonarAplicacao.numeroTanques));
            }

            // 2. Preenche a lista de itens (Carrinho)
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
    
    // Verifica se o cálculo resultou em um valor válido (depende de numeroTanques > 0)
    if (!totalAplicadoPorInsumo || totalAplicadoPorInsumo <= 0) {
        Alert.alert("Atenção", "Preencha o 'Número de Tanques' acima para calcular a Quantidade Total.");
        return;
    }

    // Verifica se já está na lista
    if (itensAdicionados.some(i => i.insumoId === insumo.id)) {
      Alert.alert("Duplicado", "Este insumo já está na lista. Remova-o da lista abaixo se quiser alterar.");
      return;
    }
    
    // O total aplicado é o valor calculado!
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
    const numTanquesNum = parseFloat(numTanquesString); // NOVO: Captura o número de tanques

    // A validação de Tanques é importante, mas permitimos null se não for inserido
    if (isNaN(numTanquesNum) || numTanquesNum <= 0) {
        Alert.alert("Atenção", "O Número de Tanques aplicados deve ser maior que zero.");
        return;
    }

    const formData: AplicacaoFormData = {
      dataAplicacao: Timestamp.now(),
      observacoes: observacoes || null,
      volumeTanque: isNaN(volNum) ? null : volNum,
      numeroTanques: numTanquesNum, // NOVO CAMPO
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

  if (loadingInsumos) return <ActivityIndicator size="large" style={{ flex: 1 }} />;

  if (insumosList.length === 0) {
      return (
        <View style={styles.containerCenter}>
          <Text style={{ textAlign: 'center' }}>Você precisa cadastrar insumos com estoque primeiro.</Text>
        </View>
      );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 50 }}>
        
        {/* CABEÇALHO DA APLICAÇÃO */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dados da Aplicação (Cabeçalho)</Text>
          <Text style={styles.label}>Descrição / Alvo</Text>
          <TextInput
            style={styles.input}
            value={observacoes}
            onChangeText={setObservacoes}
            placeholder="Ex: Preventivo Fungicida + Adubo"
          />
          
          <Text style={styles.label}>Volume de **UM** Tanque/Recipiente (L) (Opcional)</Text>
          <TextInput
            style={styles.input}
            value={volumeTanque}
            onChangeText={setVolumeTanque}
            keyboardType="numeric"
            placeholder="Ex: 200"
          />
          
          {/* NOVO CAMPO: Número de Tanques/Máquinas */}
          <Text style={styles.label}>Número de Tanques/Máquinas Aplicadas</Text>
          <TextInput
            style={styles.input}
            value={numeroTanques}
            onChangeText={setNumeroTanques}
            keyboardType="numeric"
            placeholder="Ex: 5"
          />
        </View>

        {/* ÁREA DE ADICIONAR ITEM */}
        <View style={[styles.section, styles.addItemBox]}>
          <Text style={styles.sectionTitle}>Adicionar Insumo à Mistura</Text>
          
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
            {/* NOVO: Dose por Tanque */}
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
                <Text style={styles.calculatedText}>
                    {totalAplicadoPorInsumo === null 
                        ? 'N/A' 
                        : `${totalAplicadoPorInsumo.toFixed(2)} ${getUnidadeSelecionada()}`}
                </Text>
                {totalAplicadoPorInsumo !== null && <Text style={styles.calculationDetail}>
                    ({doseItem || 0} x {numeroTanques || 0} Tanques)
                </Text>}
            </View>
          </View>

          <Button 
            title="Adicionar Item à Lista" 
            onPress={handleAddItem} 
            // Desabilita se o cálculo não foi realizado (depende de dose e numeroTanques)
            disabled={totalAplicadoPorInsumo === null || totalAplicadoPorInsumo <= 0} 
          />
        </View>

        {/* LISTA DE ITENS (O CARRINHO) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Itens na Mistura ({itensAdicionados.length})</Text>
          {itensAdicionados.length === 0 ? (
            <Text style={{ fontStyle: 'italic', color: '#666', textAlign: 'center' }}>Nenhum item adicionado ainda.</Text>
          ) : (
            itensAdicionados.map((item, index) => (
              <View key={index} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.nomeInsumo}</Text>
                  <Text>
                    Total Gasto (Estoque): {item.quantidadeAplicada.toFixed(2)} {item.unidade}
                  </Text>
                  <Text style={{fontSize: 12, color: '#666'}}>
                    Dose/Tanque: {item.dosePorTanque} | Total Tanques: {numeroTanques || 'N/A'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleRemoveItem(index)} style={styles.removeBtn}>
                  <Text style={styles.removeText}>X</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        <View style={styles.saveButtonContainer}>
          <Button title={loading ? "Salvando..." : "CONCLUIR APLICAÇÃO"} onPress={handleSaveAll} disabled={loading} color="#005500" />
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f2f2f2' },
  containerCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  section: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 15, elevation: 2 },
  addItemBox: { borderColor: '#007bff', borderWidth: 1 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  label: { fontSize: 14, marginBottom: 4, fontWeight: 'bold', color: '#555' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, borderRadius: 5, marginBottom: 10, backgroundColor: '#fff' },
  pickerContainer: { borderWidth: 1, borderColor: '#ccc', borderRadius: 5, marginBottom: 10, backgroundColor: '#fff' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  col: { width: '48%' },
  
  // NOVO: Estilos para o texto calculado
  calculatedText: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#007bff', 
    marginTop: 5, 
    marginBottom: 5
  },
  calculationDetail: {
    fontSize: 12,
    color: '#666'
  },
  
  // Lista de Itens
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  itemName: { fontWeight: 'bold', fontSize: 16 },
  removeBtn: { padding: 10, backgroundColor: '#ffebee', borderRadius: 5 },
  removeText: { color: 'red', fontWeight: 'bold' },
  
  saveButtonContainer: { marginTop: 10, marginBottom: 30 }
});

export default AplicacaoFormScreen;