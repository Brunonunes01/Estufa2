// src/screens/Insumos/InsumosListScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { listInsumos } from '../../services/insumoService';
import { Insumo } from '../../types/domain';
import { useIsFocused } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const InsumosListScreen = ({ navigation }: any) => {
  const { user, selectedTenantId } = useAuth(); // <--- ID SELECIONADO
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [loading, setLoading] = useState(true);
  const isFocused = useIsFocused();

  const loadData = async () => {
    const idBusca = selectedTenantId || user?.uid;
    if (!idBusca) return;

    setLoading(true);
    try {
        const data = await listInsumos(idBusca); // <--- BUSCA COM O ID CORRETO
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

  return (
    <View style={styles.container}>
      <FlatList
        data={insumos}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: 80 }}
        ListEmptyComponent={<Text style={styles.empty}>Nenhum insumo cadastrado nesta conta.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.item}
            onPress={() => navigation.navigate('InsumoForm', { insumoId: item.id })}
          >
            <View>
                <Text style={styles.name}>{item.nome}</Text>
                <Text style={styles.detail}>Estoque: {item.estoqueAtual} {item.unidadePadrao}</Text>
            </View>
            <View>
                {item.estoqueMinimo && item.estoqueAtual <= item.estoqueMinimo && (
                    <MaterialCommunityIcons name="alert-circle" size={24} color="#D32F2F" />
                )}
            </View>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => navigation.navigate('InsumoForm')}
      >
        <MaterialCommunityIcons name="plus" size={30} color="#fff" />
      </TouchableOpacity>
      
      {/* Botão de Entrada de Estoque (atalho) */}
      <TouchableOpacity 
        style={[styles.fab, styles.fabSecondary]} 
        onPress={() => navigation.navigate('InsumoEntry')}
      >
        <MaterialCommunityIcons name="archive-arrow-down" size={26} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA', padding: 16 },
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 10, elevation: 2 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  detail: { fontSize: 14, color: '#666' },
  empty: { textAlign: 'center', marginTop: 50, color: '#888' },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: '#4CAF50', alignItems: 'center', justifyContent: 'center', elevation: 5 },
  fabSecondary: { bottom: 90, backgroundColor: '#2196F3', width: 50, height: 50, borderRadius: 25, right: 25 },
});

export default InsumosListScreen;