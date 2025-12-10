// src/screens/Estufas/EstufasListScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { listEstufas } from '../../services/estufaService';
import { Estufa } from '../../types/domain';
import { useIsFocused } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const EstufasListScreen = ({ navigation }: any) => {
  // 1. PEGAR O 'selectedTenantId' DO AUTH
  const { user, selectedTenantId } = useAuth();
  
  const [estufas, setEstufas] = useState<Estufa[]>([]);
  const [loading, setLoading] = useState(true);
  const isFocused = useIsFocused();

  const carregarEstufas = async () => {
    // 2. USAR O ID SELECIONADO NA BUSCA
    const idBusca = selectedTenantId || user?.uid;
    
    if (!idBusca) return;
    
    setLoading(true);
    try {
      // 3. PASSAR PARA O SERVIÇO
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
  }, [isFocused, selectedTenantId]); // Recarrega se mudar a conta

  // ... (Restante do código de renderização permanece igual)
  return (
    <View style={styles.container}>
      <FlatList
        data={estufas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 80 }}
        ListEmptyComponent={<Text style={styles.emptyText}>Nenhuma estufa encontrada nesta conta.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.card}
            onPress={() => navigation.navigate('EstufaDetail', { estufaId: item.id })}
          >
            <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.nome}</Text>
                <View style={[styles.statusBadge, item.status === 'ativa' ? styles.statusAtiva : styles.statusInativa]}>
                    <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
                </View>
            </View>
            <Text style={styles.cardInfo}>Área: {item.areaM2} m²</Text>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => navigation.navigate('EstufaForm')}
      >
        <MaterialCommunityIcons name="plus" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#FAFAFA' },
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 10, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  statusAtiva: { backgroundColor: '#E8F5E9' },
  statusInativa: { backgroundColor: '#FFEBEE' },
  statusText: { fontSize: 10, fontWeight: 'bold', color: '#333' },
  cardInfo: { color: '#666' },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#888' },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: '#4CAF50', alignItems: 'center', justifyContent: 'center', elevation: 5 },
});

export default EstufasListScreen;