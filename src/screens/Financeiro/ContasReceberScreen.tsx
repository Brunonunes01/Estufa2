// src/screens/Financeiro/ContasReceberScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
    View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, RefreshControl, StatusBar 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { listContasAReceber, receberConta } from '../../services/colheitaService';
import { listClientes } from '../../services/clienteService';
import { Colheita } from '../../types/domain';
import { useIsFocused } from '@react-navigation/native';

const ContasReceberScreen = ({ navigation }: any) => {
  const { user, selectedTenantId } = useAuth();
  const [contas, setContas] = useState<Colheita[]>([]);
  const [clientesMap, setClientesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [totalPendente, setTotalPendente] = useState(0);
  const isFocused = useIsFocused();

  const carregarDados = async () => {
    const targetId = selectedTenantId || user?.uid;
    if (!targetId) return;
    
    setLoading(true);
    try {
      const [listaContas, listaClientes] = await Promise.all([
          listContasAReceber(targetId),
          listClientes(targetId)
      ]);
      
      // Cria mapa de clientes: { id: "Nome do Cliente" }
      const map: Record<string, string> = {};
      listaClientes.forEach(c => map[c.id] = c.nome);
      setClientesMap(map);
      
      setContas(listaContas);

      // Calcula Total Pendente
      const total = listaContas.reduce((acc, curr) => acc + (curr.quantidade * (curr.precoUnitario || 0)), 0);
      setTotalPendente(total);

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) carregarDados();
  }, [isFocused, selectedTenantId]);

  const handleReceber = (item: Colheita) => {
      const valor = (item.quantidade * (item.precoUnitario || 0)).toFixed(2);
      const clienteNome = item.clienteId ? clientesMap[item.clienteId] : 'Cliente Avulso';

      Alert.alert(
          "Confirmar Recebimento",
          `Receber R$ ${valor} de ${clienteNome}?`,
          [
              { text: "Cancelar", style: "cancel" },
              { 
                  text: "Confirmar Recebimento", 
                  onPress: async () => {
                      await receberConta(item.id);
                      Alert.alert("Sucesso", "Pagamento registrado!");
                      carregarDados(); // Atualiza a lista
                  } 
              }
          ]
      );
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-';
    // Verifica formatação do timestamp
    const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
    return d.toLocaleDateString('pt-BR');
  };

  const renderItem = ({ item }: { item: Colheita }) => {
    const total = item.quantidade * (item.precoUnitario || 0);
    const clienteNome = item.clienteId ? clientesMap[item.clienteId] : 'Não identificado';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
            <View style={{flex: 1}}>
                <Text style={styles.clienteName}>{clienteNome}</Text>
                <Text style={styles.dateText}>Venda em: {formatDate(item.dataColheita)}</Text>
            </View>
            <View style={styles.badge}>
                <Text style={styles.badgeText}>PENDENTE</Text>
            </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
            <Text style={styles.details}>
                {item.quantidade} {item.unidade} x R$ {item.precoUnitario?.toFixed(2)}
            </Text>
            <Text style={styles.totalValue}>R$ {total.toFixed(2)}</Text>
        </View>

        <TouchableOpacity style={styles.receiveBtn} onPress={() => handleReceber(item)}>
            <MaterialCommunityIcons name="check-circle-outline" size={20} color="#FFF" />
            <Text style={styles.btnText}>Dar Baixa (Receber)</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#B45309" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Contas a Receber</Text>
        <Text style={styles.headerSub}>Total para receber: R$ {totalPendente.toFixed(2)}</Text>
      </View>

      <FlatList
        data={contas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={carregarDados} tintColor="#fff" />}
        ListEmptyComponent={
            !loading ? (
                <View style={styles.emptyContainer}>
                    <MaterialCommunityIcons name="hand-coin" size={60} color="rgba(255,255,255,0.3)" />
                    <Text style={styles.emptyTitle}>Tudo recebido!</Text>
                    <Text style={styles.emptySub}>Nenhuma conta pendente no momento.</Text>
                </View>
            ) : null
        }
        renderItem={renderItem}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#B45309' }, // Cor Terra/Laranja para diferenciar do verde
  header: { padding: 20, backgroundColor: '#B45309' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#FFF' },
  headerSub: { fontSize: 16, color: '#FEF3C7', marginTop: 5, fontWeight: 'bold' },
  listContent: { padding: 20 },
  
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16, elevation: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  clienteName: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  dateText: { fontSize: 12, color: '#64748B', marginTop: 2 },
  
  badge: { backgroundColor: '#FEF2F2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#FECACA' },
  badgeText: { color: '#DC2626', fontSize: 10, fontWeight: 'bold' },
  
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 },
  
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  details: { fontSize: 14, color: '#475569' },
  totalValue: { fontSize: 18, fontWeight: 'bold', color: '#B45309' },
  
  receiveBtn: { backgroundColor: '#166534', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12, gap: 8 },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },

  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFF', marginTop: 10 },
  emptySub: { color: '#FEF3C7' }
});

export default ContasReceberScreen;