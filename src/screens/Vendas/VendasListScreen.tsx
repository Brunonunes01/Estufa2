// src/screens/Colheitas/VendasListScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, StatusBar, Alert
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { listAllColheitas, deleteColheita } from '../../services/colheitaService';
import { Colheita } from '../../types/domain';
import { useIsFocused } from '@react-navigation/native';

const VendasListScreen = ({ navigation }: any) => {
  const { user, selectedTenantId } = useAuth();
  const [vendas, setVendas] = useState<Colheita[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalFaturamento, setTotalFaturamento] = useState(0);
  const isFocused = useIsFocused();

  // Função auxiliar para formatar Timestamp ou Date
  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-';
    // Se for Timestamp do Firestore
    if (timestamp.toDate) {
        return timestamp.toDate().toLocaleDateString('pt-BR');
    }
    // Se for objeto Seconds/Nanoseconds
    if (timestamp.seconds) {
        return new Date(timestamp.seconds * 1000).toLocaleDateString('pt-BR');
    }
    // Se já for Date string ou object
    return new Date(timestamp).toLocaleDateString('pt-BR');
  };

  const carregarDados = async () => {
    const targetId = selectedTenantId || user?.uid;
    if (!targetId) return;
    
    setLoading(true);
    try {
      const lista = await listAllColheitas(targetId);
      setVendas(lista);

      // Calcula o total somando (quantidade * preço)
      const total = lista.reduce((acc, curr) => {
        return acc + (curr.quantidade * (curr.precoUnitario || 0));
      }, 0);
      setTotalFaturamento(total);

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(
        "Excluir Venda",
        "Tem certeza? O valor será removido do caixa.",
        [
            { text: "Cancelar", style: "cancel" },
            { 
                text: "Excluir", 
                style: "destructive", 
                onPress: async () => {
                    await deleteColheita(id);
                    carregarDados(); // Atualiza a lista
                }
            }
        ]
    );
  };

  // Recarrega sempre que a tela ganha foco
  useEffect(() => {
    if (isFocused) carregarDados();
  }, [isFocused, selectedTenantId]);

  const renderItem = ({ item }: { item: Colheita }) => {
    const totalVenda = item.quantidade * (item.precoUnitario || 0);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
            {/* DATA DA VENDA */}
            <View style={styles.dateBadge}>
                <MaterialCommunityIcons name="calendar" size={14} color="#166534" />
                <Text style={styles.dateText}>{formatDate(item.dataColheita)}</Text>
            </View>
            
            {/* AÇÕES (EDITAR E EXCLUIR) */}
            <View style={{flexDirection: 'row', gap: 15}}>
                <TouchableOpacity onPress={() => navigation.navigate('ColheitaForm', { colheitaId: item.id })}>
                    <MaterialCommunityIcons name="pencil-outline" size={22} color="#F59E0B" />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => handleDelete(item.id)}>
                    <MaterialCommunityIcons name="trash-can-outline" size={22} color="#EF4444" />
                </TouchableOpacity>
            </View>
        </View>

        <View style={styles.row}>
            <View style={{flex: 1}}>
                <Text style={styles.label}>Qtd.</Text>
                <Text style={styles.value}>
                    {item.quantidade} {item.unidade}
                </Text>
            </View>
            
            <View style={{flex: 1}}>
                <Text style={styles.label}>Valor Unit.</Text>
                <Text style={styles.value}>
                    R$ {item.precoUnitario?.toFixed(2)}
                </Text>
            </View>

            <View style={{flex: 1, alignItems: 'flex-end'}}>
                <Text style={styles.label}>Total</Text>
                <Text style={styles.totalValue}>
                    R$ {totalVenda.toFixed(2)}
                </Text>
            </View>
        </View>

        {item.clienteId && (
             <View style={styles.footerInfo}>
                <MaterialCommunityIcons name="account-check" size={14} color="#64748B" />
                <Text style={styles.infoText}>Cliente Vinculado</Text>
             </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#14532d" />
      
      {/* Resumo Financeiro no Topo */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Relatório de Vendas</Text>
        <Text style={styles.headerSub}>
            Acumulado: <Text style={{fontWeight: 'bold'}}>R$ {totalFaturamento.toFixed(2)}</Text>
        </Text>
      </View>

      <FlatList
        data={vendas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={carregarDados} tintColor="#fff" />}
        ListEmptyComponent={
            !loading ? (
                <View style={styles.emptyContainer}>
                    <MaterialCommunityIcons name="cart-off" size={60} color="rgba(255,255,255,0.3)" />
                    <Text style={styles.emptyTitle}>Nenhuma venda registrada</Text>
                </View>
            ) : null
        }
        renderItem={renderItem}
      />
      
      {/* Botão Flutuante (+) */}
      <TouchableOpacity 
        style={styles.fab} 
        activeOpacity={0.8}
        onPress={() => navigation.navigate('ColheitaForm')}
      >
        <MaterialCommunityIcons name="plus" size={32} color="#166534" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#14532d' },
  
  header: { padding: 20, paddingBottom: 10, backgroundColor: '#14532d' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#FFF' },
  headerSub: { fontSize: 16, color: '#A7F3D0', marginTop: 5 },

  listContent: { padding: 20, paddingBottom: 100 },
  
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 4,
  },
  cardHeader: { 
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15,
      borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 10
  },
  dateBadge: { 
      flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', 
      paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 
  },
  dateText: { marginLeft: 6, color: '#166534', fontWeight: 'bold', fontSize: 14 },

  row: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: 12, color: '#64748B', marginBottom: 2 },
  value: { fontSize: 16, color: '#1E293B', fontWeight: '600' },
  totalValue: { fontSize: 16, color: '#166534', fontWeight: 'bold' },

  footerInfo: { 
      flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingTop: 10, 
      borderTopWidth: 1, borderTopColor: '#F1F5F9' 
  },
  infoText: { fontSize: 12, color: '#64748B', marginLeft: 5 },

  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFF', marginTop: 10 },

  fab: {
    position: 'absolute', right: 20, bottom: 30, width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', elevation: 8,
  },
});

export default VendasListScreen;