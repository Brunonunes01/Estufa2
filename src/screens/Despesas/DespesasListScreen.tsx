// src/screens/Despesas/DespesasListScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { listDespesas, deleteDespesa } from '../../services/despesaService';
import { Despesa } from '../../types/domain';
import { useIsFocused } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const COLORS = { background: '#F3F4F6', card: '#FFFFFF', danger: '#EF4444', textDark: '#111827', textGray: '#6B7280' };

const DespesasListScreen = ({ navigation }: any) => {
  const { user, selectedTenantId, isOwner } = useAuth();
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [loading, setLoading] = useState(true);
  const isFocused = useIsFocused();

  const loadData = async () => {
    const idBusca = selectedTenantId || user?.uid;
    if (!idBusca) return;
    
    setLoading(true);
    try {
        const lista = await listDespesas(idBusca);
        setDespesas(lista);
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) loadData();
  }, [isFocused, selectedTenantId]);

  const handleDelete = (item: Despesa) => {
      Alert.alert("Excluir", "Remover esta despesa?", [
          { text: "Cancelar", style: "cancel" },
          { text: "Excluir", style: "destructive", onPress: async () => {
              await deleteDespesa(item.id);
              loadData();
          }}
      ]);
  };

  const getIcon = (cat: string) => {
      switch(cat) {
          case 'energia': return 'lightning-bolt';
          case 'agua': return 'water';
          case 'mao_de_obra': return 'account-hard-hat';
          case 'combustivel': return 'gas-station';
          case 'manutencao': return 'tools';
          default: return 'cash-minus';
      }
  };

  return (
    <View style={styles.container}>
      {/* Resumo do Mês (Simplificado) */}
      <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>Total Gasto (Lista)</Text>
          <Text style={styles.summaryValue}>R$ {despesas.reduce((acc, curr) => acc + curr.valor, 0).toFixed(2)}</Text>
      </View>

      <FlatList
        data={despesas}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: 80 }}
        ListEmptyComponent={<Text style={styles.empty}>Nenhuma despesa registrada.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.iconBox}>
                <MaterialCommunityIcons name={getIcon(item.categoria) as any} size={24} color={COLORS.danger} />
            </View>
            <View style={{flex: 1}}>
                <Text style={styles.title}>{item.descricao}</Text>
                <Text style={styles.date}>{item.dataDespesa.toDate().toLocaleDateString()}</Text>
            </View>
            <View style={{alignItems: 'flex-end'}}>
                <Text style={styles.value}>- R$ {item.valor.toFixed(2)}</Text>
                {isOwner && (
                    <TouchableOpacity onPress={() => handleDelete(item)}>
                        <Text style={styles.deleteText}>Excluir</Text>
                    </TouchableOpacity>
                )}
            </View>
          </View>
        )}
      />
      
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => navigation.navigate('DespesaForm')}
      >
        <MaterialCommunityIcons name="plus" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  summaryBox: { backgroundColor: COLORS.danger, padding: 20, borderRadius: 12, marginBottom: 20, alignItems: 'center' },
  summaryLabel: { color: '#FECACA', fontSize: 14, fontWeight: '600' },
  summaryValue: { color: '#FFF', fontSize: 28, fontWeight: 'bold', marginTop: 5 },
  
  card: { flexDirection: 'row', backgroundColor: COLORS.card, padding: 16, borderRadius: 12, marginBottom: 12, alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  iconBox: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.textDark },
  date: { fontSize: 12, color: COLORS.textGray, marginTop: 2 },
  value: { fontSize: 16, fontWeight: '700', color: COLORS.danger },
  deleteText: { fontSize: 12, color: COLORS.textGray, marginTop: 4, textDecorationLine: 'underline' },
  empty: { textAlign: 'center', marginTop: 50, color: COLORS.textGray },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.danger, alignItems: 'center', justifyContent: 'center', elevation: 8 }
});

export default DespesasListScreen;