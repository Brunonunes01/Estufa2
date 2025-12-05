// src/screens/Vendas/VendasListScreen.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  ActivityIndicator, 
  TouchableOpacity,
  Alert 
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { listAllColheitas, deleteColheita } from '../../services/colheitaService';
import { Colheita } from '../../types/domain';
import { useIsFocused } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Card from '../../components/Card';

const VendasListScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const [vendas, setVendas] = useState<Colheita[]>([]);
  const [loading, setLoading] = useState(true);
  const isFocused = useIsFocused();

  const carregarVendas = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const lista = await listAllColheitas(user.uid);
      setVendas(lista);
    } catch (error) {
      Alert.alert("Erro", "Não foi possível carregar o histórico de vendas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) carregarVendas();
  }, [isFocused, user]);

  // Função para deletar com confirmação
  const handleDelete = (item: Colheita) => {
    Alert.alert(
        "Excluir Registro",
        "Tem certeza que deseja excluir esta venda/colheita? Isso afetará os cálculos de rentabilidade.",
        [
            { text: "Cancelar", style: "cancel" },
            { 
                text: "Excluir", 
                style: "destructive",
                onPress: async () => {
                    try {
                        await deleteColheita(item.id);
                        await carregarVendas(); // Recarrega a lista
                    } catch (e) {
                        Alert.alert("Erro", "Falha ao excluir.");
                    }
                }
            }
        ]
    );
  };

  // Cálculos de Totais
  const resumoFinanceiro = useMemo(() => {
    let receitaTotal = 0;
    let volumeTotalKg = 0; // Exemplo simplificado somando tudo que for KG

    vendas.forEach(v => {
        const valor = (v.quantidade || 0) * (v.precoUnitario || 0);
        receitaTotal += valor;
        
        // Apenas para ter uma noção de volume (se for a mesma unidade)
        if (v.unidade?.toLowerCase() === 'kg') {
            volumeTotalKg += v.quantidade;
        }
    });

    return { receitaTotal, volumeTotalKg };
  }, [vendas]);

  if (loading) return <ActivityIndicator size="large" style={styles.centered} />;

  return (
    <View style={styles.container}>
      
      {/* CARD DE RESUMO FINANCEIRO (Topo) */}
      <Card style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
            <MaterialCommunityIcons name="cash-multiple" size={24} color="#fff" />
            <Text style={styles.summaryTitle}>Receita Total (Geral)</Text>
        </View>
        <Text style={styles.summaryValue}>
            R$ {resumoFinanceiro.receitaTotal.toFixed(2)}
        </Text>
        <Text style={styles.summarySubtitle}>
            Baseado em {vendas.length} registros de colheita
        </Text>
      </Card>

      <Text style={styles.listTitle}>Histórico de Vendas</Text>

      <FlatList
        data={vendas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 80 }}
        ListEmptyComponent={
            <Text style={styles.emptyText}>Nenhuma venda registrada ainda.</Text>
        }
        renderItem={({ item }) => {
            const totalItem = (item.quantidade * (item.precoUnitario || 0));
            return (
                <View style={styles.saleItem}>
                    {/* Lado Esquerdo: Data e Info */}
                    <View style={{ flex: 1 }}>
                        <Text style={styles.dateText}>
                            {item.dataColheita.toDate().toLocaleDateString('pt-BR')}
                        </Text>
                        <Text style={styles.productText}>
                            {item.quantidade} {item.unidade}
                            {item.destino ? ` para ${item.destino}` : ''}
                        </Text>
                    </View>

                    {/* Lado Direito: Valor e Delete */}
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.priceText}>
                            R$ {totalItem.toFixed(2)}
                        </Text>
                        <Text style={styles.unitPriceText}>
                            ({item.precoUnitario ? `R$ ${item.precoUnitario}/${item.unidade}` : 'S/ Preço'})
                        </Text>
                        
                        <TouchableOpacity 
                            onPress={() => handleDelete(item)}
                            style={styles.deleteLink}
                        >
                            <Text style={styles.deleteLinkText}>Excluir</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA', padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Resumo
  summaryCard: {
    backgroundColor: '#4CAF50', // Verde forte
    alignItems: 'center',
    paddingVertical: 25,
    borderWidth: 0, // Remove borda padrão do componente Card
  },
  summaryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 5,
  },
  summaryTitle: {
      color: '#fff',
      fontSize: 18,
      fontWeight: 'bold',
      marginLeft: 10,
  },
  summaryValue: {
      color: '#fff',
      fontSize: 36,
      fontWeight: 'bold',
      marginVertical: 5,
  },
  summarySubtitle: {
      color: '#E8F5E9',
      fontSize: 12,
  },

  listTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#333',
      marginTop: 10,
      marginBottom: 10,
  },

  // Item da Lista
  saleItem: {
      backgroundColor: '#fff',
      padding: 15,
      borderRadius: 10,
      marginBottom: 10,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderLeftWidth: 4,
      borderLeftColor: '#4CAF50',
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
  },
  dateText: {
      fontSize: 12,
      color: '#888',
      fontWeight: 'bold',
      marginBottom: 2,
  },
  productText: {
      fontSize: 16,
      color: '#333',
      fontWeight: '500',
  },
  priceText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#006400',
  },
  unitPriceText: {
      fontSize: 10,
      color: '#888',
  },
  deleteLink: {
      marginTop: 8,
      padding: 4,
  },
  deleteLinkText: {
      color: '#D32F2F',
      fontSize: 12,
      fontWeight: 'bold',
  },
  emptyText: {
      textAlign: 'center',
      marginTop: 30,
      color: '#888',
      fontSize: 16,
  }
});

export default VendasListScreen;