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
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [aplicacoes, setAplicacoes] = useState<Aplicacao[]>([]);
  
  const [loading, setLoading] = useState(true);
  const isFocused = useIsFocused();

  const carregarDados = async () => {
    if (!user || !plantioId) return;
    setLoading(true);
    try {
      const [dadosPlantio, listaColheitas, listaFornecedores, listaInsumos, listaAplicacoes] = await Promise.all([
        getPlantioById(plantioId),
        listColheitasByPlantio(user.uid, plantioId),
        listFornecedores(user.uid),
        listInsumos(user.uid),
        listAplicacoesByPlantio(user.uid, plantioId)
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

  const handleClonarAplicacao = (aplicacao: Aplicacao) => {
    navigation.navigate('AplicacaoForm', { 
      plantioId: plantio?.id,
      estufaId: plantio?.estufaId,
      clonarAplicacao: aplicacao 
    });
  };

  const getNomeInsumo = (insumoId: string) => {
    const insumo = insumos.find(i => i.id === insumoId);
    return insumo ? insumo.nome : 'Insumo desconhecido';
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
    // TROCAMOS A VIEW PELO SCROLLVIEW
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
      
      {/* Seção Aplicações (USANDO MAP EM VEZ DE FLATLIST PARA ROLAGEM FUNCIONAR) */}
      <Text style={styles.sectionHeader}>Histórico de Aplicações</Text>
      
      {aplicacoes.length === 0 ? (
        <Text style={{ textAlign: 'center', margin: 10, color: '#666' }}>Nenhuma aplicação.</Text>
      ) : (
        aplicacoes.map((item) => (
          <View key={item.id} style={styles.item}>
            <View style={styles.itemHeader}>
                <Text style={styles.itemDate}>{item.dataAplicacao.toDate().toLocaleDateString()}</Text>
                
                {/* BOTÃO CLONAR MELHORADO */}
                {plantio.status !== 'finalizado' && (
                    <TouchableOpacity 
                      onPress={() => handleClonarAplicacao(item)}
                      style={styles.cloneButton}
                    >
                        <Text style={styles.cloneText}>CLONAR</Text>
                    </TouchableOpacity>
                )}
            </View>
            
            <Text style={styles.itemTitle}>{item.observacoes || "Aplicação"}</Text>
            
            {/* Lista os itens da aplicação */}
            {item.itens && item.itens.map((subItem, idx) => (
              <Text key={idx} style={styles.subItemText}>
                • {subItem.nomeInsumo}: {subItem.quantidadeAplicada} {subItem.unidade}
              </Text>
            ))}
            
            {item.volumeTanque && (
              <Text style={styles.defensivoDetail}>
                Tanque: {item.volumeTanque}L 
              </Text>
            )}
          </View>
        ))
      )}

      {/* Seção Colheitas (USANDO MAP) */}
      <Text style={styles.sectionHeader}>Histórico de Colheitas</Text>
      
      {colheitas.length === 0 ? (
        <Text style={{ textAlign: 'center', margin: 10, color: '#666' }}>Nenhuma colheita.</Text>
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

      {/* BOTÃO FINALIZAR (AGORA VISÍVEL NO FINAL) */}
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
  scrollContent: { paddingBottom: 50 }, // Espaço extra no final
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  detailBox: { backgroundColor: '#fff', padding: 12, borderRadius: 5, marginBottom: 15, elevation: 1 },
  
  title: { fontSize: 18, fontWeight: 'bold', marginTop: 10, marginBottom: 5 },
  sectionHeader: { fontSize: 18, fontWeight: 'bold', marginTop: 20, marginBottom: 10, color: '#333' },
  
  totalColhido: { fontSize: 14, fontWeight: 'bold', marginTop: 4, color: '#005500' },
  costText: { fontSize: 14, fontWeight: 'bold', marginTop: 4, color: '#8c1515' },
  
  actionsRow: { flexDirection: 'row', marginBottom: 10 },
  
  // Estilos de Itens (Aplicação)
  item: { backgroundColor: '#fff', padding: 12, marginVertical: 5, borderRadius: 5, borderWidth: 1, borderColor: '#ddd' },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  itemDate: { color: '#666', fontSize: 12 },
  itemTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  subItemText: { marginLeft: 10, color: '#444', fontSize: 14 },
  defensivoDetail: { fontSize: 12, color: '#856404', marginTop: 4, marginLeft: 10, fontStyle: 'italic' },
  
  // Botão Clonar
  cloneButton: { backgroundColor: '#e3f2fd', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  cloneText: { color: '#007bff', fontWeight: 'bold', fontSize: 10 },

  // Estilos de Itens (Colheita)
  colheitaItem: { backgroundColor: '#f0fdf4', padding: 12, marginVertical: 5, borderRadius: 5, borderWidth: 1, borderColor: '#dcfce7' },
  
  statusAtivo: { color: '#005500', fontWeight: 'bold' },
  statusFinalizado: { color: '#888', fontWeight: 'bold' },
});

export default PlantioDetailScreen;