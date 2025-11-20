// src/screens/Fornecedores/FornecedoresListScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, Button, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { listFornecedores } from '../../services/fornecedorService';
import { Fornecedor } from '../../types/domain';
import { useIsFocused } from '@react-navigation/native';

const FornecedoresListScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const isFocused = useIsFocused(); 

  const carregarFornecedores = async () => {
    if (user) {
      setLoading(true);
      try {
        const lista = await listFornecedores(user.uid);
        setFornecedores(lista);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (isFocused && user) {
      carregarFornecedores();
    }
  }, [isFocused, user]);

  if (loading) {
    return <ActivityIndicator size="large" style={{ flex: 1, justifyContent: 'center' }} />;
  }

  return (
    <View style={styles.container}>
      <Button
        title="Adicionar Novo Fornecedor"
        onPress={() => navigation.navigate('FornecedorForm', { fornecedorId: null })} // Passa null para criação
      />
      
      <FlatList
        data={fornecedores}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          // MODIFICADO: Item Clicável para edição
          <TouchableOpacity 
            style={styles.item}
            onPress={() => navigation.navigate('FornecedorForm', { fornecedorId: item.id })}
          >
            <Text style={styles.itemTitle}>{item.nome}</Text>
            {item.contato && <Text>Contato: {item.contato}</Text>}
            {item.telefone && <Text>Telefone: {item.telefone}</Text>}
            {item.email && <Text>Email: {item.email}</Text>}
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20 }}>Nenhum fornecedor cadastrado.</Text>}
        onRefresh={carregarFornecedores}
        refreshing={loading}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  item: {
    backgroundColor: '#fff',
    padding: 16,
    marginVertical: 8,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#eee',
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default FornecedoresListScreen;