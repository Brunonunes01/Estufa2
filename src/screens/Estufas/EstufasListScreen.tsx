// src/screens/Estufas/EstufasListScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Button, 
  FlatList, 
  StyleSheet, 
  ActivityIndicator,
  TouchableOpacity // Importação nova
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { listEstufas } from '../../services/estufaService';
import { Estufa } from '../../types/domain';
import { useIsFocused } from '@react-navigation/native';

const EstufasListScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const [estufas, setEstufas] = useState<Estufa[]>([]);
  const [loading, setLoading] = useState(true);
  const isFocused = useIsFocused(); 

  const carregarEstufas = async () => {
    if (user) {
      setLoading(true);
      try {
        const lista = await listEstufas(user.uid);
        setEstufas(lista);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (isFocused && user) {
      carregarEstufas();
    }
  }, [isFocused, user]);

  if (loading) {
    return <ActivityIndicator size="large" style={{ flex: 1, justifyContent: 'center' }} />;
  }

  return (
    <View style={styles.container}>
      <Button
        title="Adicionar Nova Estufa"
        onPress={() => navigation.navigate('EstufaForm')} 
      />
      
      <FlatList
        data={estufas}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          // MODIFICAÇÃO: Envolvemos o item com TouchableOpacity
          <TouchableOpacity 
            style={styles.item}
            // Navega para o Detalhe, passando o ID e o Nome
            onPress={() => navigation.navigate('EstufaDetail', { 
              estufaId: item.id,
              estufaNome: item.nome 
            })}
          >
            <Text style={styles.itemTitle}>{item.nome}</Text>
            <Text>Status: {item.status}</Text>
            <Text>Área: {item.areaM2} m²</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20 }}>Nenhuma estufa cadastrada.</Text>}
        onRefresh={carregarEstufas}
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
  }
});

export default EstufasListScreen;            