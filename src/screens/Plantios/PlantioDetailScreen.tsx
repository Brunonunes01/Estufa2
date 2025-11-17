// src/screens/Plantios/PlantioDetailScreen.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Button, StyleSheet, ActivityIndicator, FlatList, Alert } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { Plantio, Colheita, Fornecedor, Insumo, Aplicacao } from '../../types/domain';
import { getPlantioById, updatePlantioStatus } from '../../services/plantioService';
import { listColheitasByPlantio } from '../../services/colheitaService';
import { listFornecedores } from '../../services/fornecedorService';
import { listInsumos } from '../../services/insumoService'; // Importar
import { listAplicacoesByPlantio } from '../../services/aplicacaoService'; // Importar
import { useIsFocused } from '@react-navigation/native';

const PlantioDetailScreen = ({ route, navigation }: any) => {
  const { user } = useAuth();
  const { plantioId } = route.params;
  
  const [plantio, setPlantio] = useState<Plantio | null>(null);
  const [colheitas, setColheitas] = useState<Colheita[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]); // <-- NOVO ESTADO
  const [aplicacoes, setAplicacoes] = useState<Aplicacao[]>([]); // <-- NOVO ESTADO
  
  const [loading, setLoading] = useState(true);
  const isFocused = useIsFocused();

  const carregarDados = async () => {
    if (!user || !plantioId) return;
    setLoading(true);
    try {
      // Carrega em paralelo
      const [
        dadosPlantio, 
        listaColheitas, 
        listaFornecedores, 
        listaInsumos,
        listaAplicacoes
      ] = await Promise.all([
        getPlantioById(plantioId),
        listColheitasByPlantio(user.uid, plantioId),
        listFornecedores(user.uid),
        listInsumos(user.uid), // Precisamos dos nomes dos insumos
        listAplicacoesByPlantio(user.uid, plantioId) // Precisamos das aplicações
      ]);

      setPlantio(dadosPlantio);
      setColheitas(listaColheitas);
      setFornecedores(listaFornecedores);
      setInsumos(listaInsumos);
      setAplicacoes(listaAplicacoes);
      
      if (dadosPlantio) {
        navigation.setOptions({ title: dadosPlantio.cultura });
      }
    } catch (error) {
      Alert.alert("Erro", "Não foi possível carregar os dados.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      carregarDados();
    }
  }, [plantioId, user, isFocused]); 

  const handleFinalizarPlantio = () => {
    if (!plantio) return;
    Alert.alert(
      "Finalizar Plantio?",
      "Deseja marcar este plantio como 'finalizado'? Esta ação não pode ser desfeita.",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Finalizar", 
          onPress: async () => {
            try {
              setLoading(true);
              await updatePlantioStatus(plantio.id, "finalizado");
              await carregarDados(); 
            } catch (error) {
              Alert.alert("Erro", "Não foi possível finalizar o plantio.");
              setLoading(false);
            }
          },
          style: "destructive"
        }
      ]
    );
  };

  // Cálculos (sem mudança)
  const totalColhido = useMemo(() => {
    const totais = colheitas.reduce((acc, colheita) => {
      const { unidade, quantidade } = colheita;
      if (!acc[unidade]) { acc[unidade] = 0; }
      acc[unidade] += quantidade;
      return acc;
    }, {} as { [key: string]: number });
    return Object.keys(totais).map(unidade => `${totais[unidade]} ${unidade}`).join(' / ');
  }, [colheitas]);

  const custoEstimadoPlantio = useMemo(() => {
    if (!plantio || !plantio.precoEstimadoUnidade) { return 0; }
    return plantio.quantidadePlantada * plantio.precoEstimadoUnidade;
  }, [plantio]);

  const nomeFornecedor = useMemo(() => {
    if (!plantio || !plantio.fornecedorId) { return null; }
    const fornecedor = fornecedores.find(f => f.id === plantio.fornecedorId);
    return fornecedor ? fornecedor.nome : 'N/A';
  }, [plantio, fornecedores]);

  // Função para pegar o nome do insumo
  const getNomeInsumo = (insumoId: string) => {
    const insumo = insumos.find(i => i.id === insumoId);
    return insumo ? insumo.nome : 'Insumo não encontrado';
  };

  if (loading) {
    return <ActivityIndicator size="large" style={styles.centered} />;
  }

  if (!plantio) {
    return <View style={styles.centered}><Text>Plantio não encontrado.</Text></View>;
  }

  const statusCor = plantio.status === 'finalizado' ? styles.statusFinalizado : styles.statusAtivo;

  return (
    <View style={styles.container}>
      {/* Seção 1: Detalhes do Plantio */}
      <View style={styles.detailBox}>
        <Text style={styles.title}>{plantio.cultura} {plantio.variedade ? `(${plantio.variedade})` : ''}</Text>
        <Text>Status: <Text style={statusCor}>{plantio.status}</Text></Text>
        <Text>Data do Plantio: {plantio.dataPlantio.toDate().toLocaleDateString()}</Text>
        {nomeFornecedor && ( <Text>Fornecedor: {nomeFornecedor}</Text> )}
        {plantio.previsaoColheita && ( <Text>Previsão Colheita: {plantio.previsaoColheita.toDate().toLocaleDateString()}</Text> )}
        {custoEstimadoPlantio > 0 && ( <Text style={styles.costText}>Custo Estimado: R$ {custoEstimadoPlantio.toFixed(2)}</Text> )}
        <Text style={styles.totalColhido}>Total Colhido: {totalColhido || 'Nenhuma colheita'}</Text>
      </View>

      {/* Seção 2: Ações */}
      {plantio.status !== 'finalizado' && (
        <>
          <View style={styles.buttonWrapper}>
            <Button 
              title="Adicionar Colheita"
              onPress={() => navigation.navigate('ColheitaForm', { 
                plantioId: plantio.id,
                estufaId: plantio.estufaId 
              })}
            />
          </View>

          {/* ****** BOTÃO NOVO ADICIONADO ****** */}
          <View style={styles.buttonWrapper}>
            <Button 
              title="Adicionar Aplicação de Insumo"
              onPress={() => navigation.navigate('AplicacaoForm', { 
                plantioId: plantio.id,
                estufaId: plantio.estufaId 
              })}
              color="#ff8c00" // Laranja
            />
          </View>

          <View style={styles.buttonWrapper}>
            <Button 
              title="Finalizar Plantio"
              onPress={handleFinalizarPlantio}
              color="#d9534f" 
            />
          </View>
        </>
      )}

      {/* Seção 3: Lista de Colheitas */}
      <Text style={styles.title}>Histórico de Colheitas</Text>
      <FlatList
        data={colheitas}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => { /* ... (código da colheita sem mudança) ... */
          const valorTotalItem = (item.quantidade || 0) * (item.precoUnitario || 0);
          return (
            <View style={styles.colheitaItem}>
              <Text style={styles.itemTitle}>{item.dataColheita.toDate().toLocaleDateString()}</Text>
              <Text>Qtd: {item.quantidade} {item.unidade}</Text>
              {item.precoUnitario && <Text>Preço: R$ {item.precoUnitario.toFixed(2)} / {item.unidade}</Text>}
              {valorTotalItem > 0 && (<Text style={styles.totalItemText}>Total: R$ {valorTotalItem.toFixed(2)}</Text>)}
              {item.destino && <Text>Destino: {item.destino}</Text>}
            </View>
          );
        }}
        ListEmptyComponent={<Text style={{ textAlign: 'center', margin: 10 }}>Nenhuma colheita registrada.</Text>}
      />

      {/* ****** SEÇÃO 4: LISTA DE APLICAÇÕES (NOVA) ****** */}
      <Text style={styles.title}>Histórico de Aplicações</Text>
      <FlatList
        data={aplicacoes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.itemTitle}>{item.dataAplicacao.toDate().toLocaleDateString()}</Text>
            <Text>Insumo: {getNomeInsumo(item.insumoId)}</Text>
            <Text>Qtd: {item.quantidadeAplicada} {item.unidade}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={{ textAlign: 'center', margin: 10 }}>Nenhuma aplicação registrada.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  detailBox: { backgroundColor: '#fff', padding: 16, borderRadius: 5, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: 'bold', marginTop: 10, marginBottom: 5 },
  totalColhido: { fontSize: 16, fontWeight: 'bold', marginTop: 8, color: '#005500' },
  costText: { fontSize: 16, fontWeight: 'bold', marginTop: 8, color: '#8c1515' },
  colheitaItem: { backgroundColor: '#f9f9f9', padding: 12, marginVertical: 4, borderRadius: 5, borderWidth: 1, borderColor: '#eee' },
  item: { backgroundColor: '#f9f9f9', padding: 12, marginVertical: 4, borderRadius: 5, borderWidth: 1, borderColor: '#eee' }, // Estilo genérico
  itemTitle: { fontSize: 16, fontWeight: 'bold' },
  totalItemText: { fontSize: 15, fontWeight: 'bold', color: '#005500' },
  statusAtivo: { color: '#005500', fontWeight: 'bold' },
  statusFinalizado: { color: '#888', fontWeight: 'bold' },
  buttonWrapper: { marginBottom: 10 }
});

export default PlantioDetailScreen;