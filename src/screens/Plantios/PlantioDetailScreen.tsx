// src/screens/Plantios/PlantioDetailScreen.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  Alert, 
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { Plantio, Colheita, Fornecedor } from '../../types/domain';
import { getPlantioById, updatePlantioStatus } from '../../services/plantioService';
import { listColheitasByPlantio } from '../../services/colheitaService';
import { listFornecedores } from '../../services/fornecedorService';
import { useIsFocused } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
// REMOVIDO: import { FAB } from 'react-native-paper';

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
      "Deseja marcar como 'finalizado'? Esta ação não afeta registros de colheita/aplicação.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Finalizar", onPress: async () => {
            await updatePlantioStatus(plantio.id, "finalizado");
            await carregarDados(); 
          }, style: "destructive" }
      ]
    );
  };

  const handleViewAplicacoes = () => {
    navigation.navigate('AplicacoesHistory', { 
      plantioId: plantio?.id,
      estufaId: plantio?.estufaId,
      plantioNome: plantio?.cultura
    });
  };

  const handleAddColheita = () => navigation.navigate('ColheitaForm', { plantioId: plantio?.id, estufaId: plantio?.estufaId });
  const handleAddAplicacao = () => navigation.navigate('AplicacaoForm', { plantioId: plantio?.id, estufaId: plantio?.estufaId });

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

  const isFinalizado = plantio.status === 'finalizado';

  return (
    <View style={styles.fullContainer}>
        {/* Usamos ScrollView como container principal */}
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        
        {/* Detalhes do Plantio - Card Principal */}
        <View style={styles.card}>
            <View style={styles.detailHeader}>
            <Text style={styles.title}>{plantio.cultura} {plantio.variedade ? `(${plantio.variedade})` : ''}</Text>
            <Text style={[styles.statusBadge, isFinalizado ? styles.statusFinalizado : styles.statusAtivo]}>
                {isFinalizado ? 'FINALIZADO' : 'ATIVO'}
            </Text>
            </View>

            <View style={styles.detailRow}>
                <MaterialCommunityIcons name="calendar-month-outline" size={20} color="#333" />
                <Text style={styles.detailItemText}>Data Plantio: {plantio.dataPlantio.toDate().toLocaleDateString()}</Text>
            </View>
            
            {nomeFornecedor && (
                <View style={styles.detailRow}>
                    <MaterialCommunityIcons name="account-tie-outline" size={20} color="#333" />
                    <Text style={styles.detailItemText}>Fornecedor: {nomeFornecedor}</Text>
                </View>
            )}
            
            {custoEstimadoPlantio > 0 && (
                <View style={styles.detailRow}>
                    <MaterialCommunityIcons name="cash" size={20} color="#8c1515" />
                    <Text style={styles.detailItemText}>Custo Estimado: R$ {custoEstimadoPlantio.toFixed(2)}</Text>
                </View>
            )}
            
            <View style={styles.harvestSummary}>
                <View style={styles.detailRow}>
                    <MaterialCommunityIcons name="seed-outline" size={20} color="#006400" />
                    <Text style={styles.totalColhidoTitle}>Total Colhido:</Text>
                </View>
                <Text style={styles.totalColhidoValue}>{totalColhido || 'Nenhuma colheita'}</Text>
            </View>
        </View>

        {/* NOVO BLOCO: AÇÕES (Substituindo o FAB) */}
        {!isFinalizado && (
            <View style={styles.actionsContainer}>
                <TouchableOpacity 
                    style={[styles.actionButton, styles.harvestButton]} 
                    onPress={handleAddColheita}
                >
                    <MaterialCommunityIcons name="fruit-cherries" size={24} color="#fff" />
                    <Text style={styles.actionButtonText}>Colheita</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.actionButton, styles.applicationButton]} 
                    onPress={handleAddAplicacao}
                >
                    <MaterialCommunityIcons name="sprinkler-variant" size={24} color="#fff" />
                    <Text style={styles.actionButtonText}>Aplicação</Text>
                </TouchableOpacity>
            </View>
        )}


        {/* Seção APLICAÇÕES - Link */}
        <View style={styles.sectionCard}>
            <TouchableOpacity style={styles.sectionLink} onPress={handleViewAplicacoes}>
            <Text style={styles.sectionLinkText}>Histórico de Aplicações</Text>
            <MaterialCommunityIcons name="arrow-right-circle" size={24} color="#007bff" />
            </TouchableOpacity>
        </View>
        
        {/* Seção HISTÓRICO DE COLHEITAS */}
        <View style={styles.sectionCard}>
            <Text style={styles.sectionHeader}>Histórico de Colheitas ({colheitas.length})</Text>
            
            {colheitas.length === 0 ? (
            <Text style={styles.emptyText}>Nenhuma colheita registrada.</Text>
            ) : (
            colheitas.map((item) => (
                <View key={item.id} style={styles.harvestItem}>
                <View style={styles.harvestItemRow}>
                    <Text style={styles.itemTitle}>{item.dataColheita.toDate().toLocaleDateString()}</Text>
                    <Text style={styles.itemQuantity}>{item.quantidade} {item.unidade}</Text>
                </View>
                {item.precoUnitario && (
                    <Text style={styles.itemTotal}>
                    Lucro Estimado: R$ {((item.quantidade || 0) * (item.precoUnitario || 0)).toFixed(2)}
                    </Text>
                )}
                </View>
            ))
            )}
        </View>

        {/* Botão Finalizar (só aparece se não estiver finalizado) */}
        {!isFinalizado && (
            <TouchableOpacity 
                style={styles.finalizeButton}
                onPress={handleFinalizarPlantio}
            >
                <Text style={styles.finalizeButtonText}>FINALIZAR PLANTIO</Text>
            </TouchableOpacity>
        )}

        </ScrollView>
    </View>
  );
};

// DEFINIÇÃO BASE DO CARD (para reuso - CORREÇÃO DO ERRO)
const BaseCardStyle = {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3, 
};

const styles = StyleSheet.create({
  fullContainer: { flex: 1, backgroundColor: '#FAFAFA' }, 
  container: { flex: 1, padding: 16 },
  scrollContent: { paddingBottom: 40 }, // Ajustado para ter menos espaço no fim
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // CARD PRINCIPAL - USANDO SPREAD
  card: {
    ...BaseCardStyle, 
    marginBottom: 20,
    paddingVertical: 15, 
  },
  
  // Detalhes
  detailHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  
  // Linha de Detalhe com Ícone
  detailRow: { 
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  detailItemText: { 
      fontSize: 16, 
      color: '#555', 
      marginLeft: 8 
  },

  // Status Badge
  statusBadge: { 
    fontSize: 12, 
    fontWeight: 'bold', 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 10, 
    overflow: 'hidden'
  },
  statusAtivo: { color: '#fff', backgroundColor: '#4CAF50' }, 
  statusFinalizado: { color: '#555', backgroundColor: '#E0E0E0' },
  
  // Sumário de Colheita
  harvestSummary: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalColhidoTitle: { fontSize: 16, fontWeight: 'bold', color: '#006400', marginLeft: 8 },
  totalColhidoValue: { fontSize: 18, fontWeight: 'bold', color: '#006400' },
  
  // BLOC O DE AÇÕES (Novo)
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    marginHorizontal: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3, 
  },
  harvestButton: {
    backgroundColor: '#4CAF50', // Verde
  },
  applicationButton: {
    backgroundColor: '#FF9800', // Laranja
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 10,
  },

  // Seção de Aplicações/Histórico (Link) - USANDO SPREAD
  sectionCard: {
    ...BaseCardStyle, 
    padding: 0, 
    marginBottom: 15,
  },
  sectionLink: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#E3F2FD', 
    borderRadius: 12,
  },
  sectionLinkText: {
    color: '#007bff',
    fontWeight: 'bold',
    fontSize: 16,
  },

  // Histórico de Colheitas
  sectionHeader: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 10, paddingHorizontal: 15, paddingTop: 15 },
  emptyText: { textAlign: 'center', margin: 10, color: '#666', paddingBottom: 10 },
  harvestItem: { 
    backgroundColor: '#fff', 
    padding: 15, 
    marginHorizontal: 10,
    marginVertical: 5, 
    borderRadius: 8, 
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800', 
    elevation: 1 
  },
  harvestItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  itemQuantity: { fontSize: 16, fontWeight: 'bold', color: '#006400' },
  itemTotal: { fontSize: 14, color: 'green', marginTop: 5 },
  
  // Botão Finalizar
  finalizeButton: {
    backgroundColor: '#D32F2F', 
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  finalizeButtonText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 16,
  },
});

export default PlantioDetailScreen;