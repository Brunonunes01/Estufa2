// src/screens/Clientes/ClientesListScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { listClientes } from '../../services/clienteService';
import { Cliente } from '../../types/domain';
import { useIsFocused } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const ClientesListScreen = ({ navigation }: any) => {
  const { user, selectedTenantId } = useAuth(); // <--- ID SELECIONADO
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const isFocused = useIsFocused();

  const load = async () => {
    const idBusca = selectedTenantId || user?.uid;
    if (!idBusca) return;

    setLoading(true);
    try {
        const lista = await listClientes(idBusca); // <--- BUSCA CORRETA
        setClientes(lista);
    } catch(e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) load();
  }, [isFocused, selectedTenantId]);

  return (
    <View style={styles.container}>
      <FlatList
        data={clientes}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: 80 }}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>Nenhum cliente cadastrado nesta conta.</Text> : null}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.item} 
            onPress={() => navigation.navigate('ClienteForm', { clienteId: item.id })}
          >
            <View style={styles.header}>
                <Text style={styles.name}>{item.nome}</Text>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#ccc" />
            </View>
            <View style={styles.details}>
                {item.telefone && (
                    <View style={styles.rowCenter}>
                        <MaterialCommunityIcons name="phone" size={14} color="#666"/>
                        <Text style={styles.info}> {item.telefone}</Text>
                    </View>
                )}
                <Text style={styles.typeBadge}>{item.tipo?.toUpperCase()}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
      
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => navigation.navigate('ClienteForm')}
      >
        <MaterialCommunityIcons name="plus" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA', padding: 10 },
  item: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 10, elevation: 2 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  details: { flexDirection: 'row', marginTop: 8, alignItems: 'center', gap: 10 },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  info: { color: '#666', fontSize: 14 },
  typeBadge: { backgroundColor: '#E3F2FD', color: '#2196F3', fontSize: 10, padding: 4, borderRadius: 4, fontWeight: 'bold' },
  empty: { textAlign: 'center', marginTop: 50, color: '#888' },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: '#2196F3', alignItems: 'center', justifyContent: 'center', elevation: 5 }
});

export default ClientesListScreen;