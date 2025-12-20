// src/screens/Estufas/EstufasListScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, StatusBar } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { listEstufas } from '../../services/estufaService';
import { Estufa } from '../../types/domain';
import { useIsFocused } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const EstufasListScreen = ({ navigation }: any) => {
  const { user, selectedTenantId } = useAuth();
  const [estufas, setEstufas] = useState<Estufa[]>([]);
  const [loading, setLoading] = useState(true);
  const isFocused = useIsFocused();

  useEffect(() => {
    navigation.setOptions({ 
        headerStyle: { backgroundColor: '#14532d' },
        headerTintColor: '#fff'
    });
  }, []);

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

  const renderItem = ({ item }: { item: Estufa }) => {
    const isAtiva = item.status === 'ativa';
    
    return (
      <TouchableOpacity 
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('EstufaDetail', { estufaId: item.id })}
      >
        <View style={styles.cardHeader}>
            <View style={styles.iconContainer}>
                <MaterialCommunityIcons name="greenhouse" size={24} color={isAtiva ? '#166534' : '#9CA3AF'} />
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
            <MaterialCommunityIcons name="arrow-right" size={16} color="#166534" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#14532d" />
      <FlatList
        data={estufas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={carregarEstufas} tintColor="#fff" />}
        ListEmptyComponent={
            !loading ? (
                <View style={styles.emptyContainer}>
                    <MaterialCommunityIcons name="greenhouse" size={60} color="rgba(255,255,255,0.3)" />
                    <Text style={styles.emptyTitle}>Nenhuma estufa</Text>
                    <Text style={styles.emptySub}>Cadastre sua primeira estufa para começar.</Text>
                </View>
            ) : null
        }
        renderItem={renderItem}
      />
      
      <TouchableOpacity 
        style={styles.fab} 
        activeOpacity={0.8}
        onPress={() => navigation.navigate('EstufaForm')}
      >
        <MaterialCommunityIcons name="plus" size={32} color="#166534" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#14532d' }, // Fundo Verde
  listContent: { padding: 20, paddingBottom: 100 },
  
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 4,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  iconContainer: {
    width: 48, height: 48, borderRadius: 12, backgroundColor: '#ECFDF5',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  textContainer: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  cardSubTitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeActive: { backgroundColor: '#D1FAE5' },
  badgeInactive: { backgroundColor: '#F3F4F6' },
  badgeText: { fontSize: 10, fontWeight: '700' },
  textActive: { color: '#059669' },
  textInactive: { color: '#6B7280' },

  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12,
  },
  footerText: { fontSize: 12, fontWeight: '600', color: '#166534' },

  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFF', marginTop: 10 },
  emptySub: { fontSize: 14, color: '#A7F3D0', marginTop: 5 },

  fab: {
    position: 'absolute', right: 20, bottom: 30, width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', elevation: 8,
  },
});

export default EstufasListScreen;