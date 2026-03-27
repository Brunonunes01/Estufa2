// src/screens/Despesas/DespesasListScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { listDespesas, deleteDespesa, updateDespesaStatus } from '../../services/despesaService';
import { Despesa } from '../../types/domain';
import { useIsFocused } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/theme';

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
      <View style={styles.topInfo}>
        <Text style={styles.topTitle}>Controle de Despesas</Text>
        <Text style={styles.topSub}>Priorize o pagamento das contas pendentes.</Text>
      </View>
      <View style={styles.summaryContainer}>
          <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Total Geral</Text>
              <Text style={[styles.summaryValue, styles.summaryDanger]}>R$ {totalGasto.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>A Pagar</Text>
              <Text style={[styles.summaryValue, styles.summaryWarning]}>R$ {totalPendente.toFixed(2)}</Text>
          </View>
      </View>

      <FlatList
        data={despesas}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={!loading ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="receipt-text-outline" size={40} color={COLORS.textMuted} />
            <Text style={styles.empty}>Nenhuma despesa registrada.</Text>
          </View>
        ) : null}
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
                        <View style={[styles.badge, { backgroundColor: isPendente ? COLORS.cFEF3C7 : COLORS.cD1FAE5 }]}>
                            <Text style={[styles.badgeText, { color: isPendente ? COLORS.warning : COLORS.success }]}>
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
                            <MaterialCommunityIcons name="check-circle" size={16} color={COLORS.textLight} />
                            <Text style={styles.baixaText}>Dar Baixa</Text>
                        </TouchableOpacity>
                    )}
                </View>
              </View>
            );
        }}
      />
      {loading ? <ActivityIndicator size="small" color={COLORS.primary} style={styles.inlineLoader} /> : null}
      
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('DespesaForm')}>
        <MaterialCommunityIcons name="plus" size={30} color={COLORS.textLight} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: SPACING.lg },
  topInfo: { marginBottom: SPACING.md },
  topTitle: { fontSize: TYPOGRAPHY.h3, fontWeight: '800', color: COLORS.textPrimary },
  topSub: { marginTop: 4, color: COLORS.textSecondary, fontSize: 13 },
  summaryContainer: { flexDirection: 'row', gap: 10, marginBottom: SPACING.lg },
  summaryBox: { flex: 1, padding: 15, borderRadius: RADIUS.md, alignItems: 'center', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.card },
  summaryLabel: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
  summaryValue: { fontSize: TYPOGRAPHY.h3, fontWeight: '800', marginTop: 5 },
  summaryDanger: { color: COLORS.danger },
  summaryWarning: { color: COLORS.warning },
  listContent: { paddingBottom: 90 },
  
  card: { backgroundColor: COLORS.card, padding: SPACING.md, borderRadius: RADIUS.md, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.card },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  iconBox: { width: 44, height: 44, borderRadius: RADIUS.sm, backgroundColor: COLORS.dangerBg, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  title: { fontSize: TYPOGRAPHY.body, fontWeight: '800', color: COLORS.textDark },
  date: { fontSize: 12, color: COLORS.textGray, marginTop: 2 },
  vencimento: { fontSize: 11, color: COLORS.textPrimary, marginTop: 2, fontWeight: 'bold' },
  value: { fontSize: TYPOGRAPHY.body, fontWeight: '800', color: COLORS.danger },
  badge: { marginTop: 5, paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.sm },
  badgeText: { fontSize: 10, fontWeight: 'bold' },
  
  actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: 1, borderTopColor: COLORS.divider, paddingTop: 10 },
  deleteText: { fontSize: 13, color: COLORS.textGray, fontWeight: '600', paddingVertical: 5 },
  baixaBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.success, paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.sm, gap: 5 },
  baixaText: { color: COLORS.textLight, fontSize: 12, fontWeight: 'bold' },
  
  inlineLoader: { marginTop: 6 },
  emptyState: { alignItems: 'center', marginTop: 50 },
  empty: { textAlign: 'center', marginTop: 8, color: COLORS.textGray },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 62, height: 62, borderRadius: 31, backgroundColor: COLORS.modDespesas, alignItems: 'center', justifyContent: 'center', ...SHADOWS.floating }
});

export default DespesasListScreen;
