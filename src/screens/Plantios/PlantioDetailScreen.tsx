// src/screens/Plantios/PlantioDetailScreen.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  Button, 
  StyleSheet, 
  ActivityIndicator, 
  Alert, 
  TouchableOpacity,
  ScrollView // Importar ScrollView
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { Plantio, Colheita, Fornecedor, Insumo, Aplicacao } from '../../types/domain';
import { getPlantioById, updatePlantioStatus } from '../../services/plantioService';
import { listColheitasByPlantio } from '../../services/colheitaService';
import { listFornecedores } from '../../services/fornecedorService';
import { listInsumos } from '../../services/insumoService';
import { listAplicacoesByPlantio } from '../../services/aplicacaoService';
import { useIsFocused } from '@react-navigation/native';

const PlantioDetailScreen = ({ route, navigation }: any) => {
  const { user } = useAuth();
  const { plantioId } = route.params;
  
  const [plantio, setPlantio] = useState<Plantio | null>(null);
  const [colheitas, setColheitas] = useState<Colheita[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  
  const [loading, setLoading] = useState(true);
  const isFocused = useIsFocused();

  const carregarDados = async () => {
    if (!user || !plantioId) return;
    setLoading(true);
    try {
      // Simplificamos o carregamento de dados para o que é essencial para esta tela
      const [dadosPlantio, listaColheitas, listaFornecedores] = await Promise.all([
        getPlantioById(plantioId),
        listColheitasByPlantio(user.uid, plantioId),
        listFornecedores(user.uid)
      ]);

      setPlantio(dadosPlantio);
      setColheitas(listaColheitas);
      setFornecedores(listaFornecedores);
      
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
    if (isFocused) carregarDados();
  }, [plantioId, user, isFocused]); 

  const handleFinalizarPlantio = () => {
    if (!plantio) return;
    Alert.alert(
      "Finalizar Plantio?",
      "Deseja marcar como 'finalizado'? Ação irreversível.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Finalizar", onPress: async () => {
            await updatePlantioStatus(plantio.id, "finalizado");
            await carregarDados(); 
          }, style: "destructive" }
      ]
    );
  };

  // Função para navegar para o novo histórico
  const handleViewAplicacoes = () => {
    navigation.navigate('AplicacoesHistory', { 
      plantioId: plantio?.id,
      estufaId: plantio?.estufaId,
      plantioNome: plantio?.cultura
    });
  };

  // Cálculos
  const totalColhido = useMemo(() => {
    const totais = colheitas.reduce((acc, colheita) => {
      const { unidade, quantidade } = colheita;
      if (!acc[unidade]) acc[unidade] = 0;
      acc[unidade] += quantidade;
      return acc;
    }, {} as { [key: string]: number });
    return Object.keys(totais).map(u => `${totais[u]} ${u}`).join(' / ');
  }, [colheitas]);

  const custoEstimadoPlantio = useMemo(() => {
    if (!plantio || !plantio.precoEstimadoUnidade) return 0;
    // CORRIGIDO AQUI: precoEstimadaUnidade -> precoEstimadoUnidade
    return plantio.quantidadePlantada * plantio.precoEstimadoUnidade;
  }, [plantio]);

  const nomeFornecedor = useMemo(() => {
    if (!plantio || !plantio.fornecedorId) return null;
    const f = fornecedores.find(i => i.id === plantio.fornecedorId);
    return f ? f.nome : 'N/A';
  }, [plantio, fornecedores]);

  if (loading) return <ActivityIndicator size="large" style={styles.centered} />;
  if (!plantio) return <View style={styles.centered}><Text>Plantio não encontrado.</Text></View>;

  const statusCor = plantio.status === 'finalizado' ? styles.statusFinalizado : styles.statusAtivo;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      
      {/* Detalhes do Plantio */}
      <View style={styles.detailBox}>
        <Text style={styles.title}>{plantio.cultura} {plantio.variedade ? `(${plantio.variedade})` : ''}</Text>
        <Text>Status: <Text style={statusCor}>{plantio.status}</Text></Text>
        <Text>Data: {plantio.dataPlantio.toDate().toLocaleDateString()}</Text>
        {nomeFornecedor && <Text>Fornecedor: {nomeFornecedor}</Text>}
        {custoEstimadoPlantio > 0 && <Text style={styles.costText}>Custo Est.: R$ {custoEstimadoPlantio.toFixed(2)}</Text>}
        <Text style={styles.totalColhido}>Total Colhido: {totalColhido || 'Nenhuma colheita'}</Text>
      </View>

      {/* Ações */}
      {plantio.status !== 'finalizado' && (
        <View style={styles.actionsRow}>
          <View style={{flex: 1, marginRight: 5}}>
            <Button title="Add Colheita" onPress={() => navigation.navigate('ColheitaForm', { plantioId: plantio.id, estufaId: plantio.estufaId })} />
          </View>
          <View style={{flex: 1, marginLeft: 5}}>
            <Button title="Add Aplicação" color="#ff8c00" onPress={() => navigation.navigate('AplicacaoForm', { plantioId: plantio.id, estufaId: plantio.estufaId })} />
          </View>
        </View>
      )}
      
      {/* NOVO BLOCO: Link para o Histórico de Aplicações */}
      <View style={[styles.sectionContainer, { padding: 0 }]}>
        <TouchableOpacity 
          style={styles.historyLink} 
          onPress={handleViewAplicacoes}
        >
          <Text style={styles.historyLinkText}>Ver Histórico de Aplicações</Text>
        </TouchableOpacity>
      </View>
      
      {/* SEÇÃO COLHEITAS (MANTIDA) */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionHeader}>Histórico de Colheitas</Text>
        
        {colheitas.length === 0 ? (
          <Text style={{ textAlign: 'center', margin: 10, color: '#666' }}>Nenhuma colheita registrada.</Text>
        ) : (
          colheitas.map((item) => (
            <View key={item.id} style={styles.colheitaItem}>
              <Text style={styles.itemTitle}>{item.dataColheita.toDate().toLocaleDateString()}</Text>
              <Text>Qtd: {item.quantidade} {item.unidade}</Text>
              {item.precoUnitario && (
                 <Text style={{ color: 'green' }}>
                   Total: R$ {((item.quantidade || 0) * (item.precoUnitario || 0)).toFixed(2)}
                 </Text>
              )}
            </View>
          ))
        )}
      </View>

      {/* BOTÃO FINALIZAR (MANTIDO) */}
      {plantio.status !== 'finalizado' && (
         <View style={{ marginTop: 20 }}>
           <Button title="Finalizar Plantio" onPress={handleFinalizarPlantio} color="#d9534f" />
         </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, backgroundColor: '#f2f2f2' },
  scrollContent: { paddingBottom: 50 }, 
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  detailBox: { backgroundColor: '#fff', padding: 12, borderRadius: 5, marginBottom: 15, elevation: 1 },
  
  title: { fontSize: 18, fontWeight: 'bold', marginTop: 10, marginBottom: 5 },
  
  // Estilo para o container de seção (Melhora a separação visual)
  sectionContainer: {
    backgroundColor: '#fff', 
    padding: 10,
    borderRadius: 8,
    marginBottom: 15, 
    borderWidth: 1,
    borderColor: '#eee',
    elevation: 2
  },

  sectionHeader: { fontSize: 18, fontWeight: 'bold', marginTop: 5, marginBottom: 10, color: '#333' },
  
  totalColhido: { fontSize: 14, fontWeight: 'bold', marginTop: 4, color: '#005500' },
  costText: { fontSize: 14, fontWeight: 'bold', marginTop: 4, color: '#8c1515' },
  
  actionsRow: { flexDirection: 'row', marginBottom: 10 },
  
  // Estilos para o link de histórico
  historyLink: {
    paddingVertical: 15,
    paddingHorizontal: 10,
    backgroundColor: '#e3f2fd', // Fundo azul claro
    borderRadius: 8,
    alignItems: 'center',
  },
  historyLinkText: {
    color: '#007bff',
    fontWeight: 'bold',
    fontSize: 16,
  },

  // Estilos de Itens (Colheita)
  colheitaItem: { backgroundColor: '#f0fdf4', padding: 12, marginVertical: 5, borderRadius: 5, borderWidth: 1, borderColor: '#dcfce7' },
  itemTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 }, 

  statusAtivo: { color: '#005500', fontWeight: 'bold' },
  statusFinalizado: { color: '#888', fontWeight: 'bold' },
});

export default PlantioDetailScreen;