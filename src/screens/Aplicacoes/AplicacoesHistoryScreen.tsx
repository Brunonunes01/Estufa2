// src/screens/Aplicacoes/AplicacoesHistoryScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  Alert, 
  TouchableOpacity,
  ScrollView,
  Button
} from 'react-native';
import { useAuth } from '../../hooks/useAuth'; 
import { Aplicacao } from '../../types/domain'; 
import { listAplicacoesByPlantio } from '../../services/aplicacaoService'; 
import { useIsFocused } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons'; // Ícones

const AplicacoesHistoryScreen = ({ route, navigation }: any) => {
  const { user } = useAuth();
  const { plantioId, estufaId } = route.params; 
  
  const [aplicacoes, setAplicacoes] = useState<Aplicacao[]>([]);
  const [loading, setLoading] = useState(true);
  const isFocused = useIsFocused();

  const carregarDados = async () => {
    if (!user || !plantioId) return;
    setLoading(true);
    try {
      // Nota: listInsumos removido pois os nomes dos insumos já estão salvos no AplicacaoItem
      const listaAplicacoes = await listAplicacoesByPlantio(user.uid, plantioId);
      setAplicacoes(listaAplicacoes);

    } catch (error) {
      Alert.alert("Erro", "Não foi possível carregar o histórico de aplicações.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    navigation.setOptions({ title: 'Histórico de Aplicações' });
    if (isFocused) carregarDados();
  }, [plantioId, user, isFocused, navigation]); 

  const handleClonarAplicacao = (aplicacao: Aplicacao) => {
    navigation.navigate('AplicacaoForm', { 
      plantioId: plantioId,
      estufaId: estufaId,
      clonarAplicacao: aplicacao 
    });
  };

  if (loading) return <ActivityIndicator size="large" style={styles.centered} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      
      {/* Botão de Ação Principal no topo */}
      <View style={styles.topButtonContainer}>
          <TouchableOpacity 
            style={styles.newApplicationButton}
            onPress={() => navigation.navigate('AplicacaoForm', { plantioId: plantioId, estufaId: estufaId })}
          >
              <MaterialCommunityIcons name="plus-circle-outline" size={20} color="#fff" />
              <Text style={styles.newApplicationButtonText}>Nova Aplicação</Text>
          </TouchableOpacity>
      </View>

      <Text style={styles.sectionHeader}>Aplicações Registradas ({aplicacoes.length})</Text>

      {aplicacoes.length === 0 ? (
        <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nenhuma aplicação encontrada para este plantio.</Text>
        </View>
      ) : (
        aplicacoes.map((item) => (
          <View key={item.id} style={styles.itemCard}>
            
            <View style={styles.itemHeader}>
                <View style={styles.dateInfo}>
                    <MaterialCommunityIcons name="calendar-range" size={18} color="#555" />
                    <Text style={styles.itemDate}>
                        {item.dataAplicacao.toDate().toLocaleDateString('pt-BR')}
                    </Text>
                </View>
                
                <TouchableOpacity 
                  onPress={() => handleClonarAplicacao(item)}
                  style={styles.cloneButton}
                >
                    <MaterialCommunityIcons name="content-copy" size={16} color="#007bff" />
                    <Text style={styles.cloneText}>CLONAR</Text>
                </TouchableOpacity>
            </View>
            
            <Text style={styles.itemTitle}>{item.observacoes || "Aplicação Padrão"}</Text>
            
            <View style={styles.itemsListContainer}>
                <Text style={styles.itemsListTitle}>Insumos Utilizados:</Text>
                
                {/* Lista os itens da aplicação */}
                {item.itens && item.itens.map((subItem, idx) => (
                <View key={idx} style={styles.subItemRow}>
                    <Text style={styles.subItemName}>{subItem.nomeInsumo}</Text>
                    <Text style={styles.subItemValue}>
                        {subItem.quantidadeAplicada.toFixed(2)} {subItem.unidade}
                    </Text>
                </View>
                ))}
            </View>

            {/* Detalhe do Volume (CORRIGIDO AQUI) */}
            {(item.volumeTanque !== null && item.numeroTanques !== null && item.numeroTanques > 0) && (
                <Text style={styles.caldaDetail}>
                    <MaterialCommunityIcons name="flask-outline" size={14} color="#856404" />
                    Total Calda: {(item.volumeTanque * item.numeroTanques).toFixed(0)}L (em {item.numeroTanques} Tanques)
                </Text>
            )}

          </View>
        ))
      )}
    </ScrollView>
  );
};

// ESTILOS PARA DESIGN PROFISSIONAL
const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, backgroundColor: '#FAFAFA' },
  scrollContent: { paddingBottom: 50 }, 
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionHeader: { fontSize: 18, fontWeight: 'bold', marginTop: 20, marginBottom: 10, color: '#333', textAlign: 'center' },
  
  // Botão Nova Aplicação
  topButtonContainer: {
    marginBottom: 20,
    marginTop: 10,
  },
  newApplicationButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  newApplicationButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 10,
  },

  // Estilos de Card (Aplicação)
  itemCard: { 
    backgroundColor: '#fff', 
    padding: 15, 
    marginVertical: 8, 
    borderRadius: 12, 
    borderLeftWidth: 5,
    borderLeftColor: '#FF9800', // Destaque Laranja
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemDate: { color: '#555', fontSize: 14, fontWeight: 'bold', marginLeft: 5 },
  itemTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  caldaDetail: { 
    fontSize: 14, 
    color: '#856404', 
    marginTop: 10, 
    fontStyle: 'italic',
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: '#f9f9f9',
  },
  
  // Detalhes dos Insumos
  itemsListContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 10,
  },
  itemsListTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 5,
  },
  subItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  subItemName: { 
    fontSize: 14, 
    color: '#555', 
    flex: 2,
  },
  subItemValue: { 
    fontSize: 14, 
    fontWeight: 'bold', 
    color: '#006400', // Verde para o valor gasto
  },

  // Botão Clonar
  cloneButton: { 
    backgroundColor: '#E3F2FD', 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 15, 
    flexDirection: 'row',
    alignItems: 'center',
  },
  cloneText: { 
    color: '#007bff', 
    fontWeight: 'bold', 
    fontSize: 12, 
    marginLeft: 4,
  },
  
  emptyContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
  }
});

export default AplicacoesHistoryScreen;