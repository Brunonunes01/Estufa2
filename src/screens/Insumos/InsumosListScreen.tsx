// src/screens/Insumos/InsumosListScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { listInsumos } from '../../services/insumoService';
import { Insumo } from '../../types/domain';
import { useIsFocused } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/theme';

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
      // CORREÇÃO: Verificação segura para evitar que "0" vase para o JSX
      const isLowStock = item.estoqueMinimo !== null && item.estoqueMinimo !== undefined && item.estoqueAtual <= item.estoqueMinimo;
      
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
                
                {/* CORREÇÃO: Usando ternário para garantir que renderize a View ou anule com segurança */}
                {isLowStock ? (
                    <View style={styles.alertBadge}>
                        <MaterialCommunityIcons name="alert-circle" size={16} color={COLORS.textLight} />
                        <Text style={styles.alertText}>BAIXO</Text>
                    </View>
                ) : null}
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
                    <Text style={styles.footerValue}>{item.estoqueMinimo !== null ? item.estoqueMinimo : 0} {item.unidadePadrao}</Text>
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
        <MaterialCommunityIcons name="plus" size={32} color={COLORS.textLight} />
      </TouchableOpacity>
      
      {/* Botão de Entrada Rápida (Secundário) */}
      <TouchableOpacity style={styles.fabSmall} onPress={() => navigation.navigate('InsumoEntry')}>
        <MaterialCommunityIcons name="arrow-down-bold-box" size={24} color={COLORS.textLight} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  listContent: { padding: SPACING.lg, paddingBottom: 100 },
  
  card: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.card },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 48, height: 48, borderRadius: RADIUS.md, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: TYPOGRAPHY.body, fontWeight: '800', color: COLORS.textDark },
  cardType: { fontSize: 11, fontWeight: '600', color: COLORS.textGray, marginTop: 2 },
  
  alertBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.danger, paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.sm },
  alertText: { color: COLORS.textLight, fontSize: 10, fontWeight: '700', marginLeft: 4 },

  divider: { height: 1, backgroundColor: COLORS.divider, marginVertical: 12 },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  footerLabel: { fontSize: 11, color: COLORS.textGray, marginBottom: 2 },
  footerValue: { fontSize: TYPOGRAPHY.body, fontWeight: '700', color: COLORS.textDark },

  empty: { textAlign: 'center', marginTop: 50, color: COLORS.textGray, fontSize: 16 },
  
  fab: { position: 'absolute', right: 20, bottom: 20, width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', ...SHADOWS.floating },
  fabSmall: { position: 'absolute', right: 28, bottom: 100, width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.secondary, alignItems: 'center', justifyContent: 'center', ...SHADOWS.card },
});

export default InsumosListScreen;
