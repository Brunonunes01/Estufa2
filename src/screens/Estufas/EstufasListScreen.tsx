// src/screens/Estufas/EstufasListScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { listEstufas } from '../../services/estufaService';
import { Estufa } from '../../types/domain';
import { useIsFocused } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// --- TEMA ---
const COLORS = {
  background: '#F3F4F6',
  card: '#FFFFFF',
  primary: '#059669',
  textDark: '#111827',
  textGray: '#6B7280',
};

const EstufasListScreen = ({ navigation }: any) => {
  const { user, selectedTenantId } = useAuth();
  const [estufas, setEstufas] = useState<Estufa[]>([]);
  const [loading, setLoading] = useState(true);
  const isFocused = useIsFocused();

  const carregarEstufas = async () => {
    const idBusca = selectedTenantId || user?.uid;
    if (!idBusca) return;
    
    setLoading(true);
    try {
      const lista = await listEstufas(idBusca);
      setEstufas(lista);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) carregarEstufas();
  }, [isFocused, selectedTenantId]);

  // Renderização do Item da Lista (Design System)
  const renderItem = ({ item }: { item: Estufa }) => {
    const isAtiva = item.status === 'ativa';
    
    return (
      <TouchableOpacity 
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('EstufaDetail', { estufaId: item.id })}
      >
        <View style={styles.cardHeader}>
            <View style={styles.iconContainer}>
                <MaterialCommunityIcons name="greenhouse" size={24} color={isAtiva ? COLORS.primary : '#9CA3AF'} />
            </View>
            <View style={styles.textContainer}>
                <Text style={styles.cardTitle}>{item.nome}</Text>
                <Text style={styles.cardSubTitle}>Área Total: {item.areaM2} m²</Text>
            </View>
            <View style={[styles.badge, isAtiva ? styles.badgeActive : styles.badgeInactive]}>
                <Text style={[styles.badgeText, isAtiva ? styles.textActive : styles.textInactive]}>
                    {item.status === 'ativa' ? 'ATIVA' : 'PARADA'}
                </Text>
            </View>
        </View>
        
        <View style={styles.cardFooter}>
            <Text style={styles.footerText}>Ver detalhes e plantios</Text>
            <MaterialCommunityIcons name="arrow-right" size={16} color={COLORS.primary} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={estufas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={carregarEstufas} />}
        ListEmptyComponent={
            !loading ? (
                <View style={styles.emptyContainer}>
                    <MaterialCommunityIcons name="greenhouse" size={60} color="#E5E7EB" />
                    <Text style={styles.emptyTitle}>Nenhuma estufa</Text>
                    <Text style={styles.emptySub}>Cadastre sua primeira estufa para começar.</Text>
                </View>
            ) : null
        }
        renderItem={renderItem}
      />
      
      {/* Botão Flutuante (FAB) Estilizado */}
      <TouchableOpacity 
        style={styles.fab} 
        activeOpacity={0.8}
        onPress={() => navigation.navigate('EstufaForm')}
      >
        <MaterialCommunityIcons name="plus" size={32} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  listContent: { padding: 20, paddingBottom: 100 },
  
  // Estilo do Cartão
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    // Sombra Suave
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#ECFDF5', // Verde bem claro
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: { flex: 1 },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  cardSubTitle: {
    fontSize: 13,
    color: COLORS.textGray,
    marginTop: 2,
  },
  
  // Badges (Etiquetas)
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeActive: { backgroundColor: '#D1FAE5' },
  badgeInactive: { backgroundColor: '#F3F4F6' },
  badgeText: { fontSize: 10, fontWeight: '700' },
  textActive: { color: '#059669' },
  textInactive: { color: '#6B7280' },

  // Rodapé do Cartão
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // Empty State
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textDark, marginTop: 10 },
  emptySub: { fontSize: 14, color: COLORS.textGray, marginTop: 5 },

  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
});

export default EstufasListScreen;