// src/screens/Despesas/DespesasListScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { listDespesas, deleteDespesa, updateDespesaStatus } from '../../services/despesaService';
import { Despesa } from '../../types/domain';
import { useIsFocused } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const COLORS = { background: '#F3F4F6', card: '#FFFFFF', danger: '#EF4444', textDark: '#111827', textGray: '#6B7280', success: '#10B981', warning: '#F59E0B' };

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

  const handleDarBaixa = (item: Despesa) => {
      Alert.alert("Dar Baixa", "Confirmar pagamento desta conta?", [
          { text: "Cancelar", style: "cancel" },
          { text: "Confirmar", onPress: async () => {
              await updateDespesaStatus(item.id, 'pago');
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

  const totalGasto = despesas.reduce((acc, curr) => acc + curr.valor, 0);
  const totalPendente = despesas.filter(d => d.status === 'pendente').reduce((acc, curr) => acc + curr.valor, 0);

  return (
    <View style={styles.container}>
      <View style={styles.summaryContainer}>
          <View style={[styles.summaryBox, { backgroundColor: COLORS.danger }]}>
              <Text style={styles.summaryLabel}>Total Geral</Text>
              <Text style={styles.summaryValue}>R$ {totalGasto.toFixed(2)}</Text>
          </View>
          <View style={[styles.summaryBox, { backgroundColor: COLORS.warning }]}>
              <Text style={styles.summaryLabel}>A Pagar</Text>
              <Text style={styles.summaryValue}>R$ {totalPendente.toFixed(2)}</Text>
          </View>
      </View>

      <FlatList
        data={despesas}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: 80 }}
        ListEmptyComponent={<Text style={styles.empty}>Nenhuma despesa registrada.</Text>}
        renderItem={({ item }) => {
            const isPendente = item.status === 'pendente';

            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.iconBox}>
                        <MaterialCommunityIcons name={getIcon(item.categoria) as any} size={24} color={COLORS.danger} />
                    </View>
                    <View style={{flex: 1}}>
                        <Text style={styles.title}>{item.descricao}</Text>
                        <Text style={styles.date}>{item.dataDespesa.toDate().toLocaleDateString()}</Text>
                        
                        {isPendente && item.dataVencimento && (
                            <Text style={styles.vencimento}>Vence em: {item.dataVencimento.toDate().toLocaleDateString()}</Text>
                        )}
                    </View>
                    <View style={{alignItems: 'flex-end'}}>
                        <Text style={styles.value}>R$ {item.valor.toFixed(2)}</Text>
                        <View style={[styles.badge, { backgroundColor: isPendente ? '#FEF3C7' : '#D1FAE5' }]}>
                            <Text style={[styles.badgeText, { color: isPendente ? '#D97706' : '#059669' }]}>
                                {isPendente ? 'PENDENTE' : 'PAGO'}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.actionsRow}>
                    {isOwner && (
                        <TouchableOpacity onPress={() => handleDelete(item)} style={{marginRight: 'auto'}}>
                            <Text style={styles.deleteText}>Excluir</Text>
                        </TouchableOpacity>
                    )}

                    {isPendente && (
                        <TouchableOpacity style={styles.baixaBtn} onPress={() => handleDarBaixa(item)}>
                            <MaterialCommunityIcons name="check-circle" size={16} color="#FFF" />
                            <Text style={styles.baixaText}>Dar Baixa</Text>
                        </TouchableOpacity>
                    )}
                </View>
              </View>
            );
        }}
      />
      
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('DespesaForm')}>
        <MaterialCommunityIcons name="plus" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  summaryContainer: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  summaryBox: { flex: 1, padding: 15, borderRadius: 12, alignItems: 'center' },
  summaryLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' },
  summaryValue: { color: '#FFF', fontSize: 20, fontWeight: 'bold', marginTop: 5 },
  
  card: { backgroundColor: COLORS.card, padding: 16, borderRadius: 12, marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  iconBox: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.textDark },
  date: { fontSize: 12, color: COLORS.textGray, marginTop: 2 },
  vencimento: { fontSize: 11, color: '#D97706', marginTop: 2, fontWeight: 'bold' },
  value: { fontSize: 16, fontWeight: '700', color: COLORS.danger },
  badge: { marginTop: 5, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeText: { fontSize: 10, fontWeight: 'bold' },
  
  actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 10 },
  deleteText: { fontSize: 13, color: COLORS.textGray, fontWeight: '600', paddingVertical: 5 },
  baixaBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.success, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, gap: 5 },
  baixaText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  
  empty: { textAlign: 'center', marginTop: 50, color: COLORS.textGray },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.danger, alignItems: 'center', justifyContent: 'center', elevation: 8 }
});

export default DespesasListScreen;