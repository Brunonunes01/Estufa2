// src/screens/Fornecedores/FornecedoresListScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { listFornecedores } from '../../services/fornecedorService';
import { Fornecedor } from '../../types/domain';
import { useIsFocused } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const FornecedoresListScreen = ({ navigation }: any) => {
  const { user, selectedTenantId } = useAuth(); // <--- ID SELECIONADO
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const isFocused = useIsFocused();

  const load = async () => {
    const idBusca = selectedTenantId || user?.uid;
    if (!idBusca) return;

    setLoading(true);
    try {
        const lista = await listFornecedores(idBusca); // <--- BUSCA CORRETA
        setFornecedores(lista);
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
        data={fornecedores}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: 80 }}
        ListEmptyComponent={<Text style={styles.empty}>Nenhum fornecedor encontrado nesta conta.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.item} 
            onPress={() => navigation.navigate('FornecedorForm', { fornecedorId: item.id })}
          >
            <Text style={styles.name}>{item.nome}</Text>
            {item.telefone && <Text style={styles.info}>{item.telefone}</Text>}
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => navigation.navigate('FornecedorForm')}
      >
        <MaterialCommunityIcons name="plus" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA', padding: 10 },
  item: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 10, elevation: 2 },
  name: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  info: { color: '#666' },
  empty: { textAlign: 'center', marginTop: 50, color: '#888' },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: '#FF9800', alignItems: 'center', justifyContent: 'center', elevation: 5 }
});

export default FornecedoresListScreen;