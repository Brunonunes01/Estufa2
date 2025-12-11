// src/screens/Insumos/InsumosListScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { listInsumos } from '../../services/insumoService';
import { Insumo } from '../../types/domain';
import { useIsFocused } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const COLORS = {
  background: '#F3F4F6',
  card: '#FFFFFF',
  primary: '#8B5CF6', // Roxo para Insumos (diferenciar)
  secondary: '#A78BFA',
  textDark: '#111827',
  textGray: '#6B7280',
  danger: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981'
};

const InsumosListScreen = ({ navigation }: any) => {
  const { user, selectedTenantId } = useAuth(); 
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [loading, setLoading] = useState(true);
  const isFocused = useIsFocused();

  const loadData = async () => {
    const idBusca = selectedTenantId || user?.uid;
    if (!idBusca) return;

    setLoading(true);
    try {
        const data = await listInsumos(idBusca);
        setInsumos(data);
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) loadData();
  }, [isFocused, selectedTenantId]);

  // Render Item
  const renderItem = ({ item }: { item: Insumo }) => {
      const isLowStock = item.estoqueMinimo && item.estoqueAtual <= item.estoqueMinimo;
      
      return (
        <TouchableOpacity 
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('InsumoForm', { insumoId: item.id })}
        >
            <View style={styles.cardHeader}>
                <View style={styles.iconBox}>
                    <MaterialCommunityIcons 
                        name={item.tipo === 'defensivo' ? 'bottle-tonic-skull' : 'sack'} 
                        size={24} 
                        color={COLORS.primary} 
                    />
                </View>
                <View style={{flex: 1, paddingLeft: 12}}>
                    <Text style={styles.cardTitle}>{item.nome}</Text>
                    <Text style={styles.cardType}>{item.tipo.toUpperCase()}</Text>
                </View>
                {isLowStock && (
                    <View style={styles.alertBadge}>
                        <MaterialCommunityIcons name="alert-circle" size={16} color="#FFF" />
                        <Text style={styles.alertText}>BAIXO</Text>
                    </View>
                )}
            </View>

            <View style={styles.divider} />

            <View style={styles.cardFooter}>
                <View>
                    <Text style={styles.footerLabel}>Estoque Atual</Text>
                    <Text style={[styles.footerValue, isLowStock ? {color: COLORS.danger} : {color: COLORS.textDark}]}>
                        {item.estoqueAtual} {item.unidadePadrao}
                    </Text>
                </View>
                <View style={{alignItems: 'flex-end'}}>
                    <Text style={styles.footerLabel}>Mínimo</Text>
                    <Text style={styles.footerValue}>{item.estoqueMinimo || 0} {item.unidadePadrao}</Text>
                </View>
            </View>
        </TouchableOpacity>
      );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={insumos}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} colors={[COLORS.primary]} />}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>Nenhum insumo cadastrado.</Text> : null}
        renderItem={renderItem}
      />
      
      {/* Botão de Adicionar (Principal) */}
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('InsumoForm')}>
        <MaterialCommunityIcons name="plus" size={32} color="#fff" />
      </TouchableOpacity>
      
      {/* Botão de Entrada Rápida (Secundário) */}
      <TouchableOpacity style={styles.fabSmall} onPress={() => navigation.navigate('InsumoEntry')}>
        <MaterialCommunityIcons name="arrow-down-bold-box" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  listContent: { padding: 16, paddingBottom: 100 },
  
  card: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOffset: {width:0, height:2}, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#F3E8FF', justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textDark },
  cardType: { fontSize: 11, fontWeight: '600', color: COLORS.textGray, marginTop: 2 },
  
  alertBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.danger, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  alertText: { color: '#FFF', fontSize: 10, fontWeight: '700', marginLeft: 4 },

  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  footerLabel: { fontSize: 11, color: COLORS.textGray, marginBottom: 2 },
  footerValue: { fontSize: 16, fontWeight: '700', color: COLORS.textDark },

  empty: { textAlign: 'center', marginTop: 50, color: COLORS.textGray, fontSize: 16 },
  
  fab: { position: 'absolute', right: 20, bottom: 20, width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', elevation: 8, shadowColor: COLORS.primary, shadowOffset: {width:0, height:4}, shadowOpacity: 0.3 },
  fabSmall: { position: 'absolute', right: 28, bottom: 100, width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.textDark, alignItems: 'center', justifyContent: 'center', elevation: 6 },
});

export default InsumosListScreen;